import { useMemo, useState } from 'react'
import {
  EMERGENCY,
  HOME_BASE,
  IDENTITIES,
  INCOME_OPTIONS,
  NEEDS,
  RESIDENCES,
  directionsUrl,
  distanceLabel,
  matchResources,
  verifiedOn,
} from './resources.js'
import { downloadResourceSheet, printResourceSheet } from './pdf.js'
import { effectiveResources, loadCustom, loadOverrides } from './customResources.js'
import { geocode } from './geocode.js'
import { recordNeeds } from './needsStats.js'
import AdminPanel from './AdminPanel.jsx'
import { t } from './i18n.js'

function ChoiceGrid({ options, selected, onToggle, name }) {
  return (
    <div className="grid" role="group" aria-label={name}>
      {options.map((opt) => {
        const isOn = selected.includes(opt.id)
        return (
          <button
            key={opt.id}
            type="button"
            className={isOn ? 'choice on' : 'choice'}
            aria-pressed={isOn}
            onClick={() => onToggle(opt.id)}
          >
            <span className="box" aria-hidden="true">
              {isOn ? '✓' : ''}
            </span>
            <span className="choice-label">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function PickOne({ options, value, onChange, name }) {
  return (
    <div className="grid" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const isOn = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            className={isOn ? 'choice on' : 'choice'}
            role="radio"
            aria-checked={isOn}
            onClick={() => onChange(opt.id)}
          >
            <span className="box round" aria-hidden="true">
              {isOn ? '●' : ''}
            </span>
            <span className="choice-label">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function App() {
  // English only now -- kept as a plain constant (rather than removing every
  // T(...) call) so t() calls everywhere else stay untouched.
  const lang = 'en'

  const [screen, setScreen] = useState('form')
  const [identities, setIdentities] = useState([])
  const [estimatedIncome, setEstimatedIncome] = useState('unknown')
  const [firstName, setFirstName] = useState('')
  const [residence, setResidence] = useState('unknown')
  const [needs, setNeeds] = useState([])
  const [notes, setNotes] = useState('')

  // Only ever used for the McKinney + homeless map.
  const [locationQuery, setLocationQuery] = useState('')
  const [userCoords, setUserCoords] = useState(null)
  const [locating, setLocating] = useState(false)

  const [libraryVersion, setLibraryVersion] = useState(0)

  const pool = useMemo(() => effectiveResources(loadOverrides(), loadCustom()), [libraryVersion])

  const { resources, excluded } = useMemo(
    () => matchResources(needs, identities, estimatedIncome, residence, pool),
    [needs, identities, estimatedIncome, residence, pool]
  )

  const T = (key, vars) => t(key, vars)

  const shownEmergency = EMERGENCY

  const residenceLabel = RESIDENCES.find((r) => r.id === residence)?.label ?? ''

  const includeSafetyWarning = needs.includes('safety')
  const nothingPicked = needs.length === 0 && identities.length === 0

  // Only true for McKinney residents who checked "homeless" AND successfully
  // found a location. Everyone else gets no map at all -- not an empty one.
  const showMap = residence === 'mckinney' && identities.includes('homeless') && userCoords !== null

  const pdfOptions = {
    firstName: firstName.trim(),
    resources,
    notes,
    includeSafetyWarning,
    identities,
    showMap,
    userCoords,
  }

  const toggle = (list, setList) => (id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const findMyLocation = async () => {
    setLocating(true)
    const coords = await geocode(locationQuery)
    setUserCoords(coords) // null on failure or empty -- same as never having asked
    setLocating(false)
  }

  const startOver = () => {
    setFirstName('')
    setResidence('unknown')
    setNeeds([])
    setIdentities([])
    setEstimatedIncome('unknown')
    setNotes('')
    setLocationQuery('')
    setUserCoords(null)
    setScreen('form')
    window.scrollTo(0, 0)
  }

  const goToResults = () => {
    recordNeeds(needs)
    setScreen('results')
    window.scrollTo(0, 0)
  }

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-inner">
          <h1>{T('appTitle')}</h1>
          <p>
            {HOME_BASE.name} · {T('appPlace')}
          </p>
        </div>
      </header>

      <main className="wrap">
        {screen === 'admin' ? (
          <AdminPanel onClose={() => setScreen('form')} onChanged={() => setLibraryVersion((v) => v + 1)} />
        ) : screen === 'form' ? (
          <>
            <p className="lede">{T('lede')}</p>

            <section className="card">
              <h2>
                <span className="step">1</span> {T('qName')}
                <span className="optional">{T('optional')}</span>
              </h2>
              <p className="help">{T('qNameHelp')}</p>
              <input
                className="text-input"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={T('qNamePlaceholder')}
                autoComplete="off"
              />
            </section>

            <section className="card">
              <h2>
                <span className="step">2</span> {T('qResidence')}
              </h2>
              <p className="help">{T('qResidenceHelp')}</p>
              <PickOne options={RESIDENCES} value={residence} onChange={setResidence} name={T('qResidence')} />
            </section>

            <section className="card">
              <h2>
                <span className="step">3</span> {T('qIncome')}
                <span className="optional">{T('optional')}</span>
              </h2>
              <p className="help">{T('qIncomeHelp')}</p>
              <PickOne
                options={INCOME_OPTIONS}
                value={estimatedIncome}
                onChange={setEstimatedIncome}
                name={T('qIncome')}
              />
            </section>

            <section className="card">
              <h2>
                <span className="step">4</span> {T('qIdentities')}
                <span className="optional">{T('optional')}</span>
              </h2>
              <p className="help">{T('qIdentitiesHelp')}</p>
              <ChoiceGrid
                options={IDENTITIES}
                selected={identities}
                onToggle={toggle(identities, setIdentities)}
                name={T('qIdentities')}
              />

              {residence === 'mckinney' && identities.includes('homeless') && (
                <div className="sub-question">
                  <span className="field-label">{T('qHangout')}</span>
                  <p className="help">{T('qHangoutHelp')}</p>
                  <input
                    className="text-input"
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value)
                      setUserCoords(null) // editing the text invalidates any earlier lookup
                    }}
                    placeholder={T('qHangoutPlaceholder')}
                  />
                  <div className="actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={findMyLocation}
                      disabled={locating || !locationQuery.trim()}
                    >
                      {locating ? T('locating') : T('findOnMap')}
                    </button>
                  </div>
                  {userCoords && <p className="small muted">{T('locationFound')}</p>}
                </div>
              )}
            </section>

            <section className="card">
              <h2>
                <span className="step">5</span> {T('qNeeds')}
              </h2>
              <p className="help">{T('qNeedsHelp')}</p>
              <ChoiceGrid options={NEEDS} selected={needs} onToggle={toggle(needs, setNeeds)} name={T('qNeeds')} />
            </section>

            <section className="card">
              <h2>
                <span className="step">6</span> {T('qNotes')}
                <span className="optional">{T('optional')}</span>
              </h2>
              <p className="help">{T('qNotesHelp')}</p>
              <textarea
                className="text-input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={T('qNotesPlaceholder')}
              />
            </section>

            <div className="actions">
              <button type="button" className="btn primary big" onClick={goToResults} disabled={nothingPicked}>
                {T('makeSheet')}
              </button>
              {nothingPicked ? (
                <p className="hint">{T('needOneBox')}</p>
              ) : (
                <p className="hint">
                  {resources.length === 1 ? T('matchedOne') : T('matchedMany', { n: resources.length })}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="result-head">
              <button type="button" className="btn ghost" onClick={() => setScreen('form')}>
                {T('goBack')}
              </button>
              <h2 className="result-title">
                {resources.length === 1 ? T('resultTitleOne') : T('resultTitleMany', { n: resources.length })}
              </h2>
              {firstName.trim() && <p className="for-who">{T('sheetFor', { name: firstName.trim() })}</p>}
            </div>

            <div className="actions sticky">
              <button type="button" className="btn primary big" onClick={() => downloadResourceSheet(pdfOptions)}>
                {T('downloadPdf')}
              </button>
              <button type="button" className="btn secondary big" onClick={() => printResourceSheet(pdfOptions)}>
                {T('printNow')}
              </button>
              <button type="button" className="btn ghost" onClick={startOver}>
                {T('startOver')}
              </button>
            </div>

            {excluded.length > 0 && (
              <div className="excluded-note">
                <strong>
                  {excluded.length === 1 ? T('excludedOne') : T('excludedMany', { n: excluded.length })}
                </strong>{' '}
                {T('excludedBecause', { where: residenceLabel.toLowerCase() })}
                <ul>
                  {excluded.map((r) => (
                    <li key={r.id}>
                      {r.name} — {r.serves?.area ?? T('limitedArea')}
                    </li>
                  ))}
                </ul>
                {T('excludedOverride')}
              </div>
            )}

            {includeSafetyWarning && (
              <div className="safety">
                <strong>{T('safetyTitle')}</strong> {T('safetyScreen')}
              </div>
            )}

            <div className="preview">
              <h3 className="preview-head">{T('emergencyHead')}</h3>
              <ul className="emergency">
                {shownEmergency.map((e) => (
                  <li key={e.phone}>
                    <span className="big-number">{e.phone}</span>
                    <span>
                      <strong>{e.name}</strong>
                      <br />
                      <span className="muted">{e.when}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <h3 className="preview-head">{T('placesHead')}</h3>
              {resources.map((r, i) => (
                <article className="resource" key={r.id}>
                  <div className="resource-cat">{r.category}</div>
                  <h4>
                    {i + 1}. {r.name}
                  </h4>
                  {distanceLabel(r) && distanceLabel(r) !== T('youAreHereShort') && (
                    <p className="distance">{T('distanceOf', { dist: distanceLabel(r) })}</p>
                  )}
                  <p>{r.what}</p>

                  {r.say && (
                    <div className="say-box">
                      <span className="mini-head">{T('headSay')}</span>
                      <q>{r.say}</q>
                    </div>
                  )}

                  {r.steps?.length > 0 && (
                    <>
                      <span className="mini-head">{T('headSteps')}</span>
                      <ol className="steps">
                        {r.steps.map((s, n) => (
                          <li key={n}>{s}</li>
                        ))}
                      </ol>
                    </>
                  )}

                  {r.bring?.length > 0 && (
                    <>
                      <span className="mini-head">{T('headBring')}</span>
                      <ul className="bring">
                        {r.bring.map((b, n) => (
                          <li key={n}>{b}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {r.requirementsByTag &&
                    identities
                      .filter((id) => r.requirementsByTag[id])
                      .map((id) => (
                        <p className="extra-requirement" key={id}>
                          {r.requirementsByTag[id]}
                        </p>
                      ))}

                  <dl>
                    <dt>{T('labelPhone')}</dt>
                    <dd>
                      <strong className="phone">{r.phone}</strong>
                      {r.phoneLabel ? ` (${r.phoneLabel})` : ''}
                      {r.altPhone && (
                        <>
                          <br />
                          {r.altPhone}
                          {r.altPhoneLabel ? ` (${r.altPhoneLabel})` : ''}
                        </>
                      )}
                    </dd>
                    <dt>{T('labelWhere')}</dt>
                    <dd>
                      {r.address}
                      {directionsUrl(r) && (
                        <>
                          {' '}
                          <a href={directionsUrl(r)} target="_blank" rel="noreferrer">
                            {T('directions')}
                          </a>
                        </>
                      )}
                    </dd>
                    <dt>{T('labelWhen')}</dt>
                    <dd>{r.hours}</dd>
                    {r.notes && (
                      <>
                        <dt>{T('labelNote')}</dt>
                        <dd>{r.notes}</dd>
                      </>
                    )}
                  </dl>
                </article>
              ))}

              {notes.trim() && (
                <>
                  <h3 className="preview-head">{T('visitNotes')}</h3>
                  <p className="notes-preview">{notes.trim()}</p>
                </>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="foot">
        <p>{T('footVerified', { date: verifiedOn() })}</p>
        <p className="muted">{T('footPrivacy')}</p>
        {screen !== 'admin' && (
          <p>
            <button type="button" className="linklike" onClick={() => setScreen('admin')}>
              {T('staffTools')}
            </button>
          </p>
        )}
      </footer>
    </div>
  )
}


// ===========================================================================
// App.jsx -- the whole screen the front desk uses.
//
// NEW TO REACT? Read GUIDE.md in the project root first. The short version:
//
//   * A "component" is a function that returns markup (JSX). React calls it
//     to work out what to put on screen.
//   * That markup looks like HTML but is JavaScript. `className` instead of
//     `class`, and `{ }` drops a JavaScript value into the markup.
//   * "State" is a value that, when it changes, makes React re-run the
//     component and redraw. You create it with useState.
//   * You never reach into the page to change it (no document.getElementById).
//     You change state, and React updates the screen for you.
//
// This file has three components:
//   ChoiceGrid -- a grid of big check-all-that-apply buttons
//   PickOne    -- the same, but only one can be chosen at a time
//   App        -- everything else, and the only one that holds state
// ===========================================================================

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
import AdminPanel from './AdminPanel.jsx'
import { LANGUAGES, label as tLabel, localizeEmergency, localizeResource, t } from './i18n.js'

// ---------------------------------------------------------------------------
// ChoiceGrid: "check all that apply"
//
// The values in the curly braces of the function signature are "props" --
// values the parent passes in. This component holds no state of its own; it
// shows what it is given and calls onToggle when a button is pressed. That
// keeps every piece of state in one place (App), which makes bugs much easier
// to find.
// ---------------------------------------------------------------------------
function ChoiceGrid({ options, selected, onToggle, name }) {
  return (
    <div className="grid" role="group" aria-label={name}>
      {/* .map turns an array of options into an array of buttons. React needs
          a unique `key` on each one so it can tell them apart when redrawing. */}
      {options.map((opt) => {
        const isOn = selected.includes(opt.id)
        return (
          <button
            key={opt.id}
            type="button"
            className={isOn ? 'choice on' : 'choice'}
            // aria-pressed tells a screen reader this is a toggle and whether
            // it is currently on.
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

// ---------------------------------------------------------------------------
// PickOne: same look, but only one choice at a time (a radio group).
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// App: the screen itself.
// ---------------------------------------------------------------------------
export default function App() {
  // -- STATE ----------------------------------------------------------------
  // useState gives you [currentValue, functionToChangeIt]. Calling the setter
  // asks React to redraw with the new value. Never assign to these directly.

  // Which screen is showing: the form, the results, or Staff Tools.
  const [screen, setScreen] = useState('form')

  // Language is the FIRST question because it changes everything after it:
  // this screen and the printed sheet.
  const [lang, setLang] = useState('en')

  const [identities, setIdentities] = useState([])
  const [estimatedIncome, setEstimatedIncome] = useState('unknown')
  const [firstName, setFirstName] = useState('')
  const [residence, setResidence] = useState('unknown')
  const [needs, setNeeds] = useState([])
  const [notes, setNotes] = useState('')

  // Bumped whenever Staff Tools saves, which rebuilds the resource pool below.
  const [libraryVersion, setLibraryVersion] = useState(0)

  // -- DERIVED VALUES -------------------------------------------------------
  // useMemo remembers a result and only recalculates when something in the
  // list at the end (the "dependencies") changes. It is a speed optimisation;
  // the code would still be correct without it.

  // Every resource the app knows about: the built-in ones with any staff edits
  // applied, plus anything staff added themselves.
  const pool = useMemo(() => effectiveResources(loadOverrides(), loadCustom()), [libraryVersion])

  // The places that match what was ticked. `excluded` is the ones dropped
  // because of where the person lives -- shown to staff so nothing disappears
  // silently.
const { resources, excluded } = useMemo(
    () => matchResources(needs, identities, estimatedIncome, residence, pool),
[needs, identities, estimatedIncome, residence, pool]
  )
  // Shorthand for looking up a piece of text in the current language.
  const T = (key, vars) => t(lang, key, vars)

  // Answer choices with translated labels. The `id` of each option never
  // changes, so switching language cannot affect which resources match.
  const localizedOptions = (kind, options) =>
    options.map((o) => ({ ...o, label: tLabel(lang, kind, o.id, o.label) }))

  const shownResources = useMemo(
    () => resources.map((r) => localizeResource(r, lang)),
    [resources, lang]
  )
  const shownEmergency = useMemo(() => localizeEmergency(EMERGENCY, lang), [lang])

  const residenceLabel = tLabel(
    lang,
    'residences',
    residence,
    RESIDENCES.find((r) => r.id === residence)?.label ?? ''
  )

  const includeSafetyWarning = needs.includes('safety')
const nothingPicked = needs.length === 0 && identities.length === 0
  // Everything the PDF builder needs. Note it gets the ORIGINAL resources plus
  // the language -- pdf.js does its own translating, so the two never disagree.
const pdfOptions = {
  firstName: firstName.trim(),
  resources,
  notes,
  includeSafetyWarning,
  identities,
  lang,
}
  // -- EVENT HANDLERS -------------------------------------------------------

  // Returns a function that adds an id to a list, or removes it if it is
  // already there. Used by both checkbox grids.
  const toggle = (list, setList) => (id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const startOver = () => {
  setFirstName('')
  setResidence('unknown')
  setNeeds([])
  setIdentities([])
  setEstimatedIncome('unknown')
  setNotes('')
  setScreen('form')
  window.scrollTo(0, 0)
}

  const goToResults = () => {
    setScreen('results')
    window.scrollTo(0, 0)
  }

  // -- WHAT GETS DRAWN ------------------------------------------------------
  // Everything below is JSX. `{condition && <p>…</p>}` means "only show this
  // if condition is true", and `{a ? x : y}` picks between two things.

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
          <AdminPanel
            onClose={() => setScreen('form')}
            // A prop can be a function. This is how a child tells its parent
            // that something happened.
            onChanged={() => setLibraryVersion((v) => v + 1)}
          />
        ) : screen === 'form' ? (
          <>
            <p className="lede">{T('lede')}</p>

            {/* Question 1: language. It comes first because it changes the
                wording of every question below it. */}
            <section className="card">
              <h2>
                <span className="step">1</span> {T('qLanguage')}
              </h2>
              <p className="help">{T('qLanguageHelp')}</p>
              <PickOne
                options={LANGUAGES}
                value={lang}
                onChange={setLang}
                name={T('qLanguage')}
              />
            </section>

            <section className="card">
              <h2>
                <span className="step">2</span> {T('qName')}
                <span className="optional">{T('optional')}</span>
              </h2>
              <p className="help">{T('qNameHelp')}</p>
              <input
                className="text-input"
                type="text"
                value={firstName}
                // A "controlled input": the box shows whatever is in state,
                // and typing updates state, which redraws the box.
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={T('qNamePlaceholder')}
                autoComplete="off"
              />
            </section>

            <section className="card">
              <h2>
                <span className="step">3</span> {T('qResidence')}
              </h2>
              <p className="help">{T('qResidenceHelp')}</p>
              <PickOne
                options={localizedOptions('residences', RESIDENCES)}
                value={residence}
                onChange={setResidence}
                name={T('qResidence')}
              />
            </section>

            <section className="card">
  <h2>
    <span className="step">4</span> {T('qIncome')}
    <span className="optional">{T('optional')}</span>
  </h2>
  <p className="help">{T('qIncomeHelp')}</p>
  <PickOne
    options={localizedOptions('income', INCOME_OPTIONS)}
    value={estimatedIncome}
    onChange={setEstimatedIncome}
    name={T('qIncome')}
  />
              
</section>

            <section className="card">
  <h2>
    <span className="step">5</span> {T('qIdentities')}
    <span className="optional">{T('optional')}</span>
  </h2>
  <p className="help">{T('qIdentitiesHelp')}</p>
  <ChoiceGrid
    options={localizedOptions('identities', IDENTITIES)}
    selected={identities}
    onToggle={toggle(identities, setIdentities)}
    name={T('qIdentities')}
  />
</section>
           

            <section className="card">
              <h2>
                <span className="step">6</span> {T('qNeeds')}
              </h2>
              <p className="help">{T('qNeedsHelp')}</p>
              <ChoiceGrid
                options={localizedOptions('needs', NEEDS)}
                selected={needs}
                onToggle={toggle(needs, setNeeds)}
                name={T('qNeeds')}
              />
            </section>
          


            
            <section className="card">
              <h2>
                <span className="step">7</span> {T('qNotes')}
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
              <button
                type="button"
                className="btn primary big"
                onClick={goToResults}
                disabled={nothingPicked}
              >
                {T('makeSheet')}
              </button>
              {nothingPicked ? (
                <p className="hint">{T('needOneBox')}</p>
              ) : (
                <p className="hint">
                  {resources.length === 1
                    ? T('matchedOne')
                    : T('matchedMany', { n: resources.length })}
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
                {resources.length === 1
                  ? T('resultTitleOne')
                  : T('resultTitleMany', { n: resources.length })}
              </h2>
              {firstName.trim() && (
                <p className="for-who">{T('sheetFor', { name: firstName.trim() })}</p>
              )}
            </div>

            <div className="actions sticky">
              <button
                type="button"
                className="btn primary big"
                onClick={() => downloadResourceSheet(pdfOptions)}
              >
                {T('downloadPdf')}
              </button>
              <button
                type="button"
                className="btn secondary big"
                onClick={() => printResourceSheet(pdfOptions)}
              >
                {T('printNow')}
              </button>
              <button type="button" className="btn ghost" onClick={startOver}>
                {T('startOver')}
              </button>
            </div>

            {/* Places dropped because of where the person lives. Shown so a
                filtered sheet never looks like a complete one. */}
            {excluded.length > 0 && (
              <div className="excluded-note">
                <strong>
                  {excluded.length === 1
                    ? T('excludedOne')
                    : T('excludedMany', { n: excluded.length })}
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
              {shownResources.map((r, i) => (
                <article className="resource" key={r.id}>
                  <div className="resource-cat">{r.category}</div>
                  <h4>
                    {i + 1}. {r.name}
                  </h4>
                  {distanceLabel(r, lang) &&
                    distanceLabel(r, lang) !== T('youAreHereShort') && (
                      <p className="distance">
                        {T('distanceOf', { dist: distanceLabel(r, lang) })}
                      </p>
                    )}
                  <p>{r.what}</p>

                  {/* A place staff added without Spanish text still prints, but
                      is flagged so nobody assumes it was translated. */}
                  {r.untranslated && (
                    <p className="untranslated">Sin traducción — se muestra en inglés</p>
                  )}

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
                  {/* NEW — dynamic requirements by identity */}
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
        <p>{T('footVerified', { date: verifiedOn(lang) })}</p>
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


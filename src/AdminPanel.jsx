// ===========================================================================
// AdminPanel.jsx -- "Staff Tools", the screen for adding and editing places.
//
// New to React? Read GUIDE.md first, then App.jsx (which is simpler than
// this file).
//
// HOW IT WORKS
//
// There are two kinds of change a staff member can make:
//
//   1. Add a new place        -> stored as a whole resource in `custom`
//   2. Edit a built-in place  -> stored as an "override" keyed by its id
//
// Overrides mean src/resources.js is never touched, so "Undo edits" simply
// deletes the override and the original comes back. Hiding a built-in is an
// override of `{ hidden: true }`.
//
// Both live in the browser's local storage, so they stay on ONE computer.
// That is why this screen offers Export, Import, and "Copy as code".
//
// THE SHAPE OF THIS COMPONENT
//
//   * `custom` and `overrides` mirror what is in local storage.
//   * `editing` holds the entry currently open in the form, or null when the
//     list is showing. One piece of state decides which view you see.
//   * `commit()` is the ONLY thing that writes to storage. It saves, updates
//     state, and tells App to rebuild its resource list.
//
// COMMUNITY NEEDS (below the action buttons, above the table):
//   * Left card is live and real -- a running count of `needs` ids checked
//     by every client who has completed the wizard on this computer, drawn
//     as a simple donut chart. Updates each time `recordNeeds()` runs (see
//     needsStats.js and the goToResults hook in App.jsx).
//   * Right card is intentionally empty. That's where the community-wide
//     historical data goes once it's cleaned and visualized -- built
//     separately, on purpose.
//
// NOTE: Spanish support has been dropped from this screen. The editor no
// longer has a Spanish-translation fieldset. See the note in resources.js /
// customResources.js about whether `editing.es` still needs cleaning up on
// that end.
// ===========================================================================

import { useMemo, useRef, useState } from 'react'
import { NEEDS, RESIDENCES, IDENTITIES, RESOURCES } from './resources.js'
import {
  BLANK,
  STAFF_CODE,
  arrayToLines,
  editableList,
  geocode,
  linesToArray,
  loadCustom,
  loadOverrides,
  normalize,
  saveCustom,
  saveOverrides,
  toCodeSnippet,
  validate,
} from './customResources.js'
import { loadNeedsTally, loadVisitCount, resetNeedsTally } from './needsStats.js'

const CATEGORIES = [...new Set(RESOURCES.map((r) => r.category))].sort()

function Chips({ options, selected, onToggle, label }) {
  return (
    <>
      <span className="field-label">{label}</span>
      <div className="chips">
        {options.map((o) => {
          const on = selected.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              className={on ? 'chip on' : 'chip'}
              aria-pressed={on}
              onClick={() => onToggle(o.id)}
            >
              {on ? '✓ ' : ''}
              {o.label}
            </button>
          )
        })}
      </div>
    </>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {hint && <span className="field-hint">{hint}</span>}
      {children}
    </label>
  )
}

// ---------------------------------------------------------------------------
// NeedsPieChart: a plain SVG donut, no library. Each `needs` id becomes one
// ring segment sized by its share of the total. Purely a rendering of counts
// that are already computed -- no analysis happens here.
// ---------------------------------------------------------------------------
function NeedsPieChart({ tally }) {
  const entries = Object.entries(tally).filter(([, count]) => count > 0)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  if (total === 0) {
    return <p className="small muted">No sheets have been made on this computer yet.</p>
  }

  const labelFor = (id) => NEEDS.find((n) => n.id === id)?.label || id

  const palette = [
    '#4f46e5', '#059669', '#d97706', '#dc2626', '#0891b2',
    '#7c3aed', '#db2777', '#65a30d', '#0284c7', '#ea580c',
    '#4338ca', '#16a34a', '#b45309', '#9d174d', '#0e7490',
  ]

  const sorted = [...entries].sort((a, b) => b[1] - a[1])

  let cumulative = 0
  const segments = sorted.map(([id, count], i) => {
    const pct = (count / total) * 100
    const segment = { id, count, pct, color: palette[i % palette.length], dashoffset: 25 - cumulative }
    cumulative += pct
    return segment
  })

  return (
    <div className="needs-chart">
      <svg
        viewBox="0 0 42 42"
        className="needs-donut"
        role="img"
        aria-label="Breakdown of needs checked by clients"
      >
        <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="#e5e7eb" strokeWidth="5" />
        {segments.map((s) => (
          <circle
            key={s.id}
            cx="21"
            cy="21"
            r="15.9155"
            fill="transparent"
            stroke={s.color}
            strokeWidth="5"
            strokeDasharray={`${s.pct} ${100 - s.pct}`}
            strokeDashoffset={s.dashoffset}
          />
        ))}
      </svg>
      <ul className="needs-legend">
        {segments.map((s) => (
          <li key={s.id}>
            <span className="swatch" style={{ background: s.color }} />
            {labelFor(s.id)} — {s.count} ({s.pct.toFixed(0)}%)
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AdminPanel({ onClose, onChanged }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('saminn.staffUnlocked') === 'yes'
  )
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')

  const [custom, setCustom] = useState(loadCustom)
  const [overrides, setOverrides] = useState(loadOverrides)
  const [editing, setEditing] = useState(null) // the draft being edited
  const [geoState, setGeoState] = useState({ busy: false, message: '' })
  const [snippet, setSnippet] = useState('')
  const [flash, setFlash] = useState('')
  const fileRef = useRef(null)

  const [needsTally, setNeedsTally] = useState(loadNeedsTally)
  const [visitCount, setVisitCount] = useState(loadVisitCount)

  const rows = useMemo(() => editableList(overrides, custom), [overrides, custom])

  const commit = (nextCustom, nextOverrides) => {
    if (nextCustom) {
      setCustom(nextCustom)
      saveCustom(nextCustom)
    }
    if (nextOverrides) {
      setOverrides(nextOverrides)
      saveOverrides(nextOverrides)
    }
    onChanged?.()
  }

  const say = (msg) => {
    setFlash(msg)
    setTimeout(() => setFlash(''), 4000)
  }

  const refreshNeedsTally = () => {
    setNeedsTally(loadNeedsTally())
    setVisitCount(loadVisitCount())
  }

  const clearNeedsTally = () => {
    if (!window.confirm('Clear the community needs count on this computer? This cannot be undone.'))
      return
    resetNeedsTally()
    refreshNeedsTally()
    say('Community needs count cleared.')
  }

  // --- lock screen ---------------------------------------------------------

  if (!unlocked) {
    return (
      <div className="admin">
        <div className="admin-head">
          <h2>Staff Tools</h2>
          <button type="button" className="btn ghost" onClick={onClose}>
            ← Back to the form
          </button>
        </div>
        <div className="card" style={{ maxWidth: 520 }}>
          <p className="help">
            This screen is for staff who maintain the list of places. Enter the staff code to
            continue.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (code.trim().toLowerCase() === STAFF_CODE) {
                sessionStorage.setItem('saminn.staffUnlocked', 'yes')
                setUnlocked(true)
              } else {
                setCodeError('That code is not right.')
              }
            }}
          >
            <input
              className="text-input"
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setCodeError('')
              }}
              placeholder="Staff code"
              autoFocus
            />
            {codeError && <p className="err">{codeError}</p>}
            <div className="actions">
              <button type="submit" className="btn primary">
                Unlock
              </button>
            </div>
          </form>
          <p className="fineprint">
            This code only keeps people from wandering in by accident. It is not security —
            anyone who knows how can get past it. Everything stored here is public information
            about local charities, nothing about clients.
          </p>
        </div>
      </div>
    )
  }

  // --- editor --------------------------------------------------------------

  const startNew = () => {
    setSnippet('')
    setGeoState({ busy: false, message: '' })
    setEditing({ ...BLANK, category: CATEGORIES[0] || 'Other help', isNew: true })
  }

  const startEdit = (row) => {
    setSnippet('')
    setGeoState({ busy: false, message: '' })
    setEditing({ ...normalize(row), builtIn: row.builtIn, isNew: false })
  }

  const set = (patch) => setEditing((d) => ({ ...d, ...patch }))

  const toggleIn = (key) => (id) =>
    setEditing((d) => ({
      ...d,
      [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id],
    }))

  const draftIds = editing
    ? [...custom.map((c) => c.id), ...(editing.isNew ? [] : [])].concat(editing.id)
    : []
  const check = editing ? validate(editing, draftIds) : null

  const save = () => {
    const clean = normalize(editing)
    if (editing.builtIn) {
      commit(null, { ...overrides, [editing.id]: clean })
      say(`Saved your changes to “${clean.name}”.`)
    } else {
      const exists = custom.some((c) => c.id === clean.id)
      const next = exists
        ? custom.map((c) => (c.id === clean.id ? { ...clean, custom: true } : c))
        : [...custom, { ...clean, custom: true }]
      commit(next, null)
      say(exists ? `Saved “${clean.name}”.` : `Added “${clean.name}”.`)
    }
    setEditing(null)
  }

  const hideBuiltIn = (row, hidden) => {
    const next = { ...overrides }
    if (hidden) next[row.id] = { hidden: true }
    else delete next[row.id]
    commit(null, next)
    say(hidden ? `“${row.name}” will no longer appear.` : `“${row.name}” is back on the list.`)
  }

  const revert = (row) => {
    const next = { ...overrides }
    delete next[row.id]
    commit(null, next)
    say(`“${row.name}” is back to the original wording.`)
  }

  const removeCustom = (row) => {
    if (!window.confirm(`Delete “${row.name}” for good? This cannot be undone.`)) return
    commit(
      custom.filter((c) => c.id !== row.id),
      null
    )
    say(`Deleted “${row.name}”.`)
  }

  const lookUp = async () => {
    if (!editing.address?.trim()) {
      setGeoState({ busy: false, message: 'Type a street address first.' })
      return
    }
    setGeoState({ busy: true, message: 'Looking it up…' })
    try {
      const { coords, label } = await geocode(editing.address)
      set({ coords })
      setGeoState({ busy: false, message: `Found: ${label}` })
    } catch (e) {
      setGeoState({
        busy: false,
        message: `Could not look it up (${e.message}) You can still save without a map pin.`,
      })
    }
  }

  const exportFile = () => {
    const payload = JSON.stringify({ custom, overrides, exported: new Date().toISOString() }, null, 2)
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `saminn-resource-changes-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (file) => {
    try {
      const data = JSON.parse(await file.text())
      const nextCustom = Array.isArray(data.custom)
        ? data.custom.map((r, i) => ({ ...normalize(r, i), custom: true })).filter((r) => r.name)
        : []
      const nextOverrides = data.overrides && typeof data.overrides === 'object' ? data.overrides : {}
      if (
        !window.confirm(
          `Import ${nextCustom.length} added place(s) and ${
            Object.keys(nextOverrides).length
          } edit(s)? This replaces what is on this computer now.`
        )
      )
        return
      commit(nextCustom, nextOverrides)
      say('Imported.')
    } catch (e) {
      say(`That file could not be read: ${e.message}`)
    }
  }

  const editedRows = rows.filter((r) => r.edited || r.hidden || r.custom)

  return (
    <div className="admin">
      <div className="admin-head">
        <h2>Staff Tools</h2>
        <button type="button" className="btn ghost" onClick={onClose}>
          ← Back to the form
        </button>
      </div>

      {flash && <div className="flash">{flash}</div>}

      <div className="notice">
        <strong>These changes are saved on this computer only.</strong> Another front desk
        machine will not see them. Use <em>Save changes to a file</em> below to move them, or{' '}
        <em>Copy as code</em> to have them built in permanently for everyone.
      </div>

      {!editing && (
        <>
          <div className="actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn primary" onClick={startNew}>
              + Add a new place
            </button>
            <button type="button" className="btn ghost" onClick={exportFile}>
              Save changes to a file
            </button>
            <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
              Load changes from a file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importFile(f)
                e.target.value = ''
              }}
            />
            {editedRows.length > 0 && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => setSnippet(editedRows.map(toCodeSnippet).join('\n'))}
              >
                Copy as code ({editedRows.length})
              </button>
            )}
          </div>

          <div className="two-up">
            <div className="card">
              <h3>Community Needs</h3>
              <p className="help">
                What clients have checked on this computer since the count was last cleared —
                {' '}{visitCount} sheet{visitCount === 1 ? '' : 's'} made in total. Counts only which
                needs were checked, never who checked them or what else was on their sheet.
              </p>
              <NeedsPieChart tally={needsTally} />
              <div className="actions">
                <button type="button" className="btn ghost" onClick={refreshNeedsTally}>
                  Refresh
                </button>
                <button type="button" className="btn ghost" onClick={clearNeedsTally}>
                  Clear count
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Community Data</h3>
              <p className="help muted">
                Reserved for the bigger community picture — official figures on top of what
                clients here have needed — once it's ready.
              </p>
            </div>
          </div>

          {snippet && (
            <div className="card">
              <h3>Paste this into src/resources.js</h3>
              <p className="help">
                Give this to whoever looks after the code. Pasting it into the <code>RESOURCES</code>{' '}
                list makes these entries permanent on every computer.
              </p>
              <textarea className="text-input mono" rows={12} readOnly value={snippet} />
              <div className="actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    navigator.clipboard?.writeText(snippet)
                    say('Copied to the clipboard.')
                  }}
                >
                  Copy to clipboard
                </button>
                <button type="button" className="btn ghost" onClick={() => setSnippet('')}>
                  Close
                </button>
              </div>
            </div>
          )}

          <table className="admin-table">
            <thead>
              <tr>
                <th>Place</th>
                <th>Category</th>
                <th>Shows up for</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.hidden ? 'is-hidden' : ''}>
                  <td>
                    <strong>{r.name}</strong>
                    {r.custom && <span className="tag added">added here</span>}
                    {r.edited && <span className="tag edited">edited</span>}
                    {r.hidden && <span className="tag off">hidden</span>}
                    <div className="muted small">{r.phone || 'no phone'}</div>
                  </td>
                  <td className="small">{r.category}</td>
                  <td className="small">
                    {[...r.needs, ...r.targetPopulations].join(', ') || (
                      <span className="err">nothing — never shows</span>
                    )}
                  </td>
                  <td className="row-actions">
                    <button type="button" className="btn tiny" onClick={() => startEdit(r)}>
                      Edit
                    </button>
                    {r.builtIn ? (
                      <>
                        <button
                          type="button"
                          className="btn tiny ghost"
                          onClick={() => hideBuiltIn(r, !r.hidden)}
                        >
                          {r.hidden ? 'Show' : 'Hide'}
                        </button>
                        {r.edited && (
                          <button
                            type="button"
                            className="btn tiny ghost"
                            onClick={() => revert(r)}
                          >
                            Undo edits
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn tiny danger"
                        onClick={() => removeCustom(r)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {editing && (
        <div className="card editor">
          <h3>
            {editing.isNew
              ? 'Add a new place'
              : editing.builtIn
                ? `Edit “${editing.name}” (built in)`
                : `Edit “${editing.name}”`}
          </h3>
          {editing.builtIn && (
            <p className="help">
              This is one of the places that came with the app. Your changes are saved on this
              computer and you can undo them at any time.
            </p>
          )}

          <Field label="Name of the place">
            <input
              className="text-input"
              value={editing.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="For example: Allen Community Outreach"
            />
          </Field>

          <Field label="Category" hint="Groups it with similar places on the printed sheet.">
            <input
              className="text-input"
              list="admin-categories"
              value={editing.category}
              onChange={(e) => set({ category: e.target.value })}
            />
            <datalist id="admin-categories">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field
            label="What they do"
            hint="Plain words, as if explaining to someone tired and stressed."
          >
            <textarea
              className="text-input"
              rows={3}
              value={editing.what}
              onChange={(e) => set({ what: e.target.value })}
            />
          </Field>

          <div className="two-up">
            <Field label="Phone">
              <input
                className="text-input"
                value={editing.phone}
                onChange={(e) => set({ phone: e.target.value })}
                placeholder="(972) 555-1234"
              />
            </Field>
            <Field label="Label for that phone" hint="Optional, e.g. “24-hour hotline”">
              <input
                className="text-input"
                value={editing.phoneLabel}
                onChange={(e) => set({ phoneLabel: e.target.value })}
              />
            </Field>
          </div>

          <div className="two-up">
            <Field label="Second phone" hint="Optional">
              <input
                className="text-input"
                value={editing.altPhone}
                onChange={(e) => set({ altPhone: e.target.value })}
              />
            </Field>
            <Field label="Label for the second phone" hint="Optional">
              <input
                className="text-input"
                value={editing.altPhoneLabel}
                onChange={(e) => set({ altPhoneLabel: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Address">
            <input
              className="text-input"
              value={editing.address}
              onChange={(e) => set({ address: e.target.value })}
              placeholder="1234 Main St., McKinney, TX 75069"
            />
          </Field>

          <div className="geo-row">
            <button type="button" className="btn ghost" onClick={lookUp} disabled={geoState.busy}>
              {geoState.busy ? 'Looking up…' : 'Find on map'}
            </button>
            {editing.coords ? (
              <span className="small">
                Pin set at {editing.coords.lat}, {editing.coords.lon}{' '}
                <button type="button" className="linklike" onClick={() => set({ coords: null })}>
                  remove pin
                </button>
              </span>
            ) : (
              <span className="small muted">No map pin yet — the entry still prints fine.</span>
            )}
          </div>
          {geoState.message && <p className="small muted">{geoState.message}</p>}

          <Field label="Hours">
            <input
              className="text-input"
              value={editing.hours}
              onChange={(e) => set({ hours: e.target.value })}
              placeholder="Mon-Fri 9:00 AM - 4:00 PM"
            />
          </Field>

          <Field
            label="What to say when you call"
            hint="The exact sentence. It prints in a box so it can be read out loud."
          >
            <input
              className="text-input"
              value={editing.say}
              onChange={(e) => set({ say: e.target.value })}
            />
          </Field>

          <Field label="Step by step" hint="One step per line, in the order they should happen.">
            <textarea
              className="text-input"
              rows={5}
              value={arrayToLines(editing.steps)}
              onChange={(e) => set({ steps: linesToArray(e.target.value) })}
            />
          </Field>

          <Field label="Bring with you" hint="One item per line.">
            <textarea
              className="text-input"
              rows={4}
              value={arrayToLines(editing.bring)}
              onChange={(e) => set({ bring: linesToArray(e.target.value) })}
            />
          </Field>

          <Field label="Good to know" hint="Anything that would waste a trip if they did not know it.">
            <textarea
              className="text-input"
              rows={2}
              value={editing.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </Field>

          <Field label="Website" hint="Optional">
            <input
              className="text-input"
              value={editing.website}
              onChange={(e) => set({ website: e.target.value })}
            />
          </Field>

          <fieldset className="fs">
            <legend>When should this show up?</legend>
            <Chips
              options={NEEDS}
              selected={editing.needs}
              onToggle={toggleIn('needs')}
              label="They need…"
            />
            <Chips
              options={IDENTITIES}
              selected={editing.targetPopulations}
              onToggle={toggleIn('targetPopulations')}
              label="They are…"
            />
          </fieldset>

          <fieldset className="fs">
            <legend>Who can they help?</legend>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={!!editing.serves?.collinOnly}
                onChange={(e) =>
                  set({
                    serves: {
                      ...(editing.serves || { excludeCities: [], area: '' }),
                      collinOnly: e.target.checked,
                    },
                  })
                }
              />
              Collin County residents only
            </label>
            <Chips
              options={RESIDENCES.filter((r) => !['unknown', 'outside', 'collin'].includes(r.id))}
              selected={editing.serves?.excludeCities || []}
              onToggle={(id) =>
                set({
                  serves: {
                    collinOnly: !!editing.serves?.collinOnly,
                    area: editing.serves?.area || '',
                    excludeCities: (editing.serves?.excludeCities || []).includes(id)
                      ? editing.serves.excludeCities.filter((x) => x !== id)
                      : [...(editing.serves?.excludeCities || []), id],
                  },
                })
              }
              label="Does NOT serve people from…"
            />
            <Field label="How to describe that limit" hint="Shown to staff when it gets left off.">
              <input
                className="text-input"
                value={editing.serves?.area || ''}
                onChange={(e) =>
                  set({
                    serves: {
                      collinOnly: !!editing.serves?.collinOnly,
                      excludeCities: editing.serves?.excludeCities || [],
                      area: e.target.value,
                    },
                  })
                }
                placeholder="Northern Collin County only - not Plano or Wylie"
              />
            </Field>
          </fieldset>

          {check?.errors.length > 0 && (
            <div className="err-box">
              <strong>Fix these before saving:</strong>
              <ul>
                {check.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {check?.warnings.length > 0 && (
            <div className="warn-box">
              <strong>You can still save, but:</strong>
              <ul>
                {check.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="actions">
            <button type="button" className="btn primary" onClick={save} disabled={!check?.ok}>
              Save
            </button>
            <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

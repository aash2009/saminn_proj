// Storage for resources added through the Staff Tools screen.
//
// There is no server behind this app, so added resources live in this
// browser's local storage. That means:
//
//   * They stay on THIS computer. Another front desk machine will not see
//     them until someone exports and imports the file.
//   * Clearing the browser's site data deletes them.
//
// The Staff Tools screen says both of those things out loud, and offers
// Export (to move them between machines) and Copy as code (to paste into
// src/resources.js so they become permanent for everyone).

import { RESOURCES } from './resources.js'

const KEY = 'saminn.customResources.v1'
const KEY_OVERRIDES = 'saminn.overrides.v1'

// Anyone who can open the developer tools can bypass this. It exists so a
// volunteer or a client at the front desk does not wander into the editor by
// accident -- not to protect anything. Everything stored here is public
// information about local charities.
export const STAFF_CODE = 'saminn'

export const BLANK = {
  id: '',
  name: '',
  category: '',
  what: '',
  address: '',
  coords: null,
  phone: '',
  phoneLabel: '',
  altPhone: '',
  altPhoneLabel: '',
  hours: '',
  say: '',
  steps: [],
  bring: [],
  notes: '',
  website: '',
  serves: null,
  needs: [],
  situations: [],
  priority: 50, // sorts after the built-in entries inside a category
  // Optional Spanish wording for this entry. Without it the sheet falls back
  // to the English text and flags it, rather than printing nothing.
  es: null,
}

const str = (v) => (typeof v === 'string' ? v.trim() : '')
const list = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])

// Turn a "one per line" textarea into an array, and back.
export const linesToArray = (text) =>
  String(text || '')
    .split('\n')
    .map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)

export const arrayToLines = (arr) => (Array.isArray(arr) ? arr.join('\n') : '')

function slug(name) {
  return (
    'custom-' +
    String(name || 'resource')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
  )
}

// Force anything loaded from storage into the exact shape the rest of the app
// expects, so a hand-edited or older file cannot crash the sheet.
export function normalize(raw, index = 0) {
  const coords =
    raw?.coords &&
    Number.isFinite(Number(raw.coords.lat)) &&
    Number.isFinite(Number(raw.coords.lon))
      ? { lat: Number(raw.coords.lat), lon: Number(raw.coords.lon) }
      : null

  const serves =
    raw?.serves && (raw.serves.collinOnly || raw.serves.excludeCities?.length)
      ? {
          collinOnly: !!raw.serves.collinOnly,
          excludeCities: list(raw.serves.excludeCities).map((c) => c.toLowerCase()),
          area: str(raw.serves.area) || 'Limited service area',
        }
      : null

  return {
    ...BLANK,
    id: str(raw?.id) || slug(raw?.name) + '-' + index,
    name: str(raw?.name),
    category: str(raw?.category) || 'Other help',
    what: str(raw?.what),
    address: str(raw?.address),
    coords,
    phone: str(raw?.phone),
    phoneLabel: str(raw?.phoneLabel),
    altPhone: str(raw?.altPhone),
    altPhoneLabel: str(raw?.altPhoneLabel),
    hours: str(raw?.hours) || 'Call for hours',
    say: str(raw?.say),
    steps: list(raw?.steps),
    bring: list(raw?.bring),
    notes: str(raw?.notes),
    website: str(raw?.website),
    serves,
    needs: list(raw?.needs),
    situations: list(raw?.situations),
    priority: Number.isFinite(Number(raw?.priority)) ? Number(raw.priority) : 50,
    es: normalizeEs(raw?.es),
  }
}

// Only keep the Spanish block if something was actually typed into it.
function normalizeEs(raw) {
  if (!raw) return null
  const es = {
    what: str(raw.what),
    say: str(raw.say),
    hours: str(raw.hours),
    notes: str(raw.notes),
    steps: list(raw.steps),
    bring: list(raw.bring),
  }
  const hasAny =
    es.what || es.say || es.hours || es.notes || es.steps.length || es.bring.length
  return hasAny ? es : null
}

export function loadCustom() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.map((r, i) => ({ ...normalize(r, i), custom: true })).filter((r) => r.name)
  } catch {
    return []
  }
}

export function saveCustom(items) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

// Edits to the built-in entries, keyed by their id. An override holds the
// whole edited resource, so the editor can treat built-in and added entries
// identically. `{ hidden: true }` takes one off the list without deleting it,
// and removing the key restores the original.
export function loadOverrides() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_OVERRIDES) || '{}')
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  } catch {
    return {}
  }
}

export function saveOverrides(map) {
  localStorage.setItem(KEY_OVERRIDES, JSON.stringify(map))
}

// The list the rest of the app actually uses: built-ins with any edits
// applied and hidden ones removed, followed by anything added here.
export function effectiveResources(overrides = {}, custom = []) {
  const built = RESOURCES.map((r) => {
    const o = overrides[r.id]
    if (!o) return r
    if (o.hidden) return null
    return { ...normalize({ ...r, ...o }), id: r.id, builtIn: true, edited: true }
  }).filter(Boolean)

  return [...built, ...custom]
}

// Everything the editor can show, including built-ins that are hidden right
// now (so they can be brought back).
export function editableList(overrides = {}, custom = []) {
  const built = RESOURCES.map((r) => {
    const o = overrides[r.id]
    return {
      ...(o && !o.hidden ? { ...normalize({ ...r, ...o }), id: r.id } : r),
      builtIn: true,
      edited: !!o && !o.hidden,
      hidden: !!o?.hidden,
    }
  })
  return [...built, ...custom.map((c) => ({ ...c, builtIn: false, custom: true }))]
}

// Problems that would make the entry useless or invisible. Returned as plain
// sentences because the people using this are not developers.
export function validate(draft, allIds = []) {
  const errors = []
  const warnings = []

  if (!str(draft.name)) errors.push('It needs a name.')
  if (!draft.needs?.length && !draft.situations?.length) {
    errors.push(
      'Tick at least one box under "When should this show up?" — otherwise it will never appear on anyone\'s sheet.'
    )
  }
  if (allIds.filter((id) => id === draft.id).length > 1) {
    errors.push('Another entry already uses this name. Change the name slightly.')
  }

  if (draft.coords) {
    const { lat, lon } = draft.coords
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      errors.push('The map position is not a valid pair of numbers.')
    } else if (lat < 25 || lat > 37 || lon < -107 || lon > -93) {
      warnings.push('That map position is outside Texas. Double-check it.')
    }
  }

  if (!str(draft.phone)) warnings.push('No phone number. Most people call before they go.')
  if (!str(draft.what)) warnings.push('No description, so the sheet will not say what this place does.')
  if (!str(draft.address)) warnings.push('No address, so it gets no pin on the map.')
  if (!draft.coords && str(draft.address)) {
    warnings.push('No map position, so it will not get a pin. Use "Find on map" to add one.')
  }
  if (!draft.steps?.length) warnings.push('No steps, so the sheet will not tell them what to do.')

  return { errors, warnings, ok: errors.length === 0 }
}

// Look up a street address with OpenStreetMap. Optional -- an entry without
// coordinates still prints fine, it just gets no map pin.
export async function geocode(address) {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' +
    encodeURIComponent(address)
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Lookup service returned ${res.status}`)
  const json = await res.json()
  if (!json?.length) throw new Error('No match found. Check the address, or type the position by hand.')
  return {
    coords: { lat: +Number(json[0].lat).toFixed(6), lon: +Number(json[0].lon).toFixed(6) },
    label: json[0].display_name,
  }
}

// Emits an entry in exactly the format src/resources.js uses, so a developer
// can paste it in and make it permanent for every machine.
export function toCodeSnippet(r) {
  const q = (s) => JSON.stringify(s)
  const arr = (a) => (a.length ? `[\n      ${a.map(q).join(',\n      ')},\n    ]` : '[]')
  const lines = [
    '  {',
    `    id: ${q(r.id)},`,
    `    name: ${q(r.name)},`,
    `    category: ${q(r.category)},`,
    `    what: ${q(r.what)},`,
    `    address: ${q(r.address)},`,
  ]
  if (r.coords) lines.push(`    coords: { lat: ${r.coords.lat}, lon: ${r.coords.lon} },`)
  lines.push(`    phone: ${q(r.phone)},`)
  if (r.phoneLabel) lines.push(`    phoneLabel: ${q(r.phoneLabel)},`)
  if (r.altPhone) lines.push(`    altPhone: ${q(r.altPhone)},`)
  if (r.altPhoneLabel) lines.push(`    altPhoneLabel: ${q(r.altPhoneLabel)},`)
  lines.push(`    hours: ${q(r.hours)},`)
  if (r.say) lines.push(`    say: ${q(r.say)},`)
  if (r.steps.length) lines.push(`    steps: ${arr(r.steps)},`)
  if (r.bring.length) lines.push(`    bring: ${arr(r.bring)},`)
  if (r.notes) lines.push(`    notes: ${q(r.notes)},`)
  if (r.website) lines.push(`    website: ${q(r.website)},`)
  if (r.serves) {
    lines.push(
      `    serves: { collinOnly: ${!!r.serves.collinOnly}, excludeCities: ${JSON.stringify(
        r.serves.excludeCities
      )}, area: ${q(r.serves.area)} },`
    )
  }
  lines.push(`    needs: ${JSON.stringify(r.needs)},`)
  lines.push(`    situations: ${JSON.stringify(r.situations)},`)
  lines.push(`    priority: ${r.priority},`)
  lines.push('  },')
  return lines.join('\n')
}

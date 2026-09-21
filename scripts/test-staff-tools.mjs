// Tests for the Staff Tools storage layer.
//
//   node scripts/test-staff-tools.mjs
//
// Covers the parts that could quietly corrupt the resource list: editing a
// built-in entry, hiding one, adding a new one, eligibility rules on added
// entries, validation, and recovery from damaged storage.

import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

// The storage layer is browser code; give it just enough of a browser.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const SRC = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src') + path.sep
).href

const {
  RESOURCES,
  matchResources,
  NEEDS: NEEDSX,
  SITUATIONS: SITUATIONSX,
  RESIDENCES: RESIDENCESX,
} = await import(SRC + 'resources.js')
const C = await import(SRC + 'customResources.js')
const { buildResourceSheet } = await import(SRC + 'pdf.js')

let pass = 0
let fail = 0
const check = (label, cond, extra = '') => {
  if (cond) {
    pass++
    console.log(`  ok    ${label}`)
  } else {
    fail++
    console.log(`  FAIL  ${label} ${extra}`)
  }
}

console.log('=== baseline ===')
check('no changes -> same as built-in list', C.effectiveResources({}, []).length === RESOURCES.length)

console.log('\n=== hiding a built-in ===')
const hiddenPool = C.effectiveResources({ 'salvation-army': { hidden: true } }, [])
check('hidden entry disappears', hiddenPool.length === RESOURCES.length - 1)
check('the right one disappeared', !hiddenPool.some((r) => r.id === 'salvation-army'))
check(
  'still listed in the editor so it can be brought back',
  C.editableList({ 'salvation-army': { hidden: true } }, []).some(
    (r) => r.id === 'salvation-army' && r.hidden
  )
)

console.log('\n=== editing a built-in ===')
const original = RESOURCES.find((r) => r.id === 'cfp-mckinney')
const originalPhone = original.phone
const ov = { 'cfp-mckinney': { ...original, phone: '(972) 000-0000', hours: 'Mon only' } }
const got = C.effectiveResources(ov, []).find((r) => r.id === 'cfp-mckinney')
check('edited phone is used', got.phone === '(972) 000-0000', `got ${got.phone}`)
check('edited hours are used', got.hours === 'Mon only')
check(
  'untouched fields survive',
  got.name === original.name && got.needs.join() === original.needs.join()
)
check('marked as edited for the badge', got.edited === true)
check('the built-in list itself is never mutated', original.phone === originalPhone)
check(
  'reverting restores the original',
  C.effectiveResources({}, []).find((r) => r.id === 'cfp-mckinney').phone === originalPhone
)

console.log('\n=== adding a new place ===')
const draft = C.normalize({
  name: 'Allen Community Outreach',
  category: 'Food & bills',
  what: 'Food pantry and help with bills for south Collin County.',
  address: '801 E Main St, Allen, TX 75002',
  coords: { lat: 33.1031, lon: -96.6706 },
  phone: '(972) 727-9131',
  hours: 'Mon-Thu 9:00 AM - 4:00 PM',
  say: 'I need help with food and my electric bill.',
  steps: ['Call first to check what you need to bring.', 'Go during open hours.'],
  bring: ['Photo ID', 'Your bill'],
  needs: ['food', 'rentutility'],
  situations: [],
})
C.saveCustom([{ ...draft, custom: true }])
const pool = C.effectiveResources({}, C.loadCustom())
check('added place is in the pool', pool.length === RESOURCES.length + 1)
check('survives a save/load round trip', C.loadCustom()[0].name === 'Allen Community Outreach')
check('arrays survive the round trip', C.loadCustom()[0].steps.length === 2)
check(
  'shows up when "Food" is ticked',
  matchResources(['food'], [], 'unknown', pool).resources.some(
    (r) => r.name === 'Allen Community Outreach'
  )
)
check(
  'does not show up for unrelated needs',
  !matchResources(['legal'], [], 'unknown', pool).resources.some(
    (r) => r.name === 'Allen Community Outreach'
  )
)

console.log('\n=== eligibility on an added place ===')
const gated = C.normalize({
  name: 'North-only Pantry',
  category: 'Food',
  phone: '(000) 000-0000',
  needs: ['food'],
  situations: [],
  serves: { collinOnly: true, excludeCities: ['plano'], area: 'Not Plano' },
})
const pool2 = C.effectiveResources({}, [{ ...gated, custom: true }])
check(
  'hidden from a Plano resident',
  !matchResources(['food'], [], 'plano', pool2).resources.some((r) => r.name === 'North-only Pantry')
)
check(
  'shown to a McKinney resident',
  matchResources(['food'], [], 'mckinney', pool2).resources.some(
    (r) => r.name === 'North-only Pantry'
  )
)
check(
  'reported as excluded, not silently dropped',
  matchResources(['food'], [], 'plano', pool2).excluded.some((r) => r.name === 'North-only Pantry')
)

console.log('\n=== validation ===')
check('rejects a missing name', !C.validate({ ...C.BLANK, needs: ['food'] }).ok)
check('rejects an entry that would never show', !C.validate({ ...C.BLANK, name: 'X' }).ok)
check('accepts a usable entry', C.validate({ ...C.BLANK, name: 'X', needs: ['food'] }).ok)
check(
  'warns about a missing phone',
  C.validate({ ...C.BLANK, name: 'X', needs: ['food'] }).warnings.some((w) => /phone/i.test(w))
)

console.log('\n=== damaged storage does not crash the app ===')
store.set('saminn.customResources.v1', '{ not json')
check('bad JSON -> empty list', C.loadCustom().length === 0)
store.set('saminn.customResources.v1', '[{"name":"No fields"}]')
check('sparse entry gets filled in', C.loadCustom()[0].hours === 'Call for hours')
store.set('saminn.overrides.v1', '["wrong shape"]')
check('bad overrides -> empty map', Object.keys(C.loadOverrides()).length === 0)

console.log('\n=== the PDF still builds with an added place ===')
const doc = buildResourceSheet({
  firstName: 'Test',
  resources: [draft, RESOURCES[0]],
  notes: '',
  includeSafetyWarning: false,
})
check('PDF generated', doc.getNumberOfPages() >= 1)

console.log('\n=== Spanish ===')
const I18N = await import(SRC + 'i18n.js')

const pantryEn = RESOURCES.find((r) => r.id === 'saminn-pantry')
const pantryEs = I18N.localizeResource(pantryEn, 'es')
check('resource text is translated', /despensa|alimentos|comida/i.test(pantryEs.what), pantryEs.what)
check('the phone number is NOT translated', pantryEs.phone === pantryEn.phone)
check('matching ids are NOT translated', pantryEs.needs.join() === pantryEn.needs.join())
check('the category is translated', pantryEs.category !== pantryEn.category)
check('English is returned untouched', I18N.localizeResource(pantryEn, 'en') === pantryEn)

check(
  'every built-in resource has Spanish',
  RESOURCES.every((r) => !I18N.localizeResource(r, 'es').untranslated),
  RESOURCES.filter((r) => I18N.localizeResource(r, 'es').untranslated)
    .map((r) => r.id)
    .join(', ')
)

const missingKeys = Object.keys(I18N.STRINGS.en).filter((k) => !(k in I18N.STRINGS.es))
check('every UI string has a Spanish version', missingKeys.length === 0, missingKeys.join(', '))

for (const kind of ['needs', 'situations', 'residences']) {
  const src = { needs: NEEDSX, situations: SITUATIONSX, residences: RESIDENCESX }[kind]
  const missing = src.filter((o) => !I18N.LABELS.es[kind][o.id])
  check(`every ${kind} option has a Spanish label`, missing.length === 0, missing.map((m) => m.id).join(', '))
}
const missingCats = [...new Set(RESOURCES.map((r) => r.category))].filter(
  (c) => !I18N.LABELS.es.categories[c]
)
check('every category has a Spanish label', missingCats.length === 0, missingCats.join(', '))

check('an added place with no Spanish is flagged, not dropped', (() => {
  const plain = C.normalize({ name: 'Nuevo Lugar', needs: ['food'], phone: '(1) 2' })
  const out = I18N.localizeResource(plain, 'es')
  return out.untranslated === true && out.name === 'Nuevo Lugar'
})())
check('an added place WITH Spanish uses it', (() => {
  const withEs = C.normalize({
    name: 'Nuevo Lugar', needs: ['food'], phone: '(1) 2',
    what: 'English words', es: { what: 'Palabras en español' },
  })
  const out = I18N.localizeResource(withEs, 'es')
  return out.what === 'Palabras en español' && !out.untranslated
})())

const esDoc = buildResourceSheet({
  firstName: 'María', resources: [pantryEn], notes: '', includeSafetyWarning: true, lang: 'es',
})
check('a Spanish PDF builds', esDoc.getNumberOfPages() >= 1)

console.log('\n=== "copy as code" output is valid JS ===')
const snippet = C.toCodeSnippet(draft)
let parsed = null
try {
  parsed = eval('(' + snippet.trim().replace(/,$/, '') + ')')
} catch {
  parsed = null
}
check('snippet parses', !!parsed, snippet.slice(0, 80))
check('snippet keeps the name', parsed?.name === 'Allen Community Outreach')
check('snippet keeps the coords', parsed?.coords?.lat === 33.1031)
check('snippet keeps the needs', parsed?.needs?.join() === 'food,rentutility')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

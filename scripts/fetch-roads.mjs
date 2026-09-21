// Regenerates src/roads.js -- the road geometry drawn on the map.
//
//   node scripts/fetch-roads.mjs
//
// Pulls major roads for the McKinney/Plano area from OpenStreetMap through the
// Overpass API, chains the fragments into continuous lines, simplifies them,
// and writes a compact data file. After this runs, the app needs no network.
//
// You only need to run this if the service area changes. The road network
// itself barely moves year to year.
//
// Road data is (c) OpenStreetMap contributors under the ODbL. The attribution
// printed on every map in src/pdf.js is required -- do not remove it.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DEST = path.join(HERE, '..', 'src', 'roads.js')
const CACHE = path.join(HERE, '..', 'node_modules', '.cache-overpass.json')

// south, west, north, east -- covers McKinney down through Plano.
const BBOX = [32.97, -96.82, 33.28, -96.55]
const CLASSES = ['motorway', 'trunk', 'primary', 'secondary']
const EPS = 0.0006 // simplification tolerance in degrees, about 60 m

const query = `[out:json][timeout:180];
way["highway"~"^(${CLASSES.join('|')})$"](${BBOX.join(',')});
out geom;`

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
]
const UA = 'SamaritanInnResourceSheet/1.0 (nonprofit resource sheet map; one-off build script)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// --- fetch (cached; Overpass rate-limits hard) -------------------------------

let json = null
if (fs.existsSync(CACHE) && fs.statSync(CACHE).size > 10000) {
  console.log('using cached Overpass response')
  json = JSON.parse(fs.readFileSync(CACHE, 'utf8'))
} else {
  outer: for (let round = 0; round < 3 && !json; round++) {
    for (const url of ENDPOINTS) {
      console.log(`querying ${url} (round ${round + 1})`)
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': UA,
            Accept: 'application/json',
          },
          body: 'data=' + encodeURIComponent(query),
        })
        if (!res.ok) {
          console.log(`  -> HTTP ${res.status}`)
          continue
        }
        const text = await res.text()
        const parsed = JSON.parse(text)
        if (!parsed.elements?.length) {
          console.log('  -> 0 elements')
          continue
        }
        fs.mkdirSync(path.dirname(CACHE), { recursive: true })
        fs.writeFileSync(CACHE, text)
        json = parsed
        break outer
      } catch (e) {
        console.log('  -> ' + e.message)
      }
    }
    if (!json) {
      console.log('  all endpoints busy, waiting 45s...')
      await sleep(45000)
    }
  }
}
if (!json?.elements?.length) {
  console.error('Overpass unavailable and nothing cached. src/roads.js left untouched.')
  process.exit(1)
}
console.log(`raw ways: ${json.elements.length}`)

// --- simplify ---------------------------------------------------------------

function perp(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
  const cl = t < 0 ? a : t > 1 ? b : [a[0] + t * dx, a[1] + t * dy]
  return Math.hypot(p[0] - cl[0], p[1] - cl[1])
}

function simplify(pts, eps) {
  if (pts.length < 3) return pts
  let idx = 0
  let max = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perp(pts[i], pts[0], pts[pts.length - 1])
    if (d > max) {
      max = d
      idx = i
    }
  }
  if (max > eps) {
    return simplify(pts.slice(0, idx + 1), eps).slice(0, -1).concat(simplify(pts.slice(idx), eps))
  }
  return [pts[0], pts[pts.length - 1]]
}

// Overpass splits every road at every intersection, so the raw result is tens
// of thousands of 2-point stubs. Chaining them back into continuous polylines
// is where nearly all of the size saving comes from (1.6 MB -> 36 KB).
function mergeChains(lines) {
  const key = (p) => p[0].toFixed(6) + ',' + p[1].toFixed(6)
  const remaining = new Set(lines.map((_, i) => i))
  const at = new Map()
  const add = (k, v) => {
    if (!at.has(k)) at.set(k, [])
    at.get(k).push(v)
  }
  lines.forEach((l, i) => {
    add(key(l[0]), i)
    add(key(l[l.length - 1]), i)
  })

  const out = []
  while (remaining.size) {
    const seed = remaining.values().next().value
    remaining.delete(seed)
    let chain = lines[seed].slice()
    for (const forward of [true, false]) {
      let grew = true
      while (grew) {
        grew = false
        const k = key(forward ? chain[chain.length - 1] : chain[0])
        for (const j of at.get(k) || []) {
          if (!remaining.has(j)) continue
          const l = lines[j]
          const head = key(l[0]) === k
          const tail = key(l[l.length - 1]) === k
          if (!head && !tail) continue
          const piece = head ? l : l.slice().reverse()
          chain = forward
            ? chain.concat(piece.slice(1))
            : piece.slice().reverse().slice(0, -1).concat(chain)
          remaining.delete(j)
          grew = true
          break
        }
      }
    }
    out.push(chain)
  }
  return out
}

// --- build ------------------------------------------------------------------

const rank = Object.fromEntries(CLASSES.map((c, i) => [c, i]))
const groups = new Map()
for (const el of json.elements) {
  if (!el.geometry || el.geometry.length < 2) continue
  const cls = el.tags?.highway
  if (!(cls in rank)) continue
  const ref = (el.tags?.ref || '').split(';')[0].trim()
  const gk = `${rank[cls]}|${ref}`
  if (!groups.has(gk)) groups.set(gk, [])
  groups.get(gk).push(el.geometry.map((g) => [g.lon, g.lat]))
}

const out = []
for (const [gk, lines] of groups) {
  const c = Number(gk.slice(0, gk.indexOf('|')))
  const ref = gk.slice(gk.indexOf('|') + 1)
  for (const chain of mergeChains(lines)) {
    const pts = simplify(chain, EPS)
    if (pts.length < 2) continue
    // Drop stubby minor roads: clutter on the page, bytes in the bundle.
    const span = Math.hypot(
      pts[pts.length - 1][0] - pts[0][0],
      pts[pts.length - 1][1] - pts[0][1]
    )
    if (c === 3 && span < 0.004) continue
    const w = { c, p: pts.map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]) }
    if (ref && c <= 2) w.r = ref
    out.push(w)
  }
}

out.sort((a, b) => b.c - a.c) // minor roads first so freeways draw on top

fs.writeFileSync(
  DEST,
  `// Generated by scripts/fetch-roads.mjs. Do not hand-edit.
// Road data (c) OpenStreetMap contributors, licensed ODbL
// (opendatacommons.org/licenses/odbl). The attribution printed on the map in
// src/pdf.js is required by that licence.
//
//   c = class: ${CLASSES.map((c, i) => `${i} ${c}`).join(', ')}
//   r = route ref (e.g. "US 75")
//   p = [[lon, lat], ...]

export const ROAD_CLASSES = ${JSON.stringify(CLASSES)}

export const ROADS = [
  ${out.map((w) => JSON.stringify(w)).join(',\n  ')}
]
`
)

const counts = {}
for (const w of out) counts[CLASSES[w.c]] = (counts[CLASSES[w.c]] || 0) + 1
console.log('polylines:', out.length)
console.log('points:   ', out.reduce((a, w) => a + w.p.length, 0))
console.log('by class: ', counts)
console.log('file size:', (fs.statSync(DEST).size / 1024).toFixed(1) + ' KB')
console.log('routes:   ', [...new Set(out.filter((w) => w.r).map((w) => w.r))].sort().join(', '))

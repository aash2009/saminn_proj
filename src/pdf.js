// ===========================================================================
// pdf.js -- draws the printable resource sheet.
//
// Plain drawing code, not React: text and shapes at x/y coordinates on a
// page, using jsPDF. Measured in POINTS (72pt = 1 inch); US Letter is
// 612 x 792.
//
// THE ONE RULE: MEASURE, THEN BREAK, THEN DRAW. Every card's full height is
// worked out by layoutCard() BEFORE anything is drawn, so a card is never
// split across pages. If you change what drawCard() puts on the page, make
// the matching change in layoutCard() -- if drawing uses more height than
// layout reserved, the next card lands on top of this one. Watch the browser
// console for:
//     [resource sheet] "Name" drew 303.0pt but reserved 301.0pt
//
// MAP: only drawn when `showMap` is true, which only ever happens for a
// McKinney resident who checked "homeless" and gave a location we could
// geocode. It is centered on THAT location, not the Inn. Every resource
// still prints as a normal text card whether or not it gets a pin -- the
// map never filters anything.
// ===========================================================================

import { jsPDF } from 'jspdf'
import { ROADS } from './roads.js'
import { EMERGENCY, HOME_BASE, verifiedOn, cityOf, directionsUrl, offsetMilesFrom } from './resources.js'
import { t } from './i18n.js'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2
const BODY_BOTTOM = PAGE_H - 62
const RULE_GUTTER = 18

const INK = [17, 24, 39]
const MUTED = [90, 98, 112]
const RULE = [200, 205, 214]
const BRAND = [21, 74, 120]
const TINT = [237, 243, 249]
const ALERT = [155, 28, 28]

const T = {
  title: { size: 13.5, style: 'bold', lead: 16 },
  dist: { size: 9.5, style: 'normal', lead: 12, color: MUTED },
  what: { size: 10.5, style: 'normal', lead: 13 },
  head: { size: 8.5, style: 'bold', lead: 12, color: BRAND },
  say: { size: 11, style: 'italic', lead: 14 },
  step: { size: 10.5, style: 'normal', lead: 13 },
  bullet: { size: 10.5, style: 'normal', lead: 13 },
  fact: { size: 10.5, style: 'normal', lead: 13 },
  link: { size: 9, style: 'normal', lead: 12, color: BRAND },
}

const FACT_LABEL_W = 62
const STEP_GUTTER = 17
const SECTION_GAP = 5

function useFont(doc, spec, colorOverride) {
  doc.setFont('helvetica', spec.style)
  doc.setFontSize(spec.size)
  const c = colorOverride || spec.color || INK
  doc.setTextColor(c[0], c[1], c[2])
}

function wrap(doc, text, spec, width) {
  if (text === null || text === undefined || text === '') return []
  useFont(doc, spec)
  return doc.splitTextToSize(String(text), width)
}

function blockHeight(lines, spec) {
  return lines.length * spec.lead
}

function layoutCard(doc, resource, number, T_, identities) {
  const w = CONTENT_W - RULE_GUTTER
  const c = { resource, number, w, T_ }
  let h = 0

  c.titleLines = wrap(doc, `${number}. ${resource.name}`, T.title, w)
  h += blockHeight(c.titleLines, T.title)
  h += 3

  c.whatLines = wrap(doc, resource.what, T.what, w)
  h += blockHeight(c.whatLines, T.what)

  if (resource.say) {
    h += SECTION_GAP
    c.sayLines = wrap(doc, `"${resource.say}"`, T.say, w - 24)
    c.sayBoxH = blockHeight(c.sayLines, T.say) + 24
    h += c.sayBoxH + 6
  } else {
    c.sayLines = []
    c.sayBoxH = 0
  }

  c.steps = []
  if (resource.steps && resource.steps.length) {
    h += SECTION_GAP + T.head.lead
    for (const s of resource.steps) {
      const lines = wrap(doc, s, T.step, w - STEP_GUTTER)
      c.steps.push(lines)
      h += blockHeight(lines, T.step) + 1
    }
  }

  c.bring = []
  if (resource.bring && resource.bring.length) {
    h += SECTION_GAP + T.head.lead
    for (const b of resource.bring) {
      const lines = wrap(doc, b, T.bullet, w - 14)
      c.bring.push(lines)
      h += blockHeight(lines, T.bullet)
    }
  }

  c.requirements = []
  const matchedReqs = resource.requirementsByTag
    ? identities.filter((id) => resource.requirementsByTag[id]).map((id) => resource.requirementsByTag[id])
    : []
  if (matchedReqs.length) {
    h += SECTION_GAP + T.head.lead
    for (const req of matchedReqs) {
      const lines = wrap(doc, req, T.bullet, w - 14)
      c.requirements.push(lines)
      h += blockHeight(lines, T.bullet)
    }
  }

  c.facts = []
  const pending = []
  const addFact = (label, value) => {
    if (!value) return
    pending.push({ label, value })
  }
  addFact(T_('labelPhone'), resource.phoneLabel ? `${resource.phone}  (${resource.phoneLabel})` : resource.phone)
  if (resource.altPhone) {
    addFact(T_('labelAlso'), resource.altPhoneLabel ? `${resource.altPhone}  (${resource.altPhoneLabel})` : resource.altPhone)
  }
  addFact(T_('labelWhere'), resource.address)
  addFact(T_('labelWhen'), resource.hours)
  if (resource.notes) addFact(T_('labelNote'), resource.notes)

  useFont(doc, { ...T.fact, style: 'bold' })
  c.labelW = Math.max(FACT_LABEL_W, ...pending.map((f) => doc.getTextWidth(f.label) + 10))
  c.facts = pending.map((f) => ({ label: f.label, lines: wrap(doc, f.value, T.fact, w - c.labelW) }))

  h += SECTION_GAP + 3
  for (const f of c.facts) h += blockHeight(f.lines, T.fact)

  c.url = directionsUrl(resource)
  if (c.url) h += 3 + T.link.lead

  c.height = h + (T.title.lead - 4) + 4
  return c
}

function drawCard(doc, c, top) {
  const T_ = c.T_
  const x = MARGIN + RULE_GUTTER
  let y = top + T.title.lead - 4

  useFont(doc, T.title)
  for (const line of c.titleLines) {
    doc.text(line, x, y)
    y += T.title.lead
  }
  y += 3

  useFont(doc, T.what)
  for (const line of c.whatLines) {
    doc.text(line, x, y)
    y += T.what.lead
  }

  const miniHead = (label) => {
    y += SECTION_GAP
    useFont(doc, T.head)
    doc.text(label, x, y)
    y += T.head.lead
  }

  if (c.sayLines.length) {
    y += SECTION_GAP
    const boxTop = y
    doc.setFillColor(TINT[0], TINT[1], TINT[2])
    doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2])
    doc.setLineWidth(0.8)
    doc.rect(x, boxTop, c.w, c.sayBoxH, 'FD')
    useFont(doc, T.head)
    doc.text(T_('headSay').toUpperCase(), x + 12, boxTop + 15)
    useFont(doc, T.say)
    let sy = boxTop + 15 + T.head.lead + 3
    for (const line of c.sayLines) {
      doc.text(line, x + 12, sy)
      sy += T.say.lead
    }
    y = boxTop + c.sayBoxH + 6
  }

  if (c.steps.length) {
    miniHead(T_('headSteps').toUpperCase())
    c.steps.forEach((lines, i) => {
      useFont(doc, T.step, BRAND)
      doc.setFont('helvetica', 'bold')
      doc.text(`${i + 1}.`, x, y)
      useFont(doc, T.step)
      for (const line of lines) {
        doc.text(line, x + STEP_GUTTER, y)
        y += T.step.lead
      }
      y += 1
    })
  }

  if (c.bring.length) {
    miniHead(T_('headBring').toUpperCase())
    for (const lines of c.bring) {
      useFont(doc, T.bullet, BRAND)
      doc.text('•', x + 2, y)
      useFont(doc, T.bullet)
      for (const line of lines) {
        doc.text(line, x + 14, y)
        y += T.bullet.lead
      }
    }
  }

  if (c.requirements.length) {
    miniHead(T_('headRequirements').toUpperCase())
    for (const lines of c.requirements) {
      useFont(doc, T.bullet, BRAND)
      doc.text('•', x + 2, y)
      useFont(doc, T.bullet)
      for (const line of lines) {
        doc.text(line, x + 14, y)
        y += T.bullet.lead
      }
    }
  }

  if (c.facts.length) {
    y += SECTION_GAP + 3
    for (const f of c.facts) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(T.fact.size)
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
      doc.text(f.label, x, y)
      useFont(doc, T.fact)
      for (const line of f.lines) {
        doc.text(line, x + c.labelW, y)
        y += T.fact.lead
      }
    }
  }

  if (c.url) {
    y += 3
    useFont(doc, T.link)
    doc.textWithLink(T_('pdfDirections'), x, y, { url: c.url })
    y += T.link.lead
  }

  doc.setDrawColor(RULE[0], RULE[1], RULE[2])
  doc.setLineWidth(3)
  doc.line(MARGIN + 5, top + 2, MARGIN + 5, y - 8)

  return y
}

const NICE_MILES = [0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 30]
const MAP_H = 300

function drawStar(doc, cx, cy, rOuter) {
  const rInner = rOuter * 0.42
  const pts = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner
    const a = ((-90 + i * 36) * Math.PI) / 180
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  const deltas = []
  for (let i = 1; i < pts.length; i++) deltas.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]])
  doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], 'F', true)
}

function drawMap(doc, top, pins, T_, originCoords) {
  const h = MAP_H
  const x = MARGIN
  const w = CONTENT_W

  doc.setFillColor(250, 251, 253)
  doc.setDrawColor(RULE[0], RULE[1], RULE[2])
  doc.setLineWidth(1)
  doc.rect(x, top, w, h, 'FD')

  useFont(doc, { size: 11, style: 'bold' }, BRAND)
  doc.text(T_('pdfMapTitle'), x + 14, top + 20)

  const px = x + 20
  const py = top + 32
  const pw = w - 40
  const ph = 200

  const pts = [{ origin: true, east: 0, north: 0 }, ...pins]
  let minE = Infinity, maxE = -Infinity, minN = Infinity, maxN = -Infinity
  for (const p of pts) {
    minE = Math.min(minE, p.east); maxE = Math.max(maxE, p.east)
    minN = Math.min(minN, p.north); maxN = Math.max(maxN, p.north)
  }
  const spanE = Math.max(maxE - minE, 0.6)
  const spanN = Math.max(maxN - minN, 0.6)
  const midE = (minE + maxE) / 2
  const midN = (minN + maxN) / 2
  const scale = Math.min(pw / (spanE * 1.32), ph / (spanN * 1.32))
  const cx = px + pw / 2
  const cy = py + ph / 2
  const toScreen = (p) => ({ sx: cx + (p.east - midE) * scale, sy: cy - (p.north - midN) * scale })

  const placed = []
  const inside = (sx, sy) => sx >= px + 11 && sx <= px + pw - 11 && sy >= py + 11 && sy <= py + ph - 11
  const clearance = (sx, sy) =>
    placed.length ? Math.min(...placed.map((q) => Math.hypot(q.sx - sx, q.sy - sy))) : Infinity

  const put = (p) => {
    const base = toScreen(p)
    let sx = base.sx
    let sy = base.sy
    if (!inside(sx, sy) || clearance(sx, sy) < 19) {
      let best = null
      for (let attempt = 0; attempt < 160; attempt++) {
        const a = (attempt * 137.5 * Math.PI) / 180
        const r = 12 + attempt * 0.9
        const cx2 = base.sx + Math.cos(a) * r
        const cy2 = base.sy + Math.sin(a) * r
        if (!inside(cx2, cy2)) continue
        const c = clearance(cx2, cy2)
        if (c >= 19) { best = { sx: cx2, sy: cy2 }; break }
        if (!best || c > best.c) best = { sx: cx2, sy: cy2, c }
      }
      if (best) { sx = best.sx; sy = best.sy }
      else { sx = Math.min(Math.max(sx, px + 11), px + pw - 11); sy = Math.min(Math.max(sy, py + 11), py + ph - 11) }
    }
    const spot = { ...p, sx, sy }
    placed.push(spot)
    return spot
  }

  const originSpot = put({ origin: true, east: 0, north: 0 })
  const pinSpots = pins.map(put)

  doc.saveGraphicsState()
  doc.rect(px, py, pw, ph, null)
  doc.clip()
  doc.discardPath()

  const projLL = ([lon, lat]) => toScreen(offsetMilesFrom(originCoords, { lat, lon }))
  const inView = (s) => s.sx > px - 40 && s.sx < px + pw + 40 && s.sy > py - 40 && s.sy < py + ph + 40

  const ROAD_STYLE = [
    { w: 3.0, casing: 4.2, color: [235, 178, 92], case: [205, 148, 66] },
    { w: 2.4, casing: 3.4, color: [242, 200, 130], case: [212, 170, 100] },
    { w: 1.9, casing: 0, color: [170, 185, 202], case: null },
    { w: 1.1, casing: 0, color: [199, 210, 222], case: null },
  ]

  const screenPaths = []
  for (const road of ROADS) {
    const pts2 = road.p.map(projLL)
    if (!pts2.some(inView)) continue
    screenPaths.push({ road, pts: pts2 })
  }

  const strokePath = (pts2) => {
    const deltas = []
    for (let i = 1; i < pts2.length; i++) deltas.push([pts2[i].sx - pts2[i - 1].sx, pts2[i].sy - pts2[i - 1].sy])
    doc.lines(deltas, pts2[0].sx, pts2[0].sy, [1, 1], 'S', false)
  }

  for (const { road, pts: p2 } of screenPaths) {
    const st = ROAD_STYLE[road.c]
    if (!st.casing) continue
    doc.setDrawColor(st.case[0], st.case[1], st.case[2])
    doc.setLineWidth(st.casing)
    strokePath(p2)
  }
  for (const { road, pts: p2 } of screenPaths) {
    const st = ROAD_STYLE[road.c]
    doc.setDrawColor(st.color[0], st.color[1], st.color[2])
    doc.setLineWidth(st.w)
    strokePath(p2)
  }

  const maxRing = Math.hypot(pw, ph) / scale
  const rings = NICE_MILES.filter((m) => m * scale > 26 && m < maxRing).slice(0, 4)
  doc.setLineDashPattern([2, 2.5], 0)
  for (const m of rings) {
    doc.setDrawColor(198, 212, 226)
    doc.setLineWidth(0.7)
    doc.circle(originSpot.sx, originSpot.sy, m * scale, 'S')
  }
  doc.setLineDashPattern([], 0)
  const RING_ANGLES = [145, 168, 120, 193, 100, 215]
  const ringLabels = []
  for (const m of rings) {
    const label = `${m} ${T_('pdfMiShort')}`
    useFont(doc, { size: 7.5, style: 'bold' }, [104, 126, 148])
    const tw = doc.getTextWidth(label)
    for (const deg of RING_ANGLES) {
      const a = (deg * Math.PI) / 180
      const lx = originSpot.sx + Math.cos(a) * m * scale
      const lyy = originSpot.sy + Math.sin(a) * m * scale
      if (lx < px + tw / 2 + 4 || lx > px + pw - tw / 2 - 4) continue
      if (lyy < py + 8 || lyy > py + ph - 6) continue
      if (placed.some((q) => Math.hypot(q.sx - lx, q.sy - lyy) < 20)) continue
      if (ringLabels.some((q) => Math.hypot(q.x - lx, q.y - lyy) < 26)) continue
      doc.setFillColor(250, 251, 253)
      doc.rect(lx - tw / 2 - 2.5, lyy - 6.5, tw + 5, 9.5, 'F')
      doc.text(label, lx, lyy, { align: 'center' })
      ringLabels.push({ x: lx, y: lyy })
      break
    }
  }

  const byCity = new Map()
  for (const s of pinSpots) {
    if (!s.city) continue
    if (!byCity.has(s.city)) byCity.set(s.city, [])
    byCity.get(s.city).push(s)
  }
  for (const [city, group] of byCity) {
    const mx = group.reduce((a, s) => a + s.sx, 0) / group.length
    const my = group.reduce((a, s) => a + s.sy, 0) / group.length
    useFont(doc, { size: 14, style: 'bold' }, [146, 162, 178])
    const label = city.toUpperCase()
    const tw = doc.getTextWidth(label)
    for (const dy of [-30, -44, 38, 52, -58, 66]) {
      const ly2 = my + dy
      if (ly2 < py + 14 || ly2 > py + ph - 8) continue
      if (placed.some((q) => Math.abs(q.sy - ly2) < 16 && Math.abs(q.sx - mx) < tw / 2 + 14)) continue
      doc.text(label, mx, ly2, { align: 'center' })
      break
    }
  }

  doc.setDrawColor(203, 214, 227)
  doc.setLineWidth(0.6)
  for (const s of pinSpots) doc.line(originSpot.sx, originSpot.sy, s.sx, s.sy)

  doc.restoreGraphicsState()

  const shields = new Map()
  for (const { road, pts: p2 } of screenPaths) {
    if (!road.r || road.c > 1) continue
    for (const s of p2) {
      if (s.sx < px + 20 || s.sx > px + pw - 20 || s.sy < py + 12 || s.sy > py + ph - 12) continue
      const d = Math.hypot(s.sx - (px + pw / 2), s.sy - (py + ph / 2))
      const cur = shields.get(road.r)
      if (!cur || d < cur.d) shields.set(road.r, { d, sx: s.sx, sy: s.sy })
    }
  }
  const drawnShields = []
  for (const [ref, s] of [...shields.entries()].sort((a, b) => a[1].d - b[1].d).slice(0, 6)) {
    const nearPin = placed.some((q) => Math.hypot(q.sx - s.sx, q.sy - s.sy) < 24)
    const nearShield = drawnShields.some((q) => Math.hypot(q.sx - s.sx, q.sy - s.sy) < 52)
    if (nearPin || nearShield) continue
    useFont(doc, { size: 7.5, style: 'bold' }, [60, 72, 86])
    const tw = doc.getTextWidth(ref)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(150, 164, 180)
    doc.setLineWidth(0.7)
    doc.roundedRect(s.sx - tw / 2 - 4, s.sy - 6.5, tw + 8, 13, 2.5, 2.5, 'FD')
    doc.text(ref, s.sx, s.sy + 2.6, { align: 'center' })
    drawnShields.push(s)
  }

  for (const s of pinSpots) {
    doc.setFillColor(255, 255, 255)
    doc.circle(s.sx, s.sy, 9.6, 'F')
    doc.setFillColor(BRAND[0], BRAND[1], BRAND[2])
    doc.circle(s.sx, s.sy, 8.5, 'F')
    useFont(doc, { size: 9.5, style: 'bold' }, [255, 255, 255])
    doc.text(String(s.n), s.sx, s.sy + 3.2, { align: 'center' })
  }

  doc.setFillColor(255, 255, 255)
  doc.circle(originSpot.sx, originSpot.sy, 12, 'F')
  doc.setFillColor(226, 26, 26)
  drawStar(doc, originSpot.sx, originSpot.sy, 11)

  const nx = px + pw - 12
  const ny = py + 14
  doc.setDrawColor(MUTED[0], MUTED[1], MUTED[2])
  doc.setLineWidth(1.1)
  doc.line(nx, ny + 14, nx, ny)
  doc.line(nx, ny, nx - 3.5, ny + 5)
  doc.line(nx, ny, nx + 3.5, ny + 5)
  useFont(doc, { size: 8, style: 'bold' }, MUTED)
  doc.text('N', nx, ny + 24, { align: 'center' })

  const target = pw / 3 / scale
  const miles = [...NICE_MILES].reverse().find((m) => m <= target) || NICE_MILES[0]
  const barW = miles * scale
  const bx = px + 4
  const by = py + ph + 16
  doc.setDrawColor(INK[0], INK[1], INK[2])
  doc.setLineWidth(1.2)
  doc.line(bx, by, bx + barW, by)
  doc.line(bx, by - 3, bx, by + 3)
  doc.line(bx + barW, by - 3, bx + barW, by + 3)
  useFont(doc, { size: 8, style: 'normal' }, INK)
  doc.text(`${miles} ${T_(miles === 1 ? 'pdfMile' : 'pdfMiles')}`, bx + barW + 6, by + 3)

  const ly = py + ph + 38
  let lgx = px + 4

  doc.setFillColor(226, 26, 26)
  drawStar(doc, lgx + 8, ly - 3, 8)
  lgx += 21
  useFont(doc, { size: 9, style: 'bold' }, INK)
  doc.text(T_('pdfYouAreHere'), lgx, ly)
  lgx += doc.getTextWidth(T_('pdfYouAreHere')) + 24

  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2])
  doc.circle(lgx + 8, ly - 3, 8, 'F')
  useFont(doc, { size: 9, style: 'bold' }, [255, 255, 255])
  doc.text('1', lgx + 8, ly, { align: 'center' })
  lgx += 21
  useFont(doc, { size: 9, style: 'bold' }, INK)
  doc.text(T_('pdfPinLegend'), lgx, ly)

  useFont(doc, { size: 7.5, style: 'normal' }, MUTED)
  doc.text(T_('pdfMapCaption'), px + 4, top + h - 9)
  doc.text(T_('pdfRoadCredit'), px + pw + 4, top + h - 9, { align: 'right' })

  return h
}

export function buildResourceSheet({
  firstName,
  resources,
  notes,
  includeSafetyWarning,
  identities = [],
  showMap = false,
  userCoords = null,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  let y = 0

  const T_ = (key, vars) => t(key, vars)

  const newPage = () => {
    doc.addPage()
    y = MARGIN
  }
  const need = (h) => {
    if (y + h > BODY_BOTTOM) newPage()
  }

  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2])
  doc.rect(0, 0, PAGE_W, 74, 'F')
  useFont(doc, { size: 20, style: 'bold' }, [255, 255, 255])
  doc.text(T_('pdfTitle'), MARGIN, 34)
  useFont(doc, { size: 10.5, style: 'normal' }, [214, 228, 240])
  doc.text(`${HOME_BASE.name}  ·  ${HOME_BASE.address}  ·  ${HOME_BASE.phone}`, MARGIN, 54)
  y = 74 + 26

  if (firstName) {
    useFont(doc, { size: 13, style: 'bold' })
    doc.text(T_('pdfPreparedFor', { name: firstName }), MARGIN, y)
    y += 17
  }
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  useFont(doc, { size: 10, style: 'normal' }, MUTED)
  doc.text(T_('pdfPrinted', { date: today }), MARGIN, y)
  y += 20

  if (includeSafetyWarning) {
    const lines = wrap(doc, T_('safetyPdf'), { size: 10.5, style: 'normal', lead: 13 }, CONTENT_W - 28)
    const boxH = lines.length * 13 + 32
    need(boxH + 16)
    doc.setFillColor(253, 242, 242)
    doc.setDrawColor(ALERT[0], ALERT[1], ALERT[2])
    doc.setLineWidth(1)
    doc.rect(MARGIN, y, CONTENT_W, boxH, 'FD')
    useFont(doc, { size: 11, style: 'bold' }, ALERT)
    doc.text(T_('pdfSafetyTitle'), MARGIN + 14, y + 19)
    useFont(doc, { size: 10.5, style: 'normal' }, ALERT)
    let ty = y + 35
    for (const line of lines) {
      doc.text(line, MARGIN + 14, ty)
      ty += 13
    }
    y += boxH + 18
  }

  const emgH = 36 + EMERGENCY.length * 30
  need(emgH + 20)
  doc.setFillColor(243, 246, 250)
  doc.setDrawColor(RULE[0], RULE[1], RULE[2])
  doc.setLineWidth(1)
  doc.rect(MARGIN, y, CONTENT_W, emgH, 'FD')
  useFont(doc, { size: 12.5, style: 'bold' }, BRAND)
  doc.text(T_('emergencyHead'), MARGIN + 14, y + 22)
  let ey = y + 42
  for (const item of EMERGENCY) {
    useFont(doc, { size: 17, style: 'bold' })
    doc.text(item.phone, MARGIN + 14, ey + 4)
    useFont(doc, { size: 10.5, style: 'bold' })
    doc.text(item.name, MARGIN + 80, ey - 2)
    useFont(doc, { size: 9, style: 'normal' }, MUTED)
    const whenLines = wrap(doc, item.when, { size: 9, style: 'normal', lead: 11 }, CONTENT_W - 106)
    doc.text(whenLines[0], MARGIN + 80, ey + 9)
    ey += 30
  }
  y += emgH + 22

  if (showMap && userCoords) {
    const mapPins = []
    resources.forEach((r, i) => {
      const off = offsetMilesFrom(userCoords, r.coords)
      if (off) mapPins.push({ n: i + 1, east: off.east, north: off.north, city: cityOf(r.address) })
    })
    if (mapPins.length) {
      need(MAP_H + 16)
      y += drawMap(doc, y, mapPins, T_, userCoords) + 20
    }
  }

  const SECTION_HEAD_H = 28
  if (resources.length) {
    const first = layoutCard(doc, resources[0], 1, T_, identities)
    if (y + SECTION_HEAD_H + 18 + first.height > BODY_BOTTOM) newPage()
  } else {
    need(SECTION_HEAD_H)
  }

  useFont(doc, { size: 14, style: 'bold' }, BRAND)
  doc.text(T_('placesHeadPdf'), MARGIN, y)
  y += 8
  doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2])
  doc.setLineWidth(2)
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
  y += 20

  let lastCategory = null

  resources.forEach((r, index) => {
    const card = layoutCard(doc, r, index + 1, T_, identities)
    const headingH = r.category !== lastCategory ? 18 : 0

    if (y + headingH + card.height > BODY_BOTTOM) newPage()

    if (r.category !== lastCategory) {
      useFont(doc, { size: 10, style: 'bold' }, MUTED)
      doc.text(r.category.toUpperCase(), MARGIN, y + 10)
      y += 18
      lastCategory = r.category
    }

    const endY = drawCard(doc, card, y)
    if (endY - y > card.height) {
      console.warn(`[resource sheet] "${r.name}" drew ${(endY - y).toFixed(1)}pt but reserved ${card.height.toFixed(1)}pt`)
    }
    y += card.height
  })

  if (notes && notes.trim()) {
    const lines = wrap(doc, notes.trim(), T.what, CONTENT_W - 16)
    const h = 24 + blockHeight(lines, T.what)
    need(h + 10)
    y += 6
    useFont(doc, { size: 12, style: 'bold' }, BRAND)
    doc.text(T_('visitNotes'), MARGIN, y)
    y += 18
    useFont(doc, T.what)
    for (const line of lines) {
      doc.text(line, MARGIN + 16, y)
      y += T.what.lead
    }
  }

  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setDrawColor(RULE[0], RULE[1], RULE[2])
    doc.setLineWidth(0.5)
    doc.line(MARGIN, PAGE_H - 44, PAGE_W - MARGIN, PAGE_H - 44)
    useFont(doc, { size: 8.5, style: 'normal' }, MUTED)
    doc.text(T_('pdfFooter', { date: verifiedOn() }), MARGIN, PAGE_H - 30)
    doc.text(T_('pdfPage', { n: p, total: pageCount }), PAGE_W - MARGIN, PAGE_H - 30, { align: 'right' })
  }

  return doc
}

export function downloadResourceSheet(options) {
  const doc = buildResourceSheet(options)
  const stamp = new Date().toISOString().slice(0, 10)
  const who = options.firstName ? `-${options.firstName.replace(/[^a-z0-9]/gi, '')}` : ''
  doc.save(`resource-sheet${who}-${stamp}.pdf`)
}

export function printResourceSheet(options) {
  const doc = buildResourceSheet(options)
  doc.autoPrint()
  const url = doc.output('bloburl')
  const win = window.open(url, '_blank')
  if (!win) {
    downloadResourceSheet(options)
    return false
  }
  return true
}

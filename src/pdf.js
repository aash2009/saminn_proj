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
import { t } from './i18n.js'
import { HOME_BASE, EMERGENCY, verifiedOn } from './resources.js'

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



export function buildResourceSheet({
  firstName,
  resources,
  notes,
  includeSafetyWarning,
  identities = [],
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

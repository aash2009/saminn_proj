const TALLY_KEY = 'saminn.needsTally'
const VISITS_KEY = 'saminn.needsTallyVisits'

export function loadNeedsTally() {
  try {
    const raw = localStorage.getItem(TALLY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function loadVisitCount() {
  try {
    return Number(localStorage.getItem(VISITS_KEY)) || 0
  } catch {
    return 0
  }
}

export function recordNeeds(selectedNeeds = []) {
  try {
    const tally = loadNeedsTally()
    for (const id of selectedNeeds) tally[id] = (tally[id] || 0) + 1
    localStorage.setItem(TALLY_KEY, JSON.stringify(tally))
    localStorage.setItem(VISITS_KEY, String(loadVisitCount() + 1))
  } catch {
    // Storage full/unavailable -- must never block a sheet from being made.
  }
}

export function resetNeedsTally() {
  try {
    localStorage.removeItem(TALLY_KEY)
    localStorage.removeItem(VISITS_KEY)
  } catch {
    // ignore
  }
}

// Turns free text -- an address, or a place someone often spends time -- into
// map coordinates. Calls OUR backend, never LocationIQ directly, since an API
// key shipped in browser JS is readable by anyone. Never throws; a failed or
// empty lookup returns null and must be treated exactly like "didn't answer."

const GEOCODE_ENDPOINT = '/api/geocode'

export async function geocode(query) {
  const q = query?.trim()
  if (!q) return null
  try {
    const res = await fetch(`${GEOCODE_ENDPOINT}?q=${encodeURIComponent(q)}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data || typeof data.lat !== 'number' || typeof data.lon !== 'number') return null
    return { lat: data.lat, lon: data.lon }
  } catch {
    return null
  }
}

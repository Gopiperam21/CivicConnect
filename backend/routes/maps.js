import { Router } from 'express'

const router = Router()
const placeCache = new Map()
const geocodeCache = new Map()
let lastGeocodeAt = 0
let geocodeQueue = Promise.resolve()

async function fetchJson(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) throw new Error(`Map provider returned HTTP ${response.status}.`)
    return await response.json()
  } finally { clearTimeout(timeout) }
}

async function nominatimSearch(query) {
  const key = query.toLowerCase()
  if (geocodeCache.has(key)) return geocodeCache.get(key)
  let release
  const previous = geocodeQueue
  geocodeQueue = new Promise(resolve => { release = resolve })
  await previous
  try {
    const wait = Math.max(0, 1000 - (Date.now() - lastGeocodeAt))
    if (wait) await new Promise(resolve => setTimeout(resolve, wait))
    lastGeocodeAt = Date.now()
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '8', addressdetails: '1', countrycodes: 'in' })
    const results = await fetchJson(url, { headers: { 'User-Agent': 'CitySync/1.0 (city map search)', 'Accept': 'application/json' } }, 12000)
    geocodeCache.set(key, results)
    return results
  } finally { release() }
}

router.get('/places', async (req, res) => {
  const lat = Number(req.query.lat)
  const lon = Number(req.query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return res.status(400).json({ error: 'Valid latitude and longitude are required.' })
  const city = String(req.query.city || 'Guntur').trim().slice(0, 120)
  const key = `${city.toLowerCase()}|${lat.toFixed(3)},${lon.toFixed(3)}`
  const cached = placeCache.get(key)
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) return res.json(cached.data)
  // Return a broad nearby set so the map and results panel stay in sync for a whole city area.
  const query = `[out:json][timeout:25];(nwr["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](around:15000,${lat},${lon});nwr["shop"~"^(mall|supermarket|department_store)$"](around:15000,${lat},${lon}););out tags center 1000;`
  let lastError
  for (const endpoint of ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']) {
    try {
      const data = await fetchJson(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'CitySync/1.0 (city map places)', 'Accept': 'application/json' }, body: `data=${encodeURIComponent(query)}` }, 18000)
      if (data.elements?.length) {
        placeCache.set(key, { time: Date.now(), data })
        return res.json(data)
      }
    } catch (error) { lastError = error }
  }
  try {
    const food = await nominatimSearch(`restaurants and cafes in ${city}`)
    const shopping = await nominatimSearch(`malls and shopping centres in ${city}`)
    const near = result => Math.abs(Number(result.lat) - lat) < 1 && Math.abs(Number(result.lon) - lon) < 1
    const elements = [
      ...food.filter(near).map(item => ({ type: 'nominatim', id: item.place_id, lat: Number(item.lat), lon: Number(item.lon), tags: { name: item.name || item.display_name.split(',')[0], amenity: 'restaurant' } })),
      ...shopping.filter(near).map(item => ({ type: 'nominatim', id: item.place_id, lat: Number(item.lat), lon: Number(item.lon), tags: { name: item.name || item.display_name.split(',')[0], shop: 'mall' } }))
    ]
    const data = { elements }
    placeCache.set(key, { time: Date.now(), data })
    return res.json(data)
  } catch (error) { lastError = error }
  console.error('Nearby places lookup failed:', lastError?.message)
  res.status(502).json({ error: 'Nearby places are temporarily unavailable. Please try again shortly.' })
})

router.get('/places/search', async (req, res) => {
  const query = String(req.query.q || '').trim().slice(0, 100)
  const city = String(req.query.city || '').trim().slice(0, 120)
  if (query.length < 2) return res.json({ elements: [] })
  try {
    const results = await nominatimSearch(`${query}${city ? `, ${city}` : ''}, India`)
    const elements = results.map(item => {
      const type = String(item.type || item.class || '').toLowerCase()
      const category = /mall|shop|supermarket|department_store/.test(type) ? 'Mall' : /restaurant|cafe|fast_food|food_court|bar/.test(type) ? 'Restaurant' : 'Place'
      return { type: 'nominatim', id: item.place_id, lat: Number(item.lat), lon: Number(item.lon), tags: { name: item.name || item.display_name?.split(',')[0] || query, category, amenity: category === 'Restaurant' ? 'restaurant' : undefined, shop: category === 'Mall' ? 'mall' : undefined } }
    }).filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lon))
    res.json({ elements })
  } catch (error) {
    console.error('Place search failed:', error.message)
    res.status(502).json({ error: 'Place search is temporarily unavailable.' })
  }
})

router.get('/reverse', async (req, res) => {
  const lat = Number(req.query.lat), lon = Number(req.query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return res.status(400).json({ error: 'Valid latitude and longitude are required.' })
  const key = `reverse:${lat.toFixed(3)},${lon.toFixed(3)}`
  if (geocodeCache.has(key)) return res.json(geocodeCache.get(key))
  let release
  const previous = geocodeQueue
  geocodeQueue = new Promise(resolve => { release = resolve })
  await previous
  try {
    const wait = Math.max(0, 1000 - (Date.now() - lastGeocodeAt))
    if (wait) await new Promise(resolve => setTimeout(resolve, wait))
    lastGeocodeAt = Date.now()
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.search = new URLSearchParams({ lat: String(lat), lon: String(lon), format: 'jsonv2', zoom: '10', addressdetails: '1' })
    const result = await fetchJson(url, { headers: { 'User-Agent': 'CitySync/1.0 (Indian city location detection)', 'Accept': 'application/json' } }, 12000)
    geocodeCache.set(key, result)
    res.json(result)
  } catch (error) {
    console.error('Location lookup failed:', error.message)
    res.status(502).json({ error: 'Could not identify the city from this location.' })
  } finally { release() }
})

router.get('/geocode', async (req, res) => {
  const query = String(req.query.q || '').trim().slice(0, 120)
  if (!query) return res.status(400).json({ error: 'Enter a city or area to search.' })
  try {
    res.json(await nominatimSearch(query))
  } catch (error) {
    console.error('City search failed:', error.message)
    res.status(502).json({ error: 'City search is temporarily unavailable.' })
  }
})

router.post('/route', async (req, res) => {
  const { start, end } = req.body || {}
  const valid = point => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon)) && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lon)) <= 180
  if (!valid(start) || !valid(end)) return res.status(400).json({ error: 'Valid start and destination coordinates are required.' })
  const coordinates = `${Number(start.lon)},${Number(start.lat)};${Number(end.lon)},${Number(end.lat)}`
  let lastError
  for (const base of ['https://router.project-osrm.org', 'https://routing.openstreetmap.de/routed-car']) {
    try {
      const route = await fetchJson(`${base}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`, { headers: { 'User-Agent': 'CitySync/1.0 (India city navigation)', 'Accept': 'application/json' } }, 18000)
      if (route.code === 'Ok' && route.routes?.length) return res.json(route)
      lastError = new Error(route.message || 'No route found.')
    } catch (error) { lastError = error }
  }
  console.error('Route lookup failed:', lastError?.message)
  res.status(502).json({ error: 'Driving directions are temporarily unavailable for these locations.' })
})

export default router

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './styles.css'

const icons = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15m6-12v15"/></>,
  pulse: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
  drops: <><path d="M12 22a7 7 0 0 0 7-7c0-4-7-13-7-13S5 11 5 15a7 7 0 0 0 7 7Z"/><path d="M9 16a3 3 0 0 0 3 3"/></>,
  bolt: <path d="m13 2-3 8h7L9 22l3-9H5z"/>,
  wind: <><path d="M3 8h12a3 3 0 1 0-3-3"/><path d="M2 12h17a3 3 0 1 1-3 3"/><path d="M4 16h6a3 3 0 1 1-3 3"/></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.6.9L16 20.7h-3l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.6L8 16.2l1.4-1.1a7 7 0 0 1 0-1.9L8 12.1l1.4-2.4 1.7.6a8 8 0 0 1 1.6-.9L13 7.6h3l.3 1.8a8 8 0 0 1 1.6.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1-.2 1.8Z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>
}
function Icon({ name, size = 18, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{icons[name]}</svg> }

const demoIncidents = [
  { id: 'CS-2048', title: 'Water supply interruption', area: 'Brodipet · Ward 12', type: 'Water', severity: 'Critical', time: '8 min ago', status: 'Responding' },
  { id: 'CS-2047', title: 'Junction congestion', area: 'Arundalpet · Ring Road', type: 'Traffic', severity: 'High', time: '21 min ago', status: 'In progress' },
  { id: 'CS-2046', title: 'Elevated particulate levels', area: 'Auto Nagar · Industrial zone', type: 'Air', severity: 'High', time: '34 min ago', status: 'Monitoring' },
  { id: 'CS-2045', title: 'Electricity outage', area: 'Nallapadu · Zone 4', type: 'Power', severity: 'Moderate', time: '1 hr ago', status: 'Investigating' },
  { id: 'CS-2044', title: 'Streetlight not working', area: 'Lakshmipuram · 6th Lane', type: 'Public issue', severity: 'Low', time: '2 hrs ago', status: 'Open' }
]
const metrics = [
  { label: 'Traffic flow', value: '78', unit: '%', delta: '+6.2%', direction: 'up', icon: 'pulse', tone: 'blue', note: 'vs. last hour' },
  { label: 'Water network', value: '96.4', unit: '%', delta: '-0.8%', direction: 'down', icon: 'drops', tone: 'cyan', note: 'network health' },
  { label: 'Power grid', value: '99.1', unit: '%', delta: '+0.3%', direction: 'up', icon: 'bolt', tone: 'amber', note: 'grid uptime' },
  { label: 'Air quality', value: '86', unit: ' AQI', delta: 'Elevated', direction: 'down', icon: 'wind', tone: 'green', note: 'PM2.5 · Auto Nagar' },
  { label: 'Public issues', value: '23', unit: ' open', delta: '5 urgent', direction: 'down', icon: 'building', tone: 'blue', note: 'across 18 wards' }
]
const chartDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function CityMap({ filter, onSelect }) {
  const points = [
    {x:17,y:32,c:'orange',system:'Traffic',label:'Arundalpet junction · Congestion'}, {x:33,y:58,c:'red',system:'Water',label:'Brodipet · Water interruption'}, {x:48,y:40,c:'blue',system:'Infrastructure',label:'City center'},
    {x:63,y:64,c:'orange',system:'Air',label:'Auto Nagar · Elevated PM2.5'}, {x:76,y:30,c:'blue',system:'Power',label:'Nallapadu · Power outage'}, {x:83,y:74,c:'green',system:'Public issue',label:'Lakshmipuram · Public issue'},
    {x:43,y:78,c:'green',system:'Water',label:'Riverside ward'}, {x:58,y:24,c:'orange',system:'Traffic',label:'Market junction · Slow traffic'}
  ]
  return <div className="map-canvas" aria-label="Stylized interactive city map">
    <svg className="map-art" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="800" height="450" fill="#eaf0e9"/>
      <path d="M550-20c-12 56 17 89-8 130s2 79-23 119 5 67-23 114 10 78-15 133h340V-20z" fill="#dcebe9"/>
      <path d="M538-10c-19 76 18 94-3 143-24 56-2 90-31 132-23 35-1 78-31 133" fill="none" stroke="#fff" strokeWidth="13"/>
      <path d="M538-10c-19 76 18 94-3 143-24 56-2 90-31 132-23 35-1 78-31 133" fill="none" stroke="#b7d5d2" strokeWidth="2"/>
      <g fill="#dce7db"><path d="M64 35h132v69H64z"/><path d="M250 27h120v82H250z"/><path d="M601 65h87v70h-87z"/><path d="M58 170h106v97H58z"/><path d="M202 135h127v82H202z"/><path d="M381 38h99v74h-99z"/><path d="M622 184h123v73H622z"/><path d="M81 310h102v67H81z"/><path d="M235 263h94v99h-94z"/><path d="M376 304h113v81H376z"/><path d="M599 314h139v94H599z"/></g>
      <g fill="none" stroke="#fff" strokeWidth="8"><path d="M-10 127H518M-10 235H490M-10 291H472M-10 397H447"/><path d="M30-10v470M185-10v470M347-10v470M495-10v470M724-10v470"/><path d="M116-20 448 470M265-20 550 420"/></g>
      <g fill="none" stroke="#d1dbd0" strokeWidth="1.5"><path d="M-10 127H518M-10 235H490M-10 291H472M-10 397H447"/><path d="M30-10v470M185-10v470M347-10v470M495-10v470M724-10v470"/></g>
      <path d="M67 347c28-34 55-29 77-11 21 17 46 18 70-1" fill="none" stroke="#a9cba9" strokeWidth="10" opacity=".7"/>
    </svg>
    <div className="map-label label-one">ARUNDALETPET</div><div className="map-label label-two">BRODIPET</div><div className="map-label label-three">NALLAPADU</div><div className="map-label label-four">AUTO NAGAR</div>
    {points.filter(p=>filter==='All systems'||p.system===filter).map((p,i)=><button key={i} className={`map-marker ${p.c}`} style={{left:`${p.x}%`,top:`${p.y}%`}} title={p.label} onClick={()=>onSelect(p.label)}><span/></button>)}
    <div className="map-scale"><span></span> High activity</div>
    <button className="map-expand" title="Expand map"><span>+</span><span>-</span></button>
  </div>
}

const gunturCenter = { lat: 16.3067, lon: 80.4365 }
const meters = value => value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`
const duration = value => value < 3600 ? `${Math.max(1, Math.round(value / 60))} min` : `${Math.floor(value / 3600)} hr ${Math.round(value % 3600 / 60)} min`
const safeText = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]))
const haversineMeters = (a, b) => {
  const rad = value => value * Math.PI / 180
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}
const nearestCoordinateIndex = (coordinates, location) => {
  let nearest = 0, distance = Infinity
  coordinates.forEach(([lon, lat], index) => {
    const current = haversineMeters(location, { lat, lon })
    if (current < distance) { distance = current; nearest = index }
  })
  return { index: nearest, distance }
}
const makeRoute = response => {
  const best = response.routes[0]
  const coordinates = best.geometry.coordinates
  const cumulative = [0]
  for (let i = 1; i < coordinates.length; i++) cumulative.push(cumulative[i - 1] + haversineMeters({ lat: coordinates[i - 1][1], lon: coordinates[i - 1][0] }, { lat: coordinates[i][1], lon: coordinates[i][0] }))
  const steps = best.legs.flatMap(leg => leg.steps).filter(step => step.distance > 0).map(step => {
    const maneuver = step.maneuver.location
    const type = step.maneuver.type === 'depart' ? 'Head' : step.maneuver.type === 'arrive' ? 'Arrive' : step.maneuver.type.replaceAll('-', ' ')
    const modifier = step.maneuver.modifier ? ` ${step.maneuver.modifier.replaceAll('-', ' ')}` : ''
    const road = step.name ? ` onto ${step.name}` : ''
    return { instruction: `${type}${modifier}${road}`, distance: step.distance, duration: step.duration, maneuver: { lat: maneuver[1], lon: maneuver[0] }, routeIndex: nearestCoordinateIndex(coordinates, { lat: maneuver[1], lon: maneuver[0] }).index }
  })
  return { geometry: best.geometry, coordinates, cumulative, distance: best.distance, duration: best.duration, steps }
}

function LiveMap({ city, onCityChange, pickLocation = false, onReportLocation, complaints = [] }) {
  const mapElement = useRef(null)
  const mapRef = useRef(null)
  const markerLayer = useRef(null)
  const searchLayer = useRef(null)
  const complaintLayer = useRef(null)
  const routeLayer = useRef(null)
  const userMarker = useRef(null)
  const locationWatch = useRef(null)
  const routeRef = useRef(null)
  const destinationRef = useRef(null)
  const offRouteFixes = useRef(0)
  const rerouteInFlight = useRef(false)
  const lastNearbyRequest = useRef(0)
  const lastGeocodeAt = useRef(0)
  const chooseOnMapRef = useRef(false)
  const reportLocationRef = useRef(onReportLocation)
  const cityResolvedFromGps = useRef(false)
  const [mapInstance, setMapInstance] = useState(null)
  const [center, setCenter] = useState(gunturCenter)
  const [cityQuery, setCityQuery] = useState(city)
  const [cityResults, setCityResults] = useState([])
  const [places, setPlaces] = useState([])
  const [category, setCategory] = useState('All places')
  const [placeQuery, setPlaceQuery] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [tracking, setTracking] = useState(false)
  const [destination, setDestination] = useState(null)
  const [route, setRoute] = useState(null)
  const [navigationActive, setNavigationActive] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [distanceToTurn, setDistanceToTurn] = useState(0)
  const [remainingDistance, setRemainingDistance] = useState(0)
  const [remainingDuration, setRemainingDuration] = useState(0)
  const [rerouting, setRerouting] = useState(false)
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [status, setStatus] = useState('Choose a city, find your location, then select a destination.')
  const [error, setError] = useState('')
  const [chooseOnMap, setChooseOnMap] = useState(false)
  chooseOnMapRef.current = chooseOnMap
  reportLocationRef.current = onReportLocation
  routeRef.current = route
  destinationRef.current = destination

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return
    const map = L.map(mapElement.current, { zoomControl: true }).setView([gunturCenter.lat, gunturCenter.lon], 13)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
    }).addTo(map)
    L.control.scale({ imperial: false }).addTo(map)
    markerLayer.current = L.layerGroup().addTo(map)
    searchLayer.current = L.layerGroup().addTo(map)
    complaintLayer.current = L.layerGroup().addTo(map)
    map.on('click', event => {
      if (!chooseOnMapRef.current) return
      setDestination({ name: 'Pinned destination', lat: event.latlng.lat, lon: event.latlng.lng, category: 'Destination' })
      destinationRef.current = { name: 'Pinned destination', lat: event.latlng.lat, lon: event.latlng.lng, category: 'Destination' }
      reportLocationRef.current?.({ lat: event.latlng.lat, lon: event.latlng.lng })
      setRoute(null); routeRef.current = null
      setChooseOnMap(false)
      setError('')
      setStatus('Destination pinned. Select Get directions to calculate a route.')
    })
    mapRef.current = map
    setMapInstance(map)
    return () => { if (locationWatch.current !== null) navigator.geolocation?.clearWatch(locationWatch.current); map.remove(); mapRef.current = null; markerLayer.current = null; searchLayer.current = null; complaintLayer.current = null }
  }, [])

  useEffect(() => {
    if (!mapInstance || !complaintLayer.current) return
    complaintLayer.current.clearLayers()
    complaints.filter(item => item.location && Number.isFinite(Number(item.location.lat)) && Number.isFinite(Number(item.location.lon))).forEach(item => {
      const label = document.createElement('span')
      label.textContent = `${item.department} · ${item.title} · ${item.status}`
      L.circleMarker([item.location.lat, item.location.lon], { radius: 8, color: '#fff', weight: 2, fillColor: '#d96d59', fillOpacity: .9 }).bindTooltip(label).addTo(complaintLayer.current)
    })
  }, [mapInstance, complaints])

  useEffect(() => {
    if (!pickLocation || !mapInstance) return
    setChooseOnMap(true)
    setStatus('Click the map to pin your complaint location.')
    document.getElementById('city-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [pickLocation, mapInstance])

  useEffect(() => { if (mapInstance) mapInstance.setView([center.lat, center.lon], center.zoom || 13) }, [mapInstance, center])
  useEffect(() => { if (city && city !== cityQuery) setCityQuery(city) }, [city])

  const loadNearby = async (point, cityName = city) => {
    lastNearbyRequest.current = Date.now()
    setLoadingPlaces(true)
    setError('')
    try {
      const response = await fetch(`/api/map/places?lat=${point.lat}&lon=${point.lon}&city=${encodeURIComponent(cityName)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Nearby places are temporarily unavailable.')
      const found = (data.elements || []).map(item => {
        const lat = item.lat ?? item.center?.lat
        const lon = item.lon ?? item.center?.lon
        const tags = item.tags || {}
        const kind = tags.amenity ? 'Restaurant' : tags.shop === 'mall' ? 'Mall' : 'Shopping'
        return { id: `${item.type}-${item.id}`, name: tags.name || tags['name:en'] || kind, lat, lon, category: kind }
      }).filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lon))
      found.sort((a, b) => (a.lat - point.lat) ** 2 + (a.lon - point.lon) ** 2 - ((b.lat - point.lat) ** 2 + (b.lon - point.lon) ** 2))
      setPlaces(found)
      setStatus(`Found ${found.length} nearby places. Select one for directions.`)
    } catch (e) {
      setPlaces([])
      setError(`${e.message} Try refreshing in a moment.`)
    } finally { setLoadingPlaces(false) }
  }

  useEffect(() => { if (mapInstance) loadNearby(center, city) }, [mapInstance, city])

  const visiblePlaces = useMemo(() => places.filter(place => {
    const matchesCategory = category === 'All places' || (category === 'Restaurants' ? place.category === 'Restaurant' : ['Mall', 'Shopping'].includes(place.category))
    return matchesCategory && place.name.toLowerCase().includes(placeQuery.toLowerCase())
  }), [places, category, placeQuery])

  useEffect(() => {
    if (!mapInstance || !markerLayer.current) return
    markerLayer.current.clearLayers()
    visiblePlaces.forEach(place => {
      const marker = L.circleMarker([place.lat, place.lon], { radius: 7, color: '#fff', weight: 2, fillColor: place.category === 'Restaurant' ? '#e68c58' : '#7184d9', fillOpacity: 1 })
      const label = document.createElement('span')
      label.textContent = `${place.category}: ${place.name}`
      marker.bindTooltip(label).on('click', () => { setDestination(place); destinationRef.current = place; setRoute(null); routeRef.current = null; setError(''); setStatus(`${place.name} selected. Get directions from your location.`) })
      marker.addTo(markerLayer.current)
    })
    if (destination) {
      const pinLabel = document.createElement('span')
      pinLabel.textContent = destination.name
      L.circleMarker([destination.lat, destination.lon], { radius: 9, color: '#fff', weight: 3, fillColor: '#dc6756', fillOpacity: 1 }).addTo(markerLayer.current).bindTooltip(pinLabel)
    }
  }, [mapInstance, visiblePlaces, destination])

  useEffect(() => {
    if (!mapInstance || !searchLayer.current) return
    searchLayer.current.clearLayers()
    const results = cityResults.filter(result => Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon)))
    const pins = results.map((result, index) => {
      const marker = L.circleMarker([Number(result.lat), Number(result.lon)], { radius: 10, color: '#fff', weight: 3, fillColor: '#7958c7', fillOpacity: .95 })
      const label = document.createElement('span')
      label.textContent = result.name || result.display_name?.split(',')[0] || `Search result ${index + 1}`
      marker.bindTooltip(label).on('click', () => selectCity(result)).addTo(searchLayer.current)
      return marker
    })
    if (pins.length > 1) mapInstance.fitBounds(L.featureGroup(pins).getBounds(), { padding: [32, 32], maxZoom: 13 })
  }, [mapInstance, cityResults])

  useEffect(() => {
    if (!mapInstance || !userLocation) return
    if (!userMarker.current) userMarker.current = L.circleMarker([userLocation.lat, userLocation.lon], { radius: 9, color: '#fff', weight: 3, fillColor: '#3978df', fillOpacity: 1 }).addTo(mapInstance).bindTooltip('Your location')
    else userMarker.current.setLatLng([userLocation.lat, userLocation.lon])
  }, [mapInstance, userLocation])

  useEffect(() => {
    if (!mapInstance) return
    if (routeLayer.current) { routeLayer.current.remove(); routeLayer.current = null }
    if (!route?.geometry) return
    const casing = L.geoJSON(route.geometry, { style: { color: '#ffffff', weight: 11, opacity: .96, lineCap: 'round', lineJoin: 'round' } })
    const line = L.geoJSON(route.geometry, { style: { color: '#1877e8', weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' } })
    routeLayer.current = L.featureGroup([casing, line]).addTo(mapInstance)
    mapInstance.fitBounds(routeLayer.current.getBounds(), { padding: [35, 35] })
  }, [mapInstance, route])

  const searchCity = async event => {
    event.preventDefault()
    if (!cityQuery.trim()) return
    setError('')
    setCityResults([])
    setStatus(`Searching for ${cityQuery.trim()}...`)
    try {
      const wait = Math.max(0, 1000 - (Date.now() - lastGeocodeAt.current))
      if (wait) await new Promise(resolve => setTimeout(resolve, wait))
      lastGeocodeAt.current = Date.now()
      const indiaQuery = /\bindia\b/i.test(cityQuery) ? cityQuery.trim() : `${cityQuery.trim()}, India`
      const response = await fetch(`/api/map/geocode?q=${encodeURIComponent(indiaQuery)}`)
      if (!response.ok) throw new Error('City search is temporarily unavailable.')
      const results = await response.json()
      if (!results.length) throw new Error('No matching city or area found.')
      setCityResults(results)
      setStatus('Choose the matching city or area from the results.')
    } catch (e) { setError(e.message) }
  }

  const selectCity = result => {
    if (navigationActive) stopNavigation()
    const address = result.address || {}
    const nextCity = address.city || address.town || address.municipality || address.village || result.name || result.display_name.split(',')[0]
    const point = { lat: Number(result.lat), lon: Number(result.lon), zoom: Number(result.type === 'city' || result.type === 'administrative' ? 12 : 14) }
    onCityChange(nextCity)
    setCityQuery(nextCity)
    setCenter(point)
    setCityResults([])
    setDestination(null); destinationRef.current = null
    setRoute(null); routeRef.current = null
    setStatus(`Showing ${nextCity}, India. Loading nearby restaurants and malls...`)
    loadNearby(point, nextCity)
  }

  const resolveCityFromLocation = async point => {
    try {
      const response = await fetch(`/api/map/reverse?lat=${point.lat}&lon=${point.lon}`)
      if (!response.ok) throw new Error('Location city lookup failed.')
      const result = await response.json()
      const address = result.address || {}
      const nextCity = address.city || address.town || address.municipality || address.village || address.county
      if (nextCity) {
        onCityChange(nextCity)
        setCityQuery(nextCity)
        setStatus(`Your location is in ${nextCity}, India. Showing nearby places.`)
        loadNearby(point, nextCity)
      } else {
        setStatus('Location found in India. Showing nearby places.')
        loadNearby(point, city)
      }
    } catch {
      setStatus(`Location found. Keeping ${city} while city lookup is unavailable.`)
      loadNearby(point, city)
    }
  }

  const findMyLocation = () => {
    setError('')
    if (!navigator.geolocation) { setError('Location services are not available in this browser.'); return }
    if (locationWatch.current !== null) {
      navigator.geolocation.clearWatch(locationWatch.current)
      locationWatch.current = null
      setTracking(false)
      setNavigationActive(false)
      setStatus('Live location tracking paused.')
      return
    }
    setStatus('Requesting your location...')
    cityResolvedFromGps.current = false
    locationWatch.current = navigator.geolocation.watchPosition(position => {
      const point = { lat: position.coords.latitude, lon: position.coords.longitude, zoom: 15 }
      setUserLocation(point)
      setCenter(point)
      setTracking(true)
      if (!cityResolvedFromGps.current) {
        cityResolvedFromGps.current = true
        setStatus('Live location found. Identifying your city in India...')
        resolveCityFromLocation(point)
      } else if (Date.now() - lastNearbyRequest.current > 60000) loadNearby(point, city)
    }, () => { if (locationWatch.current !== null) navigator.geolocation.clearWatch(locationWatch.current); locationWatch.current = null; setTracking(false); setError('Location permission was denied or unavailable. Allow location access and try again.') }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 })
  }

  const requestDrivingRoute = async (start, end) => {
    const response = await fetch('/api/map/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start, end }) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Route service is temporarily unavailable.')
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No driving route was found for these locations.')
    return makeRoute(data)
  }

  const startNavigation = () => {
    if (!routeRef.current || !destinationRef.current) return
    if (!navigator.geolocation) { setError('Live navigation requires location services in this browser.'); return }
    if (locationWatch.current !== null) navigator.geolocation.clearWatch(locationWatch.current)
    offRouteFixes.current = 0
    setError(''); setNavigationActive(true); setTracking(true); setStatus('Starting live navigation...')
    if (userLocation) mapRef.current?.setView([userLocation.lat, userLocation.lon], 17)
    locationWatch.current = navigator.geolocation.watchPosition(position => {
      const point = { lat: position.coords.latitude, lon: position.coords.longitude }
      setUserLocation(point)
      const map = mapRef.current
      if (map) map.panTo([point.lat, point.lon], { animate: true, duration: .4 })
      const currentRoute = routeRef.current
      if (!currentRoute?.coordinates?.length) return
      const nearest = nearestCoordinateIndex(currentRoute.coordinates, point)
      const travelled = currentRoute.cumulative[nearest.index] || 0
      const remaining = Math.max(0, currentRoute.distance - travelled)
      setRemainingDistance(remaining)
      setRemainingDuration(currentRoute.distance ? currentRoute.duration * remaining / currentRoute.distance : 0)
      let next = currentRoute.steps.findIndex(step => step.routeIndex > nearest.index + 2)
      if (next < 0) next = Math.max(0, currentRoute.steps.length - 1)
      setActiveStep(next)
      if (currentRoute.steps[next]) setDistanceToTurn(haversineMeters(point, currentRoute.steps[next].maneuver))
      const target = destinationRef.current
      if (target && haversineMeters(point, target) < 35) {
        navigator.geolocation.clearWatch(locationWatch.current)
        locationWatch.current = null; setNavigationActive(false); setTracking(false); setStatus(`You have arrived at ${target.name}.`)
        return
      }
      if (nearest.distance > 90) offRouteFixes.current++
      else offRouteFixes.current = 0
      if (offRouteFixes.current >= 3 && !rerouteInFlight.current && target) {
        rerouteInFlight.current = true; setRerouting(true); setStatus('You are off route. Finding a new route...')
        requestDrivingRoute(point, target).then(updated => {
          routeRef.current = updated; setRoute(updated); setRemainingDistance(updated.distance); setRemainingDuration(updated.duration); setActiveStep(0); offRouteFixes.current = 0; setStatus('Route updated. Continue following the new directions.')
        }).catch(error => setError(`Could not reroute: ${error.message}`)).finally(() => { rerouteInFlight.current = false; setRerouting(false) })
      }
    }, () => {
      if (locationWatch.current !== null) navigator.geolocation.clearWatch(locationWatch.current)
      locationWatch.current = null; setNavigationActive(false); setTracking(false)
      setError('Live location was lost. Allow location access and start navigation again.')
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 })
  }

  const stopNavigation = () => {
    if (locationWatch.current !== null) navigator.geolocation?.clearWatch(locationWatch.current)
    locationWatch.current = null; setNavigationActive(false); setTracking(false); setRerouting(false)
    setStatus('Navigation stopped. Your route is still available.')
  }

  const getDirections = async () => {
    if (!destination) { setError('Select a restaurant, mall, or map point as your destination.'); return }
    if (!navigator.geolocation) { setError('Location access is unavailable. Enter your location or allow browser location access to get directions.'); return }
    setLoadingRoute(true)
    setError('')
    setStatus('Calculating the driving route...')
    try {
      const start = userLocation || await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(position => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }), () => reject(new Error('Allow location access, or use the location button, to start navigation.')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }))
      setUserLocation(start)
      const updated = await requestDrivingRoute(start, destination)
      routeRef.current = updated
      setRoute(updated); setNavigationActive(false); setActiveStep(0)
      setRemainingDistance(updated.distance); setRemainingDuration(updated.duration)
      setStatus(`Route ready: ${meters(updated.distance)} · about ${duration(updated.duration)}. Start navigation to follow your location.`)
    } catch (e) { setError(e.message) }
    finally { setLoadingRoute(false) }
  }

  const downloadRoute = async () => {
    if (!route?.coordinates?.length) return
    setError('')
    setStatus('Preparing a full route map image...')
    const width = 1600
    const height = 1120
    const headerHeight = 150
    const footerHeight = 48
    const mapHeight = height - headerHeight - footerHeight
    const project = (lon, lat, zoom) => {
      const world = 256 * (2 ** zoom)
      const sin = Math.sin(Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180)
      return { x: (lon + 180) / 360 * world, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world }
    }
    let zoom = 18
    let projected = route.coordinates.map(([lon, lat]) => project(lon, lat, zoom))
    while (zoom > 2) {
      const bounds = projected.reduce((box, point) => ({ minX: Math.min(box.minX, point.x), maxX: Math.max(box.maxX, point.x), minY: Math.min(box.minY, point.y), maxY: Math.max(box.maxY, point.y) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
      if (bounds.maxX - bounds.minX < width * 0.78 && bounds.maxY - bounds.minY < mapHeight * 0.78) break
      zoom -= 1
      projected = route.coordinates.map(([lon, lat]) => project(lon, lat, zoom))
    }
    const bounds = projected.reduce((box, point) => ({ minX: Math.min(box.minX, point.x), maxX: Math.max(box.maxX, point.x), minY: Math.min(box.minY, point.y), maxY: Math.max(box.maxY, point.y) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    context.fillStyle = '#f3f6f2'
    context.fillRect(0, 0, width, height)
    context.fillStyle = '#174c3a'
    context.fillRect(0, 0, width, headerHeight)
    context.fillStyle = '#a8d5a9'
    context.font = '600 18px Arial, sans-serif'
    context.fillText(`${city.toUpperCase()} · CIVICCONNECT ROUTE MAP`, 56, 46)
    context.fillStyle = '#ffffff'
    context.font = '700 38px Arial, sans-serif'
    context.fillText(destination?.name || 'Route destination', 56, 98, width - 112)
    context.fillStyle = '#d7e8df'
    context.font = '20px Arial, sans-serif'
    context.fillText(`${meters(route.distance)} · about ${duration(route.duration)} · ${navigationActive ? 'Live route' : 'Driving route'}`, 56, 132)
    context.save()
    context.beginPath()
    context.rect(0, headerHeight, width, mapHeight)
    context.clip()
    const mapCenterX = width / 2
    const mapCenterY = headerHeight + mapHeight / 2
    const left = centerX - width / 2
    const top = centerY - mapHeight / 2
    const tileX0 = Math.floor(left / 256)
    const tileY0 = Math.floor(top / 256)
    const tileX1 = Math.floor((left + width) / 256)
    const tileY1 = Math.floor((top + mapHeight) / 256)
    const tileJobs = []
    for (let tileY = tileY0; tileY <= tileY1; tileY += 1) {
      for (let tileX = tileX0; tileX <= tileX1; tileX += 1) {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        const tileCount = 2 ** zoom
        tileJobs.push(new Promise(resolve => {
          image.onload = () => resolve({ image, x: mapCenterX + tileX * 256 - centerX, y: mapCenterY + tileY * 256 - centerY })
          image.onerror = () => resolve(null)
          image.src = `https://tile.openstreetmap.org/${zoom}/${((tileX % tileCount) + tileCount) % tileCount}/${Math.max(0, Math.min(tileCount - 1, tileY))}.png`
        }))
      }
    }
    const tiles = await Promise.all(tileJobs)
    let drawnTiles = 0
    tiles.forEach(tile => {
      if (!tile) return
      try { context.drawImage(tile.image, tile.x, tile.y, 256, 256); drawnTiles += 1 } catch { /* keep the background if a map tile cannot be drawn */ }
    })
    const points = projected.map(point => ({ x: mapCenterX + point.x - centerX, y: mapCenterY + point.y - centerY }))
    context.beginPath()
    points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y))
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#ffffff'
    context.lineWidth = 18
    context.stroke()
    context.strokeStyle = '#1877e8'
    context.lineWidth = 11
    context.stroke()
    const paintMarker = (point, color) => {
      context.beginPath()
      context.arc(point.x, point.y, 15, 0, Math.PI * 2)
      context.fillStyle = color
      context.fill()
      context.lineWidth = 5
      context.strokeStyle = '#fff'
      context.stroke()
    }
    if (points.length) {
      paintMarker(points[0], '#209676')
      paintMarker(points[points.length - 1], '#e46b58')
    }
    context.restore()
    context.fillStyle = '#53645a'
    context.font = '16px Arial, sans-serif'
    context.fillText(`● Start     ● Destination     Map data © OpenStreetMap contributors · Zoom ${zoom}`, 34, height - 19)
    if (!drawnTiles) setStatus('The route fits the image, but map tiles did not load. Check your connection and retry.')
    canvas.toBlob(blob => {
      if (!blob) {
        setError('Could not create the map image. Please retry after the map tiles load.')
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-full-route-map.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
      setStatus(`Full route map downloaded as a PNG image${drawnTiles ? '.' : ' with the route highlighted.'}`)
    }, 'image/png')
  }

  return <div className="live-map-content">
    <div className="panel-heading live-map-heading"><div><h2>City map & live navigation</h2><p>Plan a road route, then follow live GPS guidance</p></div><span className="map-live-pill"><i/>OpenStreetMap</span></div>
    <div className="city-search-row"><form onSubmit={searchCity} className="city-search-form"><Icon name="search" size={16}/><input id="city-search-input" aria-label="Search an Indian city" value={cityQuery} onChange={event => setCityQuery(event.target.value)} placeholder="Search a city in India"/><button type="submit">Find city</button></form><button className={`location-button ${tracking?'tracking':''}`} onClick={findMyLocation}>{navigationActive?'Stop navigation':tracking?'Stop live location':'◎ Detect my city'}</button></div>
    {cityResults.length>0&&<div className="city-results">{cityResults.map((result,index)=><button key={`${result.place_id}-${index}`} onClick={()=>selectCity(result)}><strong>{result.name||result.display_name.split(',')[0]}</strong><span>{result.display_name}</span></button>)}</div>}
    <div className="live-map-toolbar"><div className="map-tabs">{['All places','Restaurants','Malls'].map(item=><button key={item} className={category===item?'selected':''} onClick={()=>setCategory(item)}>{item}</button>)}</div><button className="subtle-button" disabled={loadingPlaces} onClick={()=>loadNearby(center)}>{loadingPlaces?'Searching...':'Refresh nearby'}</button></div>
    <div className="live-map-layout"><div className="live-map-frame"><div className="leaflet-map" ref={mapElement} aria-label="Interactive city map with restaurants, malls and route navigation"/><div className="map-attribution-note">Map tiles and places © OpenStreetMap contributors</div></div>
      <aside className="places-panel"><div className="places-panel-head"><div><strong>{route?'Route directions':'Nearby places'}</strong><span>{route?`${meters(navigationActive?remainingDistance:route.distance)} · ${duration(navigationActive?remainingDuration:route.duration)}${navigationActive?' remaining':''}`:`${visiblePlaces.length} results near ${city}`}</span></div>{route&&<button onClick={()=>{stopNavigation();setRoute(null);routeRef.current=null}}>Places</button>}</div>
        {route?<><div className={`navigation-card ${navigationActive?'active':''}`}><div className="navigation-card-top"><span><i className={navigationActive?'live-dot':''}/>{navigationActive?(rerouting?'REROUTING':'LIVE NAVIGATION'):'ROUTE PREVIEW'}</span><strong>{navigationActive?`${meters(remainingDistance)} · ${duration(remainingDuration)} left`:`${meters(route.distance)} · about ${duration(route.duration)}`}</strong></div>{navigationActive&&route.steps[activeStep]&&<div className="navigation-next"><span className="turn-arrow">↱</span><div><strong>{route.steps[activeStep].instruction}</strong><small>{meters(distanceToTurn)} to next turn</small></div></div>}<button className="primary-button" onClick={navigationActive?stopNavigation:startNavigation}>{navigationActive?'Stop navigation':'▶ Start live navigation'}</button></div><div className="route-endpoints"><span className="start-dot"/>Your location<Icon name="chevron" size={13}/><b>{destination?.name}</b></div><div className="route-steps">{route.steps.map((step,index)=><div className={`route-step ${navigationActive&&index===activeStep?'current':''}`} key={`${index}-${step.instruction}`}><span>{index+1}</span><div><strong>{step.instruction}</strong><small>{meters(step.distance)}</small></div></div>)}</div><div className="route-export-actions"><a className="google-maps-link" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${destination?.lat},${destination?.lon}`)}&travelmode=driving&dir_action=navigate`} target="_blank" rel="noreferrer">Open in Google Maps ↗</a><button className="download-route-button" onClick={downloadRoute}>Download full route map (PNG)</button></div><small className="route-export-note">The image frames the complete route and surrounding streets.</small></>:<><label className="place-search"><Icon name="search" size={14}/><input value={placeQuery} onChange={event=>setPlaceQuery(event.target.value)} placeholder="Filter restaurants or malls"/></label><div className="place-list">{loadingPlaces&&<div className="places-message">Finding places around the map...</div>}{!loadingPlaces&&visiblePlaces.map(place=><button className={`place-row ${destination?.id===place.id?'selected':''}`} key={place.id} onClick={()=>{setDestination(place);destinationRef.current=place;setRoute(null);routeRef.current=null;setError('');setStatus(`${place.name} selected. Get directions from your location.`)}}><span className={`place-icon ${place.category==='Restaurant'?'food':'mall'}`}>{place.category==='Restaurant'?'R':'M'}</span><span className="place-name"><strong>{place.name}</strong><small>{place.category}</small></span><Icon name="chevron" size={14}/></button>)}{!loadingPlaces&&!visiblePlaces.length&&<div className="places-message">No matching places here yet. Search another city or refresh nearby.</div>}</div>{destination&&<div className="destination-card"><span>DESTINATION</span><strong>{destination.name}</strong><small>{destination.category}</small><button className="primary-button" disabled={loadingRoute} onClick={getDirections}>{loadingRoute?'Finding route...':'Get directions'}</button></div>}</>}
      </aside></div>
    <div className={`map-status ${error?'has-error':''}`} role="status">{error||status}</div>
    {route&&<div className="route-download-mobile"><button className="download-route-button" onClick={downloadRoute}>Download full route map (PNG)</button></div>}
  </div>
}

function App() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [filter, setFilter] = useState('All systems')
  const [incidents, setIncidents] = useState(demoIncidents)
  const [liveMetrics, setLiveMetrics] = useState(metrics)
  const [apiState, setApiState] = useState('connecting')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({title:'',area:'',type:'Traffic',severity:'Moderate'})
  const [clock, setClock] = useState(new Date())
  const [city, setCity] = useState('Guntur')
  const [recommendations, setRecommendations] = useState(['Dispatch traffic team to Arundalpet junction', 'Send water crew to Brodipet Ward 12', 'Inspect air quality sensors around Auto Nagar'])

  useEffect(()=>{const t=setInterval(()=>setClock(new Date()),60000); return ()=>clearInterval(t)},[])
  useEffect(()=>{if(city!=='Guntur')setRecommendations([])},[city])
  useEffect(()=>{const refresh=async()=>{try{const [ir,hr,mr]=await Promise.all([fetch(`/api/incidents?city=${encodeURIComponent(city)}`),fetch('/api/health'),fetch(`/api/readings?city=${encodeURIComponent(city)}`)]);if(!ir.ok||!hr.ok||!mr.ok)throw Error();const data=await ir.json();const health=await hr.json();const readings=await mr.json();if(Array.isArray(data))setIncidents(data);if(Array.isArray(readings))setLiveMetrics(current=>current.map(metric=>{const system=metric.label==='Traffic flow'?'Traffic':metric.label==='Water network'?'Water':metric.label==='Power grid'?'Power':metric.label==='Air quality'?'Air':null;const reading=readings.find(item=>item.system===system);return !system?(city==='Guntur'?metric:{...metric,value:String(data.length),unit:' open',delta:'City reports',direction:'good',note:`reported for ${city}`}):reading?{...metric,value:String(reading.value),unit:reading.unit==='%'?'%':` ${reading.unit}`,note:reading.location,delta:reading.severity==='Normal'?'Normal':reading.severity,direction:reading.severity==='Normal'?'good':'down'}:(city==='Guntur'?metric:{...metric,value:'-',unit:'',delta:'No feed',direction:'good',note:`No sensor feed for ${city}`})}));setApiState(health.database==='connected'?'live':'demo')}catch{setApiState('demo')}};refresh();const timer=setInterval(refresh,30000);return()=>clearInterval(timer)},[city])
  const visibleIncidents = useMemo(()=>incidents.filter(i=>`${i.title} ${i.area} ${i.type} ${i.severity}`.toLowerCase().includes(query.toLowerCase())).slice(0,showAll?20:4),[incidents,query,showAll])
  const addIncident = async e => { e.preventDefault(); const item={...form,city,id:`CS-${Math.floor(2050+Math.random()*800)}`,time:'Just now',status:'Investigating'}; try {const r=await fetch('/api/incidents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)}); if(r.ok){const saved=await r.json();setIncidents(a=>[saved,...a])}else throw Error()}catch{setIncidents(a=>[item,...a])};setModal(false);setForm({title:'',area:'',type:'Traffic',severity:'Moderate'});setNotice('Incident logged successfully');setTimeout(()=>setNotice(''),3000)}
  const nav = [{name:'Overview',icon:'grid'}, {name:'City map',icon:'map'}, {name:'Live systems',icon:'pulse'}, {name:'Water network',icon:'drops'}, {name:'Power grid',icon:'bolt'}, {name:'Air quality',icon:'wind'}, {name:'Infrastructure',icon:'building'}]
  const updateIncidentStatus = async incident => { const status=incident.status==='Resolved'?'Open':'Resolved'; try { await fetch(`/api/incidents/${incident.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})}) } catch {} setIncidents(rows=>rows.map(row=>row.id===incident.id?{...row,status}:row)); setNotice(`${incident.title} marked ${status.toLowerCase()}`) }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span/><span/><span/><span/></div><span>city<span className="brand-light">sync</span></span></div>
      <div className="workspace"><div className="workspace-icon">{city.slice(0,1).toUpperCase()}</div><div className="workspace-copy"><strong>{city}</strong><span>City operations</span></div><Icon name="chevron" size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(n=><button key={n.name} className={`nav-item ${activeNav===n.name?'active':''}`} onClick={()=>{setActiveNav(n.name); if(n.name==='City map')document.getElementById('map-panel')?.scrollIntoView({behavior:'smooth'})}}><Icon name={n.icon}/><span>{n.name}</span>{n.name==='Live systems'&&<i className="nav-live"/>}</button>)}</nav>
      <div className="nav-label tools-label">MANAGE</div>
      <button className="nav-item" onClick={()=>setNotice('Settings are coming soon')}><Icon name="settings"/><span>Settings</span></button>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-orb">?</div><strong>Need a hand?</strong><span>Visit the help center<br/>for tips and guides.</span><button onClick={()=>setNotice('Help center opened')}>Open help center <Icon name="arrow" size={13}/></button></div><div className="profile"><div className="avatar">AM</div><div className="profile-copy"><strong>Alex Morgan</strong><span>City administrator</span></div><Icon name="more" size={19}/></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">{city} <Icon name="chevron" size={14}/><strong>{activeNav}</strong></div><div className="top-actions"><span className="date-label">{clock.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span><label className="search"><Icon name="search" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search incidents..."/><kbd>Ctrl K</kbd></label><button className="icon-button notification" aria-label="Notifications" onClick={()=>setNotice('You’re all caught up')}><Icon name="bell"/><i/></button><div className="top-avatar">AM</div></div></header>
      <div className="content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> CITY DIGITAL TWIN - LIVE OVERVIEW</div><h1>{city} operations</h1><p>Here’s what’s happening across {city} today.</p></div><div className="welcome-actions"><span className={`connection ${apiState==='live'?'connected':''}`}><i/>{apiState==='live'?'API connected':'Demo data'}</span><button className="primary-button" onClick={()=>setModal(true)}><Icon name="plus" size={16}/> Log an issue</button></div></section>
        <section className="metrics-grid">{liveMetrics.map(m=><article className="metric-card" key={m.label}><div className="metric-top"><span>{m.label}</span><span className={`metric-icon ${m.tone}`}><Icon name={m.icon} size={17}/></span></div><div className="metric-value">{m.value}<small>{m.unit}</small></div><div className="metric-bottom"><span className={`delta ${m.direction}`}>{m.direction==='up'?'+':m.direction==='down'?'-':'.'} {m.delta}</span><span>{m.note}</span></div><div className={`metric-spark ${m.tone}`}><svg viewBox="0 0 130 32" preserveAspectRatio="none"><path d={m.tone==='amber'?'M0 25 C14 20 17 23 28 15S44 21 53 13 70 18 82 9 98 14 109 6 120 10 130 3':m.tone==='cyan'?'M0 6 C15 8 14 16 27 12S40 15 51 13 62 25 75 18 91 22 101 20 118 29 130 25':'M0 22 C12 17 17 19 26 11S41 20 53 14 65 11 76 16 90 5 102 11 116 6 130 4'}/></svg></div></article>)}</section>
        <section className="middle-grid">
          <article className="panel live-map-panel" id="map-panel"><LiveMap city={city} onCityChange={setCity}/></article>
          <article className="panel chart-panel"><div className="panel-heading"><div><h2>City activity</h2><p>System activity this week</p></div><button className="period-button" onClick={()=>setNotice('Showing the last 7 days')}>This week <span>v</span></button></div><div className="chart-legend"><span><i className="legend-blue"/>Traffic</span><span><i className="legend-teal"/>Utilities</span></div><div className="chart"><div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-plot"><div className="chart-lines"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 420 184" preserveAspectRatio="none" className="chart-svg"><defs><linearGradient id="fillBlue" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#5877df" stopOpacity=".16"/><stop offset="1" stopColor="#5877df" stopOpacity="0"/></linearGradient><linearGradient id="fillTeal" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#55bbaa" stopOpacity=".1"/><stop offset="1" stopColor="#55bbaa" stopOpacity="0"/></linearGradient></defs><path d="M0 112 C23 102 34 105 60 86 S101 80 120 92 153 78 180 69 216 82 240 64 274 51 300 64 328 47 360 38 391 45 420 22 L420 184 L0 184z" fill="url(#fillBlue)"/><path d="M0 136 C25 130 39 145 60 128 S100 127 120 119 154 131 180 112 214 124 240 103 278 115 300 96 330 105 360 84 395 96 420 72 L420 184 L0 184z" fill="url(#fillTeal)"/><path d="M0 112 C23 102 34 105 60 86 S101 80 120 92 153 78 180 69 216 82 240 64 274 51 300 64 328 47 360 38 391 45 420 22" fill="none" stroke="#607cde" strokeWidth="2.5"/><path d="M0 136 C25 130 39 145 60 128 S100 127 120 119 154 131 180 112 214 124 240 103 278 115 300 96 330 105 360 84 395 96 420 72" fill="none" stroke="#65bdad" strokeWidth="2.5"/></svg><div className="chart-x">{chartDays.map(d=><span key={d}>{d}</span>)}</div></div></div><div className="chart-foot"><span><i className="chart-check">OK</i>Illustrative city activity profile</span><span>Peak activity <b>Thu, 2:40 PM</b></span></div></article>
        </section>
        <section className="panel recommendations-panel"><div className="panel-heading"><div><h2>Recommended actions</h2><p>Priority responses based on active city alerts</p></div><span className="ai-badge">AI ASSIST</span></div><div className="recommendation-list">{recommendations.map((item,index)=><div className="recommendation" key={item}><span className={`recommendation-icon rec-${index}`}>{index===0?'A':index===1?'W':'P'}</span><div className="recommendation-copy"><strong>{item}</strong><span>{index===0?'High priority - Traffic incident':index===1?'Critical - Water interruption':'Monitor - Air quality'}</span></div><button onClick={()=>{setRecommendations(rows=>rows.filter(row=>row!==item));setNotice('Action acknowledged')}}>Acknowledge</button></div>)}</div></section>        <section className="panel incidents-panel"><div className="panel-heading incident-heading"><div><h2>Recent incidents <span className="count-pill">{incidents.length}</span></h2><p>Stay on top of what needs attention</p></div><button className="subtle-button" onClick={()=>setShowAll(!showAll)}>{showAll?'Show less':'View all incidents'} <Icon name="arrow" size={14}/></button></div><div className="table-wrap"><table><thead><tr><th>INCIDENT</th><th>LOCATION</th><th>TYPE</th><th>SEVERITY</th><th>REPORTED</th><th>STATUS</th><th></th></tr></thead><tbody>{visibleIncidents.map((incident,i)=><tr key={incident._id||incident.id||i}><td><div className="incident-title"><span className={`incident-symbol ${incident.type?.toLowerCase()||'traffic'}`}>{incident.type==='Water'?'W':incident.type==='Power'?'P':incident.type==='Air'?'A':incident.type==='Public issue'?'!':'T'}</span><div><strong>{incident.title}</strong><small>{incident.id||`CS-${2048-i}`}</small></div></div></td><td className="area-cell">{incident.area}</td><td><span className="type-tag">{incident.type}</span></td><td><span className={`severity ${incident.severity?.toLowerCase()}` }><i/>{incident.severity}</span></td><td className="time-cell"><Icon name="clock" size={14}/>{incident.time}</td><td><span className={`status ${incident.status?.toLowerCase().replaceAll(' ','-')}`}>{incident.status}</span></td><td><button className="row-more" onClick={()=>updateIncidentStatus(incident)} aria-label="Toggle incident resolved status" title="Mark resolved or reopen"><Icon name="more" size={18}/></button></td></tr>)}</tbody></table>{visibleIncidents.length===0&&<div className="empty-state">No incidents match “{query}”.</div>}</div></section>
        <footer className="footer"><span>© 2026 CitySync Technologies</span><div><span className="footer-live"><i/>All systems operational</span><span>Last synced {clock.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</span><button onClick={()=>setNotice('CitySync status: All systems operational')}>System status <Icon name="arrow" size={12}/></button></div></footer>
      </div>
    </main>
    {notice&&<div className="toast" role="status"><span>OK</span>{notice}<button onClick={()=>setNotice('')}>×</button></div>}
    {modal&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="incident-modal" onSubmit={addIncident}><div className="modal-head"><div><span className="eyebrow">CITY OPERATIONS</span><h2>Log an issue</h2></div><button type="button" onClick={()=>setModal(false)}>×</button></div><label>Incident title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Streetlight outage"/></label><label>Location<input required value={form.area} onChange={e=>setForm({...form,area:e.target.value})} placeholder="District · Street or landmark"/></label><div className="form-row"><label>System<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Traffic</option><option>Water</option><option>Power</option><option>Air</option><option>Infrastructure</option><option>Public issue</option></select></label><label>Severity<select value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})}><option>Low</option><option>Moderate</option><option>High</option><option>Critical</option></select></label></div><button className="primary-button submit-button" type="submit">Log incident <Icon name="arrow" size={15}/></button></form></div>}
  </div>
}

const departments = ['All departments', 'Municipal', 'RTO', 'Water', 'Electricity', 'Sanitation', 'Roads', 'Public safety', 'Other']
const complaintCategories = {
  Municipal: ['Streetlight', 'Illegal dumping', 'Public property damage', 'Stray animals', 'Other municipal issue'],
  RTO: ['Signal violation', 'Dangerous driving', 'Illegal parking', 'Road transport service', 'Other RTO issue'],
  Water: ['No water supply', 'Leaking pipeline', 'Water quality', 'Drainage', 'Other water issue'],
  Electricity: ['Power outage', 'Damaged wire', 'Streetlight outage', 'Meter issue', 'Other electricity issue'],
  Sanitation: ['Missed garbage pickup', 'Overflowing bin', 'Blocked drain', 'Public cleanliness', 'Other sanitation issue'],
  Roads: ['Pothole', 'Damaged road', 'Broken footpath', 'Missing road sign', 'Other road issue'],
  'Public safety': ['Hazardous location', 'Broken public equipment', 'Obstruction', 'Other safety issue'],
  Other: ['General complaint', 'Other']
}

function ComplaintDetails({ id, token, onClose }) {
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [images, setImages] = useState([])
  useEffect(() => {
    let active = true
    const urls = []
    fetch(`/api/incidents/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } }).then(response => { if (!response.ok) throw new Error('This complaint is only available to its resident or city staff.'); return response.json() }).then(async data => {
      if (!active) return
      setItem(data)
      const photos = await Promise.all((data.attachments || []).map(async file => {
        const response = await fetch(`/api/incidents/${encodeURIComponent(id)}/files/${encodeURIComponent(file.fileId)}`, { headers: { Authorization: `Bearer ${token}` } })
        if (!response.ok) return null
        const url = URL.createObjectURL(await response.blob()); urls.push(url)
        return { ...file, url }
      }))
      if (active) setImages(photos.filter(Boolean))
    }).catch(error => { if (active) setError(error.message) })
    return () => { active = false; urls.forEach(URL.revokeObjectURL) }
  }, [id, token])
  return <div className="portal-modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose() }}><section className="portal-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><div className="portal-modal-head"><div><span className="portal-eyebrow">COMPLAINT REFERENCE · {id}</span><h2 id="detail-title">Report progress</h2><p>Your private complaint updates and department notes.</p></div><button aria-label="Close complaint details" onClick={onClose}>×</button></div>{error&&<p className="auth-error">{error}</p>}{!item&&!error&&<p>Loading report timeline…</p>}{item&&<><div className="detail-summary"><span className={`complaint-status ${item.status?.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span><h3>{item.title}</h3><p>{item.department} · {item.category} · {item.area}</p>{item.assignedTo&&<small>Assigned to {item.assignedTo.name}</small>}{item.duplicateOf&&<small>Grouped with {item.duplicateOf}</small>}</div><div className="detail-timeline" aria-label="Complaint status timeline">{(item.timeline||[]).slice().reverse().map((entry,index)=><article key={`${entry.at}-${index}`}><i className={index===0?'current':''}/><div><strong>{entry.status}</strong><p>{entry.note}</p><small>{new Date(entry.at).toLocaleString()} · {entry.role==='staff'?'City staff':entry.role==='system'?'Service monitor':'You'}</small></div></article>)}</div>{images.length>0&&<div className="detail-photos"><strong>Evidence files</strong><div>{images.map(file=><a href={file.url} target="_blank" rel="noreferrer" key={file.fileId}>{file.mime==='application/pdf'?<span className="pdf-file">PDF · Open document</span>:<img src={file.url} alt={file.name}/>}</a>)}</div></div>}</>}</section></div>
}

const labels = {
  en: { overview: 'Overview', map: 'City map', my: 'My complaints', community: 'Community complaints', report: 'File a complaint', signIn: 'Sign in', headline1: 'A better', headline2: 'starts with your voice.', hero: 'Report a local issue, find the right department, and follow progress as your city responds.', explore: 'Explore complaints', around: 'What’s happening around', communitySub: 'Browse reports and see what’s being done across', noReports: 'Be the first to report an issue', submit: 'Submit complaint', issue: 'Which team should handle this?', location: 'Where is it?', description: 'Describe the issue', publicStats: 'City transparency' },
  te: { overview: 'సారాంశం', map: 'నగర మ్యాప్', my: 'నా ఫిర్యాదులు', community: 'ప్రజా ఫిర్యాదులు', report: 'ఫిర్యాదు చేయండి', signIn: 'సైన్ ఇన్', headline1: 'మెరుగైన', headline2: 'మీ స్వరంతో మొదలవుతుంది.', hero: 'స్థానిక సమస్యను తెలియజేయండి, సరైన విభాగాన్ని ఎంచుకోండి, పరిష్కార స్థితిని తెలుసుకోండి.', explore: 'ఫిర్యాదులను చూడండి', around: 'మీ నగరంలో ఏమి జరుగుతోంది', communitySub: 'నగర సమస్యలు మరియు చర్యలను చూడండి', noReports: 'మొదటి ఫిర్యాదును మీరే నమోదు చేయండి', submit: 'ఫిర్యాదు పంపండి', issue: 'ఏ విభాగం పరిష్కరించాలి?', location: 'సమస్య ఎక్కడ ఉంది?', description: 'సమస్య వివరించండి', publicStats: 'నగర పారదర్శకత' }
}
const normalizeIndianMobile = value => {
  const raw = String(value || '').trim()
  const digits = raw.replace(/\D/g, '')
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`
  if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`
  return raw
}

function ComplaintPortal() {
  const [city, setCity] = useState('Guntur')
  const [items, setItems] = useState([])
  const [myItems, setMyItems] = useState([])
  const [staffQueue, setStaffQueue] = useState([])
  const [staffList, setStaffList] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0, overdue: 0, departments: [], monthly: [] })
  const [notifications, setNotifications] = useState([])
  const [token, setToken] = useState(() => sessionStorage.getItem('citysyncToken') || '')
  const [user, setUser] = useState(null)
  const [authOpen, setAuthOpen] = useState(() => !sessionStorage.getItem('citysyncToken'))
  const [authMode, setAuthMode] = useState('login')
  const [authModule, setAuthModule] = useState('citizen')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', phone: '', emailOptIn: true, smsOptIn: false })
  const [authError, setAuthError] = useState('')
  const [language, setLanguage] = useState('en')
  const [listMode, setListMode] = useState('community')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [detailId, setDetailId] = useState('')
  const [pinMode, setPinMode] = useState(false)
  const [reportLocation, setReportLocation] = useState(null)
  const [photoFiles, setPhotoFiles] = useState([])
  const [duplicates, setDuplicates] = useState([])
  const [linkedDuplicate, setLinkedDuplicate] = useState('')
  const [duplicateLoading, setDuplicateLoading] = useState(false)
  const [department, setDepartment] = useState('All departments')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [apiState, setApiState] = useState('connecting')
  const [form, setForm] = useState({ department: 'Municipal', category: 'Streetlight', title: '', area: '', description: '', severity: 'Moderate' })
  const t = key => labels[language][key] || labels.en[key] || key
  const isAuthority = user?.role === 'staff' || user?.role === 'authority'
  const openCityPicker = () => {
    document.getElementById('city-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => document.getElementById('city-search-input')?.focus(), 250)
  }
  const authHeaders = () => token ? { Authorization: `Bearer ${token}` } : {}
  useEffect(() => { document.documentElement.lang = language === 'te' ? 'te' : 'en' }, [language])
  useEffect(() => {
    if (!modal && !authOpen && !detailId) return
    const previousFocus = document.activeElement
      const frame = requestAnimationFrame(() => document.querySelector('.portal-modal-backdrop .portal-modal input, .portal-modal-backdrop .auth-page input, .portal-modal-backdrop .portal-modal button, .portal-modal-backdrop .auth-page button')?.focus())
    const onKeyDown = event => {
      if (event.key === 'Escape') { setDetailId(''); setModal(false); setAuthOpen(false); return }
      if (event.key !== 'Tab') return
      const dialog = document.querySelector('.portal-modal-backdrop .portal-modal, .portal-modal-backdrop .auth-page')
      const focusable = dialog ? [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')] : []
      if (!focusable.length) return
      const first = focusable[0], last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', onKeyDown); previousFocus?.focus?.() }
  }, [modal, authOpen, detailId])

  const loadComplaints = async () => {
    try {
      const [listResponse, healthResponse, statsResponse] = await Promise.all([fetch(`/api/incidents?city=${encodeURIComponent(city)}`), fetch('/api/health'), fetch(`/api/incidents/public/stats?city=${encodeURIComponent(city)}`)])
      if (!listResponse.ok || !healthResponse.ok) throw new Error('Could not connect to the complaint service.')
      const [list, health, publicStats] = await Promise.all([listResponse.json(), healthResponse.json(), statsResponse.ok ? statsResponse.json() : Promise.resolve(stats)])
      setItems(list)
      setStats(publicStats)
      setApiState(health.database === 'connected' ? 'connected' : 'demo')
    } catch { setApiState('offline') }
  }
  useEffect(() => { loadComplaints() }, [city])

  const loadPrivate = async activeToken => {
    const headers = { Authorization: `Bearer ${activeToken}` }
    const [meResponse, mineResponse, notificationResponse] = await Promise.all([fetch('/api/auth/me', { headers }), fetch('/api/incidents/mine', { headers }), fetch('/api/notifications', { headers })])
    if (!meResponse.ok) throw new Error('Your session has expired. Please sign in again.')
    const [me, mine, inbox] = await Promise.all([meResponse.json(), mineResponse.ok ? mineResponse.json() : [], notificationResponse.ok ? notificationResponse.json() : []])
    setUser(me); setMyItems(mine); setNotifications(inbox)
    if (me.role === 'staff') {
      setListMode('staff')
      const [queueResponse, staffResponse] = await Promise.all([fetch(`/api/incidents/staff?city=${encodeURIComponent(city)}`, { headers }), fetch('/api/auth/staff', { headers })])
      if (queueResponse.ok) setStaffQueue(await queueResponse.json())
      if (staffResponse.ok) setStaffList(await staffResponse.json())
    }
  }
  useEffect(() => {
    if (!token) { setUser(null); setMyItems([]); setNotifications([]); return }
    let alive = true
    const refresh = () => loadPrivate(token).catch(() => { if (alive) { sessionStorage.removeItem('citysyncToken'); setToken(''); setUser(null) } })
    refresh()
    const timer = setInterval(refresh, 30000)
    return () => { alive = false; clearInterval(timer) }
  }, [token, city])

  const listItems = listMode === 'mine' ? myItems : listMode === 'staff' ? staffQueue : items
  const visibleItems = useMemo(() => listItems.filter(item => {
    const dept = item.department || (['Water', 'Electricity', 'RTO', 'Roads', 'Sanitation'].includes(item.type) ? item.type : 'Municipal')
    return (department === 'All departments' || dept === department) && (statusFilter === 'All statuses' || item.status === statusFilter) && `${item.id} ${item.title} ${item.area} ${item.category || ''} ${item.description || ''}`.toLowerCase().includes(query.toLowerCase())
  }), [listItems, department, statusFilter, query])
  const openCount = items.filter(item => item.status !== 'Resolved').length
  const resolvedCount = items.filter(item => item.status === 'Resolved').length

  const openReport = () => {
    if (!user) { setAuthModule('citizen'); setAuthMode('login'); setAuthOpen(true); setAuthError('Sign in or create a citizen account to submit and track reports.'); return }
    setReportLocation(null); setPhotoFiles([]); setDuplicates([]); setLinkedDuplicate(''); setModal(true)
  }
  const submitAuth = async event => {
    event.preventDefault(); setAuthError('')
    try {
      const payload = { ...authForm, phone: normalizeIndianMobile(authForm.phone), city }
      const response = await fetch(`/api/auth/${authMode === 'register' ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not sign in.')
      if (authMode === 'login' && ((authModule === 'authority' && data.user.role !== 'staff' && data.user.role !== 'authority') || (authModule === 'citizen' && data.user.role !== 'citizen'))) throw new Error(authModule === 'authority' ? 'This account is not provisioned for city authority access.' : 'This is an authority account. Sign in through the Authority module.')
      sessionStorage.setItem('citysyncToken', data.token); setToken(data.token); setUser(data.user); setAuthOpen(false); setAuthForm({ name: '', email: '', password: '', phone: '', emailOptIn: true, smsOptIn: false }); setAuthError('')
    } catch (error) { setAuthError(error.message) }
  }
  const signOut = () => { sessionStorage.removeItem('citysyncToken'); setToken(''); setUser(null); setListMode('community'); setNotice('You have signed out.') }
  const handleReportPin = point => {
    setReportLocation(point); setPinMode(false); setForm(value => ({ ...value, area: value.area || 'Pinned on city map' })); setModal(true)
  }
  useEffect(() => {
    if (!modal || !reportLocation || !token) { setDuplicates([]); return }
    let active = true
    setDuplicateLoading(true)
    fetch(`/api/incidents/nearby-duplicates?lat=${reportLocation.lat}&lon=${reportLocation.lon}&city=${encodeURIComponent(city)}&department=${encodeURIComponent(form.department)}&category=${encodeURIComponent(form.category)}`, { headers: authHeaders() }).then(response => response.ok ? response.json() : []).then(rows => { if (active) setDuplicates(rows) }).catch(() => {}).finally(() => { if (active) setDuplicateLoading(false) })
    return () => { active = false }
  }, [modal, reportLocation, form.department, city, token])
  useEffect(() => { setLinkedDuplicate('') }, [form.department, form.category, reportLocation])

  const toDataUrl = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, data: reader.result }); reader.onerror = reject; reader.readAsDataURL(file) })

  const submitComplaint = async event => {
    event.preventDefault()
    setSaving(true)
    try {
      const attachments = await Promise.all(photoFiles.map(toDataUrl))
      const response = await fetch('/api/incidents', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, type: form.department, city, location: reportLocation, attachments, duplicateOf: linkedDuplicate }) })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Could not submit your complaint.') }
      const saved = await response.json()
      setItems(rows => [saved, ...rows]); setMyItems(rows => [saved, ...rows]); loadComplaints()
      setModal(false)
      setForm({ department: 'Municipal', category: 'Streetlight', title: '', area: '', description: '', severity: 'Moderate' })
      setReportLocation(null); setPhotoFiles([]); setDuplicates([]); setLinkedDuplicate('')
      setNotice(`Complaint submitted · reference ${saved.id}${saved.duplicateOf ? ` · grouped with ${saved.duplicateOf}` : ''}`)
      setTimeout(() => setNotice(''), 5000)
    } catch (error) { setNotice(error.message); setTimeout(() => setNotice(''), 5000) }
    finally { setSaving(false) }
  }
  const updateStaffComplaint = async (item, changes) => {
    try {
      const response = await fetch(`/api/incidents/${encodeURIComponent(item.id)}/staff-update`, { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(changes) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to update complaint.')
      const deliveryMessage = { sent: 'SMS sent to citizen', consent_required: 'Saved; citizen has not opted in to SMS', phone_missing: 'Saved; citizen has no mobile number', provider_not_configured: 'Saved; Twilio SMS is not configured', provider_error: 'Saved; SMS provider rejected the message' }[data.smsDelivery?.status]
      setStaffQueue(rows => rows.map(row => row.id === item.id ? data : row)); setNotice(deliveryMessage ? `${item.id} updated · ${deliveryMessage}` : `${item.id} updated`); setTimeout(() => setNotice(''), 6000)
      loadPrivate(token)
    } catch (error) { setNotice(error.message) }
  }
  const markReadAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'PATCH', headers: authHeaders() })
    setNotifications(rows => rows.map(row => ({ ...row, readAt: new Date().toISOString() })))
  }
  if (isAuthority) {
    const activeQueue = staffQueue.filter(item => !['Resolved', 'Rejected'].includes(item.status))
    const overdueQueue = activeQueue.filter(item => item.slaDueAt && new Date(item.slaDueAt) < new Date())
    const authorityVisible = staffQueue.filter(item => {
      const dept = item.department || item.type
      return (department === 'All departments' || department === dept) && (statusFilter === 'All statuses' || statusFilter === item.status) && `${item.id} ${item.title} ${item.area} ${item.category || ''} ${item.description || ''} ${item.citizen?.name || ''}`.toLowerCase().includes(query.toLowerCase())
    })
    return <main className="authority-app">
      <header className="authority-topbar"><a className="authority-brand" href="#authority-home"><span className="authority-brand-mark">C</span><span>CitySync<small>AUTHORITY CONSOLE</small></span></a><div className="authority-user"><span className="authority-user-avatar">{user.name.slice(0,1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.department || 'All departments'} · {user.city || city}</small></span><button onClick={signOut}>Sign out</button></div></header>
      <div className="authority-content" id="authority-home"><div className="authority-title-row"><div><span className="authority-kicker">{user.city || city} / {user.department || 'All departments'}</span><h1>Complaint operations</h1><p>Review citizen reports, assign response owners, and keep each resident informed.</p></div><button className="authority-refresh" onClick={()=>loadPrivate(token)}>↻ <span>Refresh queue</span></button></div>
        <section className="authority-metrics"><article><small>Active complaints</small><strong>{activeQueue.length}</strong><span>open across this department</span></article><article className="urgent"><small>Past response target</small><strong>{overdueQueue.length}</strong><span>prioritize these cases</span></article><article><small>Unassigned</small><strong>{activeQueue.filter(item=>!item.assignedTo).length}</strong><span>need a response owner</span></article><article className="complete"><small>Resolved</small><strong>{staffQueue.filter(item=>item.status==='Resolved').length}</strong><span>completed cases</span></article></section>
        <section className="authority-queue"><div className="authority-queue-heading"><div><span className="authority-kicker">CASE MANAGEMENT</span><h2>Department complaint queue</h2><p>Updates are added to the case timeline and sent to the reporting citizen.</p></div><span className="authority-queue-count">{authorityVisible.length} cases</span></div>
          <div className="authority-filters"><label><span>Search cases</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Reference, issue, location, citizen"/></label><label><span>Department</span><select value={department} onChange={event=>setDepartment(event.target.value)}>{departments.map(item=><option key={item}>{item}</option>)}</select></label><label><span>Status</span><select value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}>{['All statuses','Submitted','Open','Investigating','Responding','In progress','Monitoring','Resolved','Rejected'].map(item=><option key={item}>{item}</option>)}</select></label></div>
        <div className="authority-case-list">{authorityVisible.map(item=>{const overdue=item.slaDueAt&&new Date(item.slaDueAt)<new Date()&&!['Resolved','Rejected'].includes(item.status);const eligibleStaff=staffList.filter(member=>member.department===item.department||member.department==='All departments');return <article className={`authority-case ${overdue?'is-overdue':''}`} key={item.id}><div className="authority-case-main"><div className="authority-case-line"><span className="authority-case-ref">{item.id}</span><span className={`authority-case-status ${item.status.toLowerCase().replaceAll(' ','-')}`}>{overdue?'OVERDUE':item.status}</span></div><h3>{item.title}</h3><p>{item.description||`Reported near ${item.area}.`}</p><div className="authority-case-meta"><span>{item.department} · {item.category}</span><span>{item.area}</span><span>Citizen: {item.citizen?.name || 'Resident'}</span><span>{item.slaDueAt?`Target ${new Date(item.slaDueAt).toLocaleString()}`:'No target set'}</span></div><div className="authority-case-actions"><label>Status<select value={item.status} onChange={event=>updateStaffComplaint(item,{status:event.target.value})}>{['Submitted','Open','Investigating','Responding','In progress','Monitoring','Resolved','Rejected'].map(value=><option key={value}>{value}</option>)}</select></label><label>Response owner<select value={item.assignedTo?._id||''} onChange={event=>updateStaffComplaint(item,{assignedTo:event.target.value||null})}><option value="">Unassigned</option>{eligibleStaff.map(member=><option key={member._id} value={member._id}>{member.name} · {member.department||'Staff'}</option>)}</select></label><label className="authority-note"><span>Resident update</span><input id={`authority-note-${item.id}`} maxLength="500" placeholder="Share a progress update"/></label><button className="authority-send-update" onClick={()=>{const input=document.getElementById(`authority-note-${item.id}`);if(input?.value.trim()){updateStaffComplaint(item,{note:input.value.trim()});input.value=''}}}>Send update</button><button className="authority-timeline" onClick={()=>setDetailId(item.id)}>View timeline</button></div></div></article>})}{authorityVisible.length===0&&<div className="authority-empty"><strong>{staffQueue.length?'No cases match those filters':'No complaints in this queue yet'}</strong><span>{staffQueue.length?'Adjust the filters or search terms.':'New citizen reports for your department will appear here.'}</span></div>}</div>
        </section><footer className="authority-footer">CitySync complaint response system <span>·</span> {user.city || city}</footer>
      </div>{notice&&<div className="authority-toast" role="status">{notice}<button onClick={()=>setNotice('')}>×</button></div>}{detailId&&token&&<ComplaintDetails id={detailId} token={token} onClose={()=>setDetailId('')}/>}
    </main>
  }
  return <div className="portal-shell">
    <aside className="portal-sidebar">
      <a className="portal-brand" href="#top"><span className="portal-brand-mark"><i/><i/><i/><i/></span><span>civic<span>connect</span></span></a>
      <div className="portal-side-label">YOUR CITY</div>
      <button className="portal-city-card" onClick={openCityPicker} aria-label={`Change city. Current city is ${city}`}><span className="portal-city-symbol">{city.slice(0, 1)}</span><span><strong>{city}</strong><small>Tap to select · GPS India</small></span><Icon name="chevron" size={16}/></button>
      <div className="portal-side-label portal-nav-label">PORTAL</div>
      <a className="portal-nav active" href="#top"><Icon name="grid"/><span>{isAuthority?'Operations overview':t('overview')}</span></a>
      {!isAuthority&&<><a className="portal-nav" href="#city-map"><Icon name="map"/><span>{t('map')}</span></a>
      <a className="portal-nav" href="#complaints"><Icon name="building"/><span>{t('community')}</span><b>{openCount}</b></a></>}
      {user&&user.role==='citizen'&&<button className="portal-nav" onClick={()=>{setListMode('mine');document.getElementById('complaints')?.scrollIntoView({behavior:'smooth'})}}><Icon name="clock"/><span>{t('my')}</span><b>{myItems.length}</b></button>}
      {isAuthority&&<button className="portal-nav" onClick={()=>{setListMode('staff');document.getElementById('complaints')?.scrollIntoView({behavior:'smooth'})}}><Icon name="pulse"/><span>Authority module</span><b>{staffQueue.filter(item=>item.status!=='Resolved').length}</b></button>}
      {!isAuthority&&<button className="portal-side-cta" onClick={openReport}><Icon name="plus"/> {t('report')}</button>}
      <div className="portal-sidebar-bottom"><div className="portal-help"><span>Need help?</span><strong>We’re here to help improve your neighborhood.</strong><a href="#complaints">Track city complaints <Icon name="arrow" size={13}/></a></div><div className="portal-secure"><span className="secure-dot"/> Your reports help make {city} better</div></div>
    </aside>
    <main className="portal-main" id="top">
      <header className="portal-topbar"><a className="skip-link" href="#main-content">Skip to content</a><div className="portal-crumb">Citizen services <Icon name="chevron" size={14}/><strong>{city}</strong></div><div className="portal-top-right"><span className={`portal-connection ${apiState}`}><i/>{apiState === 'connected' ? 'Service connected' : apiState === 'offline' ? 'Service unavailable' : apiState === 'demo' ? 'Preview mode' : 'Connecting'}</span><button className="language-toggle" onClick={()=>setLanguage(value=>value==='en'?'te':'en')} aria-label="Switch language">{language==='en'?'తెలుగు':'English'}</button>{user&&<div className="notification-wrap"><button className="portal-notification" aria-label={`${notifications.filter(item=>!item.readAt).length} notifications`} onClick={()=>setNotificationOpen(value=>!value)}><Icon name="bell" size={18}/>{notifications.some(item=>!item.readAt)&&<i/>}</button>{notificationOpen&&<div className="notification-popover"><div><strong>Notifications</strong><button onClick={markReadAll}>Mark all read</button></div>{notifications.length?notifications.slice(0,7).map(item=><button key={item._id} className={`notification-item ${item.readAt?'':'unread'}`} onClick={async()=>{await fetch(`/api/notifications/${item._id}/read`,{method:'PATCH',headers:authHeaders()});setNotifications(rows=>rows.map(row=>row._id===item._id?{...row,readAt:new Date().toISOString()}:row));setListMode(user.role==='staff'?'staff':'mine');setDetailId(item.complaintId);setNotificationOpen(false)}}><b>{item.title}</b><span>{item.message}</span><small>{new Date(item.createdAt).toLocaleString()}</small></button>):<p>You’re all caught up.</p>}</div>}</div>}<span className="portal-date">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>{user?<button className="portal-account" onClick={signOut} title="Sign out"><span className="portal-user">{user.name.slice(0,1).toUpperCase()}</span><span>{user.name.split(' ')[0]} · Sign out</span></button>:<button className="portal-signin" onClick={()=>{setAuthModule('citizen');setAuthOpen(true);setAuthMode('login')}}>{t('signIn')}</button>}</div></header>
      {!isAuthority&&<div className="portal-role-banner"><strong>Citizen module</strong><span>City search · complaint filing · private report tracking</span><button onClick={()=>{setAuthModule('authority');setAuthMode('login');setAuthError('');setAuthOpen(true)}}>Authority sign in</button></div>}
      <div className="portal-content" id="main-content">
        {!isAuthority&&<section className="portal-hero"><div className="portal-hero-copy"><span className="portal-eyebrow"><i/> CITIZEN COMPLAINT PORTAL</span><h1>{t('headline1')} {city}<br/><em>{t('headline2')}</em></h1><p>{t('hero')}</p><div className="portal-hero-actions"><button className="portal-primary" onClick={openReport}><Icon name="plus" size={17}/> {t('report')}</button><a className="portal-secondary" href="#complaints">{t('explore')} <Icon name="arrow" size={14}/></a></div></div><div className="portal-hero-art" aria-hidden="true"><div className="hero-sun"/><div className="hero-cloud cloud-a"/><div className="hero-cloud cloud-b"/><div className="hero-buildings"><i/><i/><i/><i/><i/><i/></div><div className="hero-ground"/><div className="hero-pin"><span>!</span></div><div className="hero-route"/></div><div className="portal-hero-foot"><span><b>01</b> Tell us what needs attention</span><i/><span><b>02</b> We’ll route it to the right team</span></div></section>}
        {!isAuthority&&<section className="portal-stats"><article><span className="stat-icon total"><Icon name="building" size={17}/></span><div><small>Community reports</small><strong>{items.length.toLocaleString()}</strong></div><span className="stat-caption">in {city}</span></article><article><span className="stat-icon active-stat"><span className="stat-ring"/></span><div><small>Being addressed</small><strong>{openCount.toLocaleString()}</strong></div><span className="stat-caption">open reports</span></article><article><span className="stat-icon resolved-stat">✓</span><div><small>Resolved</small><strong>{resolvedCount.toLocaleString()}</strong></div><span className="stat-caption">community progress</span></article><article className="stat-message"><span className="stat-icon message-stat">↗</span><div><small>Make your report count</small><strong>Every neighborhood matters</strong></div><button onClick={() => setModal(true)}>Get started <Icon name="arrow" size={13}/></button></article></section>}
        {!isAuthority&&<section className="portal-map-section" id="city-map"><div className="section-intro"><div><span className="portal-eyebrow">EXPLORE YOUR NEIGHBORHOOD</span><h2>{t('around')} {city}?</h2><p>Search your city, explore local places, and see reported issue pins.</p></div><span className="map-open-badge"><i/> Interactive city map</span></div><article className="portal-map-card"><LiveMap city={city} onCityChange={setCity} pickLocation={pinMode} onReportLocation={handleReportPin} complaints={items}/></article></section>}
        {!isAuthority&&<section className="portal-transparency" aria-labelledby="transparency-heading"><div className="section-intro"><div><span className="portal-eyebrow">OPEN CITY DATA</span><h2 id="transparency-heading">{t('publicStats')}</h2><p>Aggregate service metrics for {city}; no resident details are shown.</p></div><span className="map-open-badge">Public summary</span></div><div className="transparency-grid"><article className="transparency-chart"><div className="transparency-chart-head"><strong>Reports received</strong><span>Last 6 months</span></div><div className="transparency-bars" role="img" aria-label="Complaint counts by month">{(stats.monthly||[]).map(item=><div key={item.month}><span title={`${item.count} reports`} style={{height:`${Math.max(5,(item.count/Math.max(1,...stats.monthly.map(row=>row.count)))*100)}%`}}/><small>{item.month}</small></div>)}</div></article><article className="transparency-departments"><div className="transparency-chart-head"><strong>By department</strong><span>{stats.total} total reports</span></div>{(stats.departments||[]).slice(0,5).map(row=><div className="dept-stat-row" key={row.name}><span>{row.name}</span><i><b style={{width:`${Math.max(3,Math.min(100,stats.total?row.count/stats.total*100:0))}%`}}/></i><strong>{row.count}</strong></div>)}{!stats.departments?.length&&<p className="transparency-empty">Department reports will appear here.</p>}</article><article className="transparency-response"><span className="stat-icon resolved-stat"><Icon name="clock" size={17}/></span><small>Average resolution</small><strong>{stats.averageResolutionHours==null?'—':`${stats.averageResolutionHours}h`}</strong><span>for resolved complaints</span><div className="overdue-indicator"><i/>{stats.overdue||0} past service target</div></article></div></section>}
        {isAuthority&&<section className="authority-dashboard" aria-label="Department workload"><div className="authority-welcome"><div><span className="portal-eyebrow">CITY OPERATIONS · {city.toUpperCase()}</span><h1>Complaint response center</h1><p>Review reports, coordinate response, and keep residents updated.</p></div><span className="authority-department">{user.department||'All departments'}</span></div><div className="authority-metrics"><article><small>Open workload</small><strong>{staffQueue.filter(item=>!['Resolved','Rejected'].includes(item.status)).length}</strong><span>active complaints</span></article><article className="urgent"><small>Past service target</small><strong>{staffQueue.filter(item=>item.slaDueAt&&new Date(item.slaDueAt)<new Date()&&!['Resolved','Rejected'].includes(item.status)).length}</strong><span>needs immediate review</span></article><article><small>Unassigned</small><strong>{staffQueue.filter(item=>!item.assignedTo&&!['Resolved','Rejected'].includes(item.status)).length}</strong><span>awaiting an owner</span></article><article className="complete"><small>Resolved</small><strong>{staffQueue.filter(item=>item.status==='Resolved').length}</strong><span>in this department queue</span></article></div></section>}
        <section className="portal-complaints" id="complaints"><div className="complaints-head"><div><span className="portal-eyebrow">{listMode==='staff'?'AUTHORITY WORKSPACE':'COMMUNITY VOICE'}</span><h2>{listMode==='mine'?t('my'):listMode==='staff'?'Authority response queue':t('community')}</h2><p>{listMode==='mine'?'Private reports and updates for your account.':listMode==='staff'?'Triage reports, assign owners, update status, and send progress notifications to residents.':`${t('communitySub')} ${city}.`}</p></div>{!isAuthority&&<button className="portal-primary" onClick={openReport}><Icon name="plus" size={16}/> {t('report')}</button>}</div>
          {user&&(isAuthority?<div className="list-mode-tabs authority-tabs"><button className="active">Authority queue <b>{staffQueue.filter(item=>item.status!=='Resolved').length}</b></button></div>:<div className="list-mode-tabs"><button className={listMode==='community'?'active':''} onClick={()=>setListMode('community')}>{t('community')}</button><button className={listMode==='mine'?'active':''} onClick={()=>setListMode('mine')}>{t('my')} <b>{myItems.length}</b></button></div>)}
          <div className="complaint-toolbar"><label className="complaint-search"><Icon name="search" size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by issue, location or reference"/><kbd>⌕</kbd></label><label className="filter-select"><span>Department</span><select value={department} onChange={event => setDepartment(event.target.value)}>{departments.map(item => <option key={item}>{item}</option>)}</select></label><label className="filter-select status-filter"><span>Status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>{['All statuses', 'Submitted', 'Open', 'Investigating', 'Responding', 'In progress', 'Monitoring', 'Resolved', 'Rejected'].map(item => <option key={item}>{item}</option>)}</select></label></div>
          <div className="department-chips">{departments.map((item, index) => <button key={item} className={department === item ? 'selected' : ''} onClick={() => setDepartment(item)}>{index === 0 ? 'All reports' : item}<span>{index === 0 ? listItems.length : listItems.filter(row => (row.department || row.type) === item).length}</span></button>)}</div>
          <div className="complaint-list">{visibleItems.map((item, index) => { const dept = item.department || (['Water', 'Electricity', 'RTO', 'Roads', 'Sanitation'].includes(item.type) ? item.type : 'Municipal'); const overdue = item.slaDueAt && new Date(item.slaDueAt)<new Date()&&item.status!=='Resolved'; return <article className={`complaint-card ${overdue?'overdue-card':''}`} key={item._id || item.id || index}><div className={`complaint-category-icon dept-${dept.toLowerCase().replaceAll(' ', '-')}`}>{dept === 'RTO' ? '↗' : dept === 'Water' ? '≈' : dept === 'Electricity' ? 'ϟ' : dept === 'Roads' ? '⌁' : dept === 'Sanitation' ? '✳' : dept === 'Public safety' ? '!' : '⌂'}</div><div className="complaint-body"><div className="complaint-card-top"><span className="complaint-dept">{dept}<i/> {item.category || item.type || 'General complaint'}</span><span className={`complaint-status ${overdue?'breached':item.status?.toLowerCase().replaceAll(' ', '-')}`}>{overdue?'SLA overdue':item.status||'Open'}</span></div><h3>{item.title}</h3><p>{item.description || `Reported near ${item.area}. Sign in to view private details.`}</p><div className="complaint-meta"><span><Icon name="map" size={13}/>{item.area}</span><span><Icon name="clock" size={13}/>{item.time || 'Recently reported'}</span><span className="complaint-ref">Ref. {item.id}</span>{item.slaDueAt&&<span>Due {new Date(item.slaDueAt).toLocaleDateString()}</span>}</div>{listMode==='staff'&&<div className="staff-controls"><label>Status<select value={item.status} onChange={event=>updateStaffComplaint(item,{status:event.target.value})}>{['Submitted','Open','Investigating','Responding','In progress','Resolved','Rejected'].map(value=><option key={value}>{value}</option>)}</select></label><label>Assigned to<select value={item.assignedTo?._id||''} onChange={event=>updateStaffComplaint(item,{assignedTo:event.target.value||null})}><option value="">Unassigned</option>{staffList.map(member=><option key={member._id} value={member._id}>{member.name} · {member.department||'Staff'}</option>)}</select></label><label className="staff-note-label">Resident update<input id={`staff-note-${item.id}`} placeholder="Add a progress note" maxLength="500"/></label><button onClick={()=>{const input=document.getElementById(`staff-note-${item.id}`);if(input?.value.trim())updateStaffComplaint(item,{note:input.value.trim()});if(input)input.value=''}}>Add update</button></div>}</div><button className="complaint-action" onClick={()=>user?setDetailId(item.id):setNotice(`${item.id} · ${item.status||'Open'} · ${item.area}`)} title={user?'View private timeline':'View public status'}>{user?'Track':'Status'} <Icon name="arrow" size={13}/></button></article> })}{visibleItems.length === 0 && <div className="complaints-empty"><span>⌂</span><strong>{listItems.length ? 'No complaints match these filters' : listMode==='mine'?'No reports submitted from this account yet':t('noReports')}</strong><p>{listItems.length ? 'Try a different search or department.' : `Help the ${city} team learn what your neighborhood needs.`}</p>{!listItems.length && <button className="portal-primary" onClick={openReport}><Icon name="plus" size={15}/> {t('report')}</button>}</div>}</div>
          <div className="complaints-foot"><span>Showing {visibleItems.length} of {listItems.length} reports</span><button onClick={()=>listMode==='community'?loadComplaints():loadPrivate(token)}>Refresh complaints ↻</button></div>
        </section>
        <footer className="portal-footer"><a className="portal-brand small" href="#top"><span className="portal-brand-mark"><i/><i/><i/><i/></span><span>civic<span>connect</span></span></a><span>Built for a more responsive {city}</span><span>© 2026 Citizen services</span></footer>
      </div>
    </main>
    {notice && <div className="portal-toast" role="status"><span>✓</span>{notice}<button onClick={() => setNotice('')}>×</button></div>}
    {modal && <div className="portal-modal-backdrop" onClick={event => { if (event.target === event.currentTarget) setModal(false) }}><form className="portal-modal" onSubmit={submitComplaint} role="dialog" aria-modal="true" aria-label="File a city complaint"><div className="portal-modal-head"><div><span className="portal-eyebrow">CITIZEN SERVICES · {city.toUpperCase()}</span><h2>Tell us what’s happening</h2><p>Your report is visible in the community list. Private contact details are never requested.</p></div><button type="button" aria-label="Close form" onClick={() => setModal(false)}>×</button></div><label className="portal-form-label">{t('issue')}<select value={form.department} onChange={event => setForm({ ...form, department: event.target.value, category: complaintCategories[event.target.value][0] })}>{departments.slice(1).map(item => <option key={item}>{item}</option>)}</select></label><label className="portal-form-label">Issue category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{complaintCategories[form.department].map(item => <option key={item}>{item}</option>)}</select></label><label className="portal-form-label">Short title<input required minLength="4" maxLength="160" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="e.g. Large pothole outside the school"/></label><label className="portal-form-label">{t('location')}<input required minLength="3" maxLength="240" value={form.area} onChange={event => setForm({ ...form, area: event.target.value })} placeholder="Street, neighborhood or nearby landmark"/></label><button type="button" className="pin-location-button" onClick={()=>{setModal(false);setPinMode(true);setNotice('Click on the map to pin the complaint location.')}}><Icon name="map" size={15}/>{reportLocation?`Pinned: ${reportLocation.lat.toFixed(5)}, ${reportLocation.lon.toFixed(5)}`:'Pin exact location on map'}{reportLocation&&<span>✓</span>}</button>{duplicates.length>0&&<div className="duplicate-panel"><strong>Similar open reports nearby</strong><span>Link your report to an existing case or submit it separately.</span>{duplicates.slice(0,3).map(item=><button type="button" key={item.id} className={linkedDuplicate===item.id?'linked':''} onClick={()=>setLinkedDuplicate(value=>value===item.id?'':item.id)}><span>{item.title} · {item.distanceMeters} m away · {item.status}</span><b>{linkedDuplicate===item.id?'Linked':'Link report'}</b></button>)}</div>}{duplicateLoading&&<p className="duplicate-loading">Checking for similar nearby reports…</p>}<label className="portal-form-label">{t('description')}<textarea rows="3" maxLength="2000" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Share details that will help the city team respond…"/></label><label className="portal-form-label upload-label">Add photos or documents <small>Up to 4 files · 5 MB each · JPEG, PNG, WebP, PDF</small><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple onChange={event=>{const chosen=Array.from(event.target.files||[]);if(chosen.length>4||chosen.some(file=>file.size>5*1024*1024)){setNotice('Choose up to 4 files, each no larger than 5 MB.');event.target.value='';return}setPhotoFiles(chosen)}}/>{photoFiles.length>0&&<span className="selected-photos">{photoFiles.map(file=>file.name).join(' · ')}</span>}</label><div className="portal-form-footer"><span><i/> Your report will get a reference and response target.</span><button className="portal-primary" type="submit" disabled={saving}>{saving?'Submitting…':t('submit')} <Icon name="arrow" size={14}/></button></div></form></div>}
    {authOpen&&<div className="portal-modal-backdrop auth-page-backdrop" onClick={event=>{if(event.target===event.currentTarget)setAuthOpen(false)}}><form className="auth-page" onSubmit={submitAuth} role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <aside className={`auth-visual ${authModule}`}><img className="auth-india-map" src="/india-states-map.svg" alt="" aria-hidden="true"/><a className="auth-visual-brand" href="#top" onClick={()=>setAuthOpen(false)}><span className="portal-brand-mark"><i/><i/><i/><i/></span><span>civic<span>connect</span></span></a><div className="auth-visual-content"><span className="auth-visual-icon">{authModule==='authority'?'⌘':'⌂'}</span><span className="portal-eyebrow">{authModule==='authority'?'CITY OPERATIONS':'YOUR CITY, YOUR VOICE'}</span><h2>{authMode==='register'?'Join your city community':authModule==='authority'?'A clearer view of city services':'Make your neighborhood heard'}</h2><p>{authModule==='authority'?'Coordinate department response, assign reports, and keep residents informed from one workspace.':'Report local issues, follow verified updates, and help your city prioritize what matters.'}</p><ul>{(authModule==='authority'?['Review incoming reports','Coordinate department teams','Track response targets']:['File and track reports','Get city team updates','Explore nearby issues']).map(item=><li key={item}><i>✓</i>{item}</li>)}</ul></div><span className="auth-visual-footer">CivicConnect · India</span></aside>
      <section className="auth-form-panel">
      <div className="portal-modal-head"><div><span className="portal-eyebrow">CIVICCONNECT · INDIA</span><h2 id="auth-title">{authMode==='register'?'Create your citizen account':authModule==='authority'?'Authority sign in':'Citizen sign in'}</h2><p>{authMode==='register'?'Submit a city complaint and follow its progress privately.':authModule==='authority'?'Secure access for approved city departments and response teams.':'Sign in to report a civic issue and privately track its progress.'}</p></div></div>
      <div className="auth-module-picker" role="tablist" aria-label="Choose sign-in module"><button type="button" role="tab" aria-selected={authModule==='citizen'} className={authModule==='citizen'?'active':''} onClick={()=>{setAuthModule('citizen');setAuthMode('login');setAuthError('')}}><span>◎</span><strong>Citizen</strong><small>Report and track issues</small></button><button type="button" role="tab" aria-selected={authModule==='authority'} className={authModule==='authority'?'active authority':''} onClick={()=>{setAuthModule('authority');setAuthMode('login');setAuthError('')}}><span>▦</span><strong>Authority</strong><small>Manage city responses</small></button></div>
      {authError&&<div className="auth-error" role="alert">{authError}</div>}
      {authModule==='authority'&&authMode==='login'&&<div className="authority-hint"><strong>Authorized city staff only</strong><span>Authority accounts are provisioned by your organization. Citizen registration cannot create an authority account.</span></div>}
      {authMode==='register'&&<label className="portal-form-label">Full name<input required minLength="2" maxLength="100" value={authForm.name} onChange={event=>setAuthForm({...authForm,name:event.target.value})} autoComplete="name"/></label>}
      <label className="portal-form-label">Email<input required type="email" autoComplete="email" value={authForm.email} onChange={event=>setAuthForm({...authForm,email:event.target.value})}/></label>
      {authMode==='register'&&<><label className="portal-form-label">Indian mobile number <small>Enter 10 digits; +91 is added automatically</small><input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength="15" placeholder="63002 71500" value={authForm.phone} onChange={event=>setAuthForm({...authForm,phone:event.target.value})}/></label><label className="consent-option"><input type="checkbox" checked={authForm.smsOptIn} onChange={event=>setAuthForm({...authForm,smsOptIn:event.target.checked})}/>I agree to receive complaint status SMS messages. Carrier rates may apply.</label><label className="consent-option"><input type="checkbox" checked={authForm.emailOptIn} onChange={event=>setAuthForm({...authForm,emailOptIn:event.target.checked})}/>Send complaint updates to my account email.</label></>}
      <label className="portal-form-label">Password<input required type="password" minLength={authMode==='register'?10:1} maxLength="128" autoComplete={authMode==='register'?'new-password':'current-password'} value={authForm.password} onChange={event=>setAuthForm({...authForm,password:event.target.value})}/>{authMode==='register'&&<small>Use at least 10 characters.</small>}</label>
      <button className="portal-primary auth-submit" type="submit">{authMode==='login'?authModule==='authority'?'Sign in to Authority':'Sign in to Citizen portal':'Create citizen account'}</button>
      {authModule==='citizen'&&<p className="auth-switch">{authMode==='login'?"New to CivicConnect?":"Already registered?"} <button type="button" onClick={()=>{setAuthMode(authMode==='login'?'register':'login');setAuthError('')}}>{authMode==='login'?'Create a citizen account':'Sign in'}</button></p>}
      <button type="button" className="auth-back-home" onClick={()=>setAuthOpen(false)}>Back to CitySync</button>
      </section>
    </form></div>}
    {detailId&&token&&<ComplaintDetails id={detailId} token={token} onClose={()=>setDetailId('')}/>}
  </div>
}

createRoot(document.getElementById('root')).render(<ComplaintPortal />)











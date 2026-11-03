import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = resolve('frontend/src/india-states.geojson')
const output = resolve('frontend/public/india-states-map.svg')
const data = JSON.parse(await readFile(source, 'utf8'))
const width = 660
const height = 690
const project = ([lon, lat]) => [16 + (lon - 68.05) * 21.2, 18 + (37.25 - lat) * 21.2]
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const ringPath = ring => ring.map((point, index) => {
  const [x, y] = project(point)
  return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
}).join(' ') + 'Z'
const polygonPath = polygon => polygon.map(ringPath).join(' ')
const geometryPath = geometry => geometry.type === 'Polygon'
  ? polygonPath(geometry.coordinates)
  : geometry.coordinates.map(polygonPath).join(' ')
const coordinatesOf = geometry => {
  const points = []
  const visit = value => {
    if (typeof value[0] === 'number') points.push(value)
    else value.forEach(visit)
  }
  visit(geometry.coordinates)
  return points
}
const fillFor = geometry => {
  const points = coordinatesOf(geometry)
  const avgLat = points.reduce((sum, point) => sum + point[1], 0) / points.length
  return avgLat >= 27 ? '#ff9933' : avgLat >= 16.5 ? '#fffdf5' : '#138808'
}

const decorativeMapFeatures = data.features.filter(feature => !['Andaman and Nicobar Islands', 'Lakshadweep'].includes(feature.properties.st_nm))
const regions = decorativeMapFeatures.map(feature => {
  const state = feature.properties.st_nm
  const district = feature.properties.district || state
  return `<path d="${geometryPath(feature.geometry)}" fill="${fillFor(feature.geometry)}" fill-rule="evenodd"><title>${esc(district)}, ${esc(state)}</title></path>`
}).join('')
const chakraCenter = project([79.2, 21.4])
const spokes = Array.from({ length: 24 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 24
  const x1 = Math.cos(angle) * 10, y1 = Math.sin(angle) * 10
  const x2 = Math.cos(angle) * 47, y2 = Math.sin(angle) * 47
  return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`
}).join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Tricolour map of India</title><desc id="desc">India silhouette with state and union territory boundaries, filled in saffron, white, and green with an Ashoka Chakra. Boundary data from DataMeet community GeoJSON, 2011 vintage, CC BY 2.5 India.</desc><defs><filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#06231c" flood-opacity=".25"/></filter><style>.chakra{fill:none;stroke:#000080;stroke-width:2.4}.chakra-spoke{stroke-width:1.55}</style></defs><g filter="url(#soft-shadow)" stroke="#fff8e8" stroke-width=".8" stroke-linejoin="round" stroke-linecap="round">${regions}</g><g class="chakra" transform="translate(${chakraCenter[0].toFixed(1)} ${chakraCenter[1].toFixed(1)})"><circle r="51" stroke-width="3.3"/><circle r="8" stroke-width="3"/>${spokes}</g></svg>`
await writeFile(output, svg)
console.log(`Built ${output} with ${decorativeMapFeatures.length} mainland boundary features; offshore island shapes and visible labels are omitted.`)

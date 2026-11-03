import { Router } from 'express'
import mongoose from 'mongoose'
import Reading from '../models/Reading.js'
import Incident from '../models/Incident.js'

const router = Router()
const demoReadings = [
  { city: 'Guntur', system: 'Traffic', metric: 'Junction flow', location: 'Arundalpet · Ring Road', value: 78, unit: '%', severity: 'High', observedAt: new Date().toISOString() },
  { city: 'Guntur', system: 'Water', metric: 'Network availability', location: 'Brodipet · Ward 12', value: 96.4, unit: '%', severity: 'Critical', observedAt: new Date().toISOString() },
  { city: 'Guntur', system: 'Power', metric: 'Grid uptime', location: 'Nallapadu · Zone 4', value: 99.1, unit: '%', severity: 'Moderate', observedAt: new Date().toISOString() },
  { city: 'Guntur', system: 'Air', metric: 'Air quality index', location: 'Auto Nagar · Industrial zone', value: 86, unit: 'AQI', severity: 'High', observedAt: new Date().toISOString() }
]

router.get('/', async (req, res, next) => {
  try {
    const city = req.query.city || 'Guntur'
    if (mongoose.connection.readyState !== 1) return res.json(demoReadings)
    const readings = await Reading.find({ city }).sort({ observedAt: -1 }).limit(100).lean()
    res.json(readings.length ? readings : demoReadings.filter(reading => reading.city === city))
  } catch (error) { next(error) }
})

router.post('/', async (req, res, next) => {
  try {
    const { city = 'Guntur', system, metric, location, value, unit, warningThreshold, criticalThreshold, thresholdDirection = 'above' } = req.body
    if (!['Traffic', 'Water', 'Power', 'Air'].includes(system) || !['above', 'below'].includes(thresholdDirection) || !metric?.trim() || !location?.trim() || !unit?.trim() || !Number.isFinite(Number(value))) {
      return res.status(400).json({ error: 'City, system, metric, location, numeric value, and unit are required.' })
    }
    const numericValue = Number(value)
    const crossed = threshold => threshold != null && (thresholdDirection === 'below' ? numericValue <= Number(threshold) : numericValue >= Number(threshold))
    let severity = 'Normal'
    if (crossed(criticalThreshold)) severity = 'Critical'
    else if (crossed(warningThreshold)) severity = 'High'
    const reading = await Reading.create({ city, system, metric, location, value: numericValue, unit, warningThreshold, criticalThreshold, thresholdDirection, severity })
    let incident = null
    if (severity !== 'Normal') {
      const title = `${metric} threshold breached`
      incident = await Incident.findOneAndUpdate(
        { title, area: location, type: system, status: { $ne: 'Resolved' } },
        { $set: { severity, time: 'Just now' } },
        { new: true }
      )
      if (!incident) incident = await Incident.create({
        id: `CS-${Date.now().toString().slice(-6)}`,
        title, area: location, city, type: system, severity, time: 'Just now', status: 'Investigating'
      })
    }
    res.status(201).json({ reading, incident })
  } catch (error) { next(error) }
})

export default router



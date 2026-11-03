import { Router } from 'express'
import mongoose from 'mongoose'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import Incident from '../models/Incident.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import { authenticate, requireStaff } from '../middleware/auth.js'
import { isSmsConfigured, sendEmail, sendSms } from '../services/mailer.js'

const router = Router()
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../private-uploads')
const departments = ['Municipal', 'RTO', 'Water', 'Electricity', 'Sanitation', 'Roads', 'Public safety', 'Other']
const statuses = ['Submitted', 'Open', 'Investigating', 'Responding', 'In progress', 'Monitoring', 'Resolved', 'Rejected']
const slaHours = { Critical: 4, High: 24, Moderate: 72, Low: 168 }
const departmentSlaHours = { Municipal: 72, RTO: 24, Water: 24, Electricity: 24, Sanitation: 48, Roads: 48, 'Public safety': 8, Other: 72 }
const categories = { Municipal: ['Streetlight', 'Illegal dumping', 'Public property damage', 'Stray animals', 'Other municipal issue'], RTO: ['Signal violation', 'Dangerous driving', 'Illegal parking', 'Road transport service', 'Other RTO issue'], Water: ['No water supply', 'Leaking pipeline', 'Water quality', 'Drainage', 'Other water issue'], Electricity: ['Power outage', 'Damaged wire', 'Streetlight outage', 'Meter issue', 'Other electricity issue'], Sanitation: ['Missed garbage pickup', 'Overflowing bin', 'Blocked drain', 'Public cleanliness', 'Other sanitation issue'], Roads: ['Pothole', 'Damaged road', 'Broken footpath', 'Missing road sign', 'Other road issue'], 'Public safety': ['Hazardous location', 'Broken public equipment', 'Obstruction', 'Other safety issue'], Other: ['General complaint', 'Other'] }
const legacyDepartment = { Traffic: 'RTO', Power: 'Electricity', Water: 'Water', 'Public issue': 'Municipal', Infrastructure: 'Municipal', Air: 'Other' }
const demo = [
  { city: 'Guntur', id: 'CS-2048', title: 'Water supply interruption', area: 'Brodipet · Ward 12', department: 'Water', category: 'No water supply', type: 'Water', severity: 'Critical', time: '8 min ago', status: 'Responding' },
  { city: 'Guntur', id: 'CS-2047', title: 'Junction congestion', area: 'Arundalpet · Ring Road', department: 'RTO', category: 'Signal violation', type: 'Traffic', severity: 'High', time: '21 min ago', status: 'In progress' },
  { city: 'Guntur', id: 'CS-2046', title: 'Streetlight not working', area: 'Lakshmipuram · 6th Lane', department: 'Municipal', category: 'Streetlight', type: 'Public issue', severity: 'Low', time: '2 hrs ago', status: 'Open' }
]

const publicSummary = item => ({
  id: item.id, city: item.city, title: item.title, area: item.area, department: item.department || legacyDepartment[item.type] || 'Municipal',
  category: item.category || item.type || 'General complaint', severity: item.severity, status: item.status,
  time: item.time, createdAt: item.createdAt, slaDueAt: item.slaDueAt || null,
  location: item.location?.lat != null ? { lat: Number(Number(item.location.lat).toFixed(3)), lon: Number(Number(item.location.lon).toFixed(3)) } : undefined,
  duplicateOf: item.duplicateOf || ''
})
const haversine = (a, b) => {
  const rad = value => value * Math.PI / 180
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon)
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}
const safeFileName = value => String(value || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100)
const submissions = new Map()
function limitSubmissions(req, res, next) {
  const now = Date.now(), key = req.auth.id
  const recent = (submissions.get(key) || []).filter(time => now - time < 60 * 60 * 1000)
  if (recent.length >= 20) return res.status(429).json({ error: 'You have reached the report limit for this hour. Please try later.' })
  recent.push(now); submissions.set(key, recent); next()
}

router.get('/public/stats', async (req, res, next) => {
  try {
    const city = String(req.query.city || 'Guntur').slice(0, 120)
    if (mongoose.connection.readyState !== 1) {
      const counts = demo.reduce((groups, item) => ({ ...groups, [item.department]: (groups[item.department] || 0) + 1 }), {})
      return res.json({ total: demo.length, active: demo.length, resolved: 0, overdue: 0, averageResolutionHours: null, departments: Object.entries(counts).map(([name, count]) => ({ name, count })), monthly: [] })
    }
    const rows = await Incident.find({ city }).select('department type status slaDueAt createdAt resolvedAt duplicateOf').lean()
    const byDepartment = new Map()
    const resolutionHours = []
    let resolved = 0, overdue = 0
    const now = Date.now()
    for (const item of rows) {
      const department = item.department || legacyDepartment[item.type] || 'Municipal'
      byDepartment.set(department, (byDepartment.get(department) || 0) + 1)
      if (item.status === 'Resolved') {
        resolved++
        if (item.resolvedAt && item.createdAt) resolutionHours.push((new Date(item.resolvedAt) - new Date(item.createdAt)) / 3600000)
      } else if (item.slaDueAt && new Date(item.slaDueAt).getTime() < now) overdue++
    }
    const monthly = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0); month.setMonth(month.getMonth() - (5 - index))
      const next = new Date(month); next.setMonth(next.getMonth() + 1)
      return { month: month.toLocaleString('en', { month: 'short' }), count: rows.filter(item => item.createdAt >= month && item.createdAt < next).length }
    })
    res.json({ total: rows.length, active: rows.length - resolved, resolved, overdue, linkedReports: rows.filter(item => item.duplicateOf).length, averageResolutionHours: resolutionHours.length ? Math.round(resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length) : null, departments: [...byDepartment].map(([name, count]) => ({ name, count })), monthly })
  } catch (error) { next(error) }
})

// Public, privacy-safe list: descriptions, attachments, timelines and account details are excluded.
router.get('/', async (req, res, next) => {
  try {
    const city = String(req.query.city || 'Guntur').slice(0, 120)
    const { department, status, q } = req.query
    if (mongoose.connection.readyState !== 1) return res.json((city === 'Guntur' ? demo : []).filter(item => (!department || item.department === department) && (!status || item.status === status) && (!q || `${item.title} ${item.area} ${item.id}`.toLowerCase().includes(String(q).toLowerCase()))).map(publicSummary))
    if (city === 'Guntur') await Incident.updateMany({ city: { $exists: false } }, { $set: { city: 'Guntur' } })
    const filter = { city }
    if (department && departments.includes(String(department))) filter.department = department
    if (status && statuses.includes(String(status))) filter.status = status
    if (q) filter.$or = ['title', 'area', 'id', 'category'].map(field => ({ [field]: { $regex: String(q).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }))
    const items = await Incident.find(filter).select('-description -timeline -attachments -citizen -assignedTo -contact -citizenName').sort({ createdAt: -1 }).limit(100).lean()
    res.json(items.map(publicSummary))
  } catch (error) { next(error) }
})

router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const items = await Incident.find({ citizen: req.auth.id }).sort({ createdAt: -1 }).limit(100).lean()
    res.json(items)
  } catch (error) { next(error) }
})

router.get('/staff', authenticate, requireStaff, async (req, res, next) => {
  try {
    if ((req.auth.city || 'Guntur') === 'Guntur') await Incident.updateMany({ city: { $exists: false } }, { $set: { city: 'Guntur' } })
    const filter = { city: req.auth.city || 'Guntur' }
    if (req.auth.department && req.auth.department !== 'All departments') filter.department = req.auth.department
    else if (req.query.department && departments.includes(String(req.query.department))) filter.department = req.query.department
    if (req.query.status && statuses.includes(String(req.query.status))) filter.status = req.query.status
    if (req.query.assigned === 'mine') filter.assignedTo = req.auth.id
    const items = await Incident.find(filter).populate('citizen', 'name').populate('assignedTo', 'name department').sort({ slaDueAt: 1, createdAt: -1 }).limit(250).lean()
    res.json(items)
  } catch (error) { next(error) }
})

router.get('/nearby-duplicates', authenticate, async (req, res, next) => {
  try {
    const lat = Number(req.query.lat), lon = Number(req.query.lon), city = String(req.query.city || '').slice(0, 120), department = String(req.query.department || ''), category = String(req.query.category || '').slice(0, 100)
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !departments.includes(department)) return res.status(400).json({ error: 'Provide valid coordinates and a department.' })
    const filter = { city, department, status: { $nin: ['Resolved', 'Rejected'] }, 'location.lat': { $gte: lat - 0.01, $lte: lat + 0.01 }, 'location.lon': { $gte: lon - 0.01, $lte: lon + 0.01 } }
    if (category) filter.category = category
    const rows = await Incident.find(filter).select('id title area category status location createdAt').limit(100).lean()
    res.json(rows.filter(item => item.location && haversine({ lat, lon }, item.location) <= 500).map(item => ({ id: item.id, title: item.title, area: item.area, category: item.category, status: item.status, distanceMeters: Math.round(haversine({ lat, lon }, item.location)) })))
  } catch (error) { next(error) }
})

router.post('/', authenticate, limitSubmissions, async (req, res, next) => {
  const savedPaths = []
  try {
    const { title, area, department, category, description = '', city = 'Guntur', location, attachments = [], duplicateOf = '' } = req.body
    const cleanTitle = String(title || '').trim(), cleanArea = String(area || '').trim(), cleanDescription = String(description || '')
    if (cleanTitle.length < 4 || cleanTitle.length > 160 || cleanArea.length < 3 || cleanArea.length > 240 || !departments.includes(department) || !categories[department]?.includes(category) || cleanDescription.length > 2000 || String(city).length > 120) return res.status(400).json({ error: 'Check the complaint title, location, category, department, and description.' })
    if (location && (!Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lon)) || Math.abs(Number(location.lat)) > 90 || Math.abs(Number(location.lon)) > 180)) return res.status(400).json({ error: 'The selected map location is invalid.' })
    if (duplicateOf) {
      const match = await Incident.findOne({ id: duplicateOf, city, department, category, status: { $nin: ['Resolved', 'Rejected'] } }).select('id location')
      if (!match || !match.location || !location || haversine({ lat: Number(location.lat), lon: Number(location.lon) }, match.location) > 500) return res.status(400).json({ error: 'That report is no longer an eligible nearby match.' })
    }
    if (!Array.isArray(attachments) || attachments.length > 4) return res.status(400).json({ error: 'Attach up to 4 photos.' })
    const validFiles = []
    for (const item of attachments) {
      const match = /^data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(String(item.data || ''))
      if (!match) return res.status(400).json({ error: 'Attachments must be PNG, JPEG, WebP, or PDF files.' })
      const buffer = Buffer.from(match[2], 'base64')
      if (buffer.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Each attachment must be 5 MB or less.' })
      const mime = match[1]
      const valid = (mime === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) || (mime === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer.at(-2) === 0xff && buffer.at(-1) === 0xd9) || (mime === 'image/webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') || (mime === 'application/pdf' && buffer.subarray(0, 5).toString('ascii') === '%PDF-')
      if (!valid) return res.status(400).json({ error: 'An attached file does not match its declared type.' })
      validFiles.push({ buffer, mime, name: safeFileName(item.name) })
    }
    await mkdir(root, { recursive: true })
    const files = []
    for (const item of validFiles) {
      const fileId = randomUUID()
      await writeFile(resolve(root, fileId), item.buffer, { flag: 'wx' })
      savedPaths.push(resolve(root, fileId))
      files.push({ fileId, name: item.name, mime: item.mime, size: item.buffer.length })
    }
    const now = new Date()
    const severity = 'Moderate'
    const incident = await Incident.create({
      id: `CS-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      title: cleanTitle, area: cleanArea, type: department, department, category, description: cleanDescription, location,
      severity, city, citizen: req.auth.id, attachments: files, duplicateOf, time: 'Just now', status: 'Submitted',
      slaDueAt: new Date(now.getTime() + Math.min(slaHours[severity], departmentSlaHours[department] || 72) * 60 * 60 * 1000),
      timeline: [{ status: 'Submitted', note: 'Complaint received and added to the department queue.', by: 'Resident', role: 'citizen', at: now }]
    })
    await Notification.create({ user: req.auth.id, complaintId: incident.id, title: 'Complaint received', message: `${incident.id} was sent to ${department}.` })
    const resident = await User.findById(req.auth.id).select('email phone emailOptIn smsOptIn')
    if (resident) await Promise.all([resident.emailOptIn ? sendEmail(resident.email, `Complaint received · ${incident.id}`, `Your report was sent to ${department}. Reference: ${incident.id}.`) : Promise.resolve(false), resident.smsOptIn ? sendSms(resident.phone, `CitySync: report ${incident.id} received by ${department}.`) : Promise.resolve(false)])
    const staff = await User.find({ role: 'staff', city, $or: [{ department }, { department: 'All departments' }] }).select('_id email emailOptIn')
    if (staff.length) {
      await Notification.insertMany(staff.map(member => ({ user: member._id, complaintId: incident.id, title: 'New city complaint', message: `${incident.id}: ${incident.title} · ${incident.area}` })))
      await Promise.all(staff.filter(member => member.emailOptIn).map(member => sendEmail(member.email, `New ${department} complaint · ${incident.id}`, `${incident.title}\n${incident.area}\nReference: ${incident.id}`)))
    }
    res.status(201).json(incident)
  } catch (error) {
    await Promise.all(savedPaths.map(path => import('node:fs/promises').then(fs => fs.unlink(path).catch(() => {}))))
    next(error)
  }
})

router.patch('/:id/staff-update', authenticate, requireStaff, async (req, res, next) => {
  try {
    const incident = await Incident.findOne({ id: req.params.id })
    if (!incident) return res.status(404).json({ error: 'Complaint not found.' })
    if ((req.auth.city && incident.city !== req.auth.city) || (req.auth.department && req.auth.department !== 'All departments' && incident.department !== req.auth.department)) return res.status(403).json({ error: 'This complaint belongs to another city department.' })
    const { status, note, assignedTo } = req.body
    let changed = false
    let resolvedNow = false
    if (status && statuses.includes(status) && status !== incident.status) {
      resolvedNow = status === 'Resolved'
      incident.status = status
      incident.timeline.push({ status, note: String(note || `Status changed to ${status}.`).slice(0, 500), by: req.auth.id, role: 'staff', at: new Date() })
      if (status === 'Resolved') incident.resolvedAt = new Date()
      else if (status !== 'Rejected') incident.resolvedAt = undefined
      changed = true
    } else if (note && String(note).trim()) {
      incident.timeline.push({ status: incident.status, note: String(note).trim().slice(0, 500), by: req.auth.id, role: 'staff', at: new Date() })
      changed = true
    }
    if (assignedTo !== undefined) {
      const member = assignedTo ? await User.findOne({ _id: assignedTo, role: 'staff', city: incident.city, $or: [{ department: incident.department }, { department: 'All departments' }] }) : null
      if (assignedTo && !member) return res.status(400).json({ error: 'Choose a valid staff member.' })
      incident.assignedTo = member?._id || null
      if (!status) incident.timeline.push({ status: incident.status, note: member ? `Assigned to ${member.name}.` : 'Assignment cleared.', by: req.auth.id, role: 'staff', at: new Date() })
      changed = true
    }
    if (!changed) return res.status(400).json({ error: 'Provide a valid status, assignment, or staff note.' })
    await incident.save()
    let smsDelivery = { status: 'not_available' }
    if (incident.citizen) {
      const message = `Complaint ${incident.id}: ${incident.status}${note ? ` · ${String(note).slice(0, 250)}` : ''}`
      await Notification.create({ user: incident.citizen, complaintId: incident.id, title: 'Complaint update', message })
      const resident = await User.findById(incident.citizen).select('email phone emailOptIn smsOptIn')
      if (resident) {
        const smsMessage = resolvedNow
          ? `CivicConnect: Your ${incident.department} complaint ${incident.id} in ${incident.city} has been resolved.${note ? ` Update: ${String(note).trim().slice(0, 220)}` : ''}`
          : `CivicConnect: ${message}`
        const tasks = [resident.emailOptIn ? sendEmail(resident.email, `CitySync complaint update · ${incident.id}`, message) : Promise.resolve(false)]
        if (!resident.smsOptIn) smsDelivery = { status: 'consent_required' }
        else if (!resident.phone) smsDelivery = { status: 'phone_missing' }
        else if (!isSmsConfigured()) smsDelivery = { status: 'provider_not_configured' }
        else {
          const smsSent = await sendSms(resident.phone, smsMessage)
          smsDelivery = { status: smsSent ? 'sent' : 'provider_error' }
        }
        await Promise.all(tasks)
      }
    }
    res.json({ ...incident.toObject(), smsDelivery })
  } catch (error) { next(error) }
})

router.get('/:id/files/:fileId', authenticate, async (req, res, next) => {
  try {
    const incident = await Incident.findOne({ id: req.params.id }).select('citizen attachments assignedTo')
    const staffAllowed = req.auth.role === 'staff' && (!req.auth.city || req.auth.city === incident?.city) && (!req.auth.department || req.auth.department === 'All departments' || req.auth.department === incident?.department)
    if (!incident || (String(incident.citizen) !== req.auth.id && !staffAllowed)) return res.status(404).json({ error: 'Photo not found.' })
    const file = incident.attachments.find(item => item.fileId === req.params.fileId)
    if (!file) return res.status(404).json({ error: 'Photo not found.' })
    const path = resolve(root, file.fileId)
    if (!path.startsWith(`${root}\\`) && !path.startsWith(`${root}/`)) return res.status(400).json({ error: 'Invalid file path.' })
    const buffer = await readFile(path)
    res.set({ 'Content-Type': file.mime, 'Content-Length': buffer.length, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `inline; filename="${file.name}"` })
    res.send(buffer)
  } catch (error) { if (error.code === 'ENOENT') return res.status(404).json({ error: 'Photo file is missing.' }); next(error) }
})

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const incident = await Incident.findOne({ id: req.params.id }).populate('assignedTo', 'name department').lean()
    const staffAllowed = req.auth.role === 'staff' && (!req.auth.city || req.auth.city === incident?.city) && (!req.auth.department || req.auth.department === 'All departments' || req.auth.department === incident?.department)
    if (!incident || (String(incident.citizen) !== req.auth.id && !staffAllowed)) return res.status(404).json({ error: 'Complaint not found.' })
    res.json(incident)
  } catch (error) { next(error) }
})

export default router

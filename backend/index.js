import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import incidentsRouter from './routes/incidents.js'
import readingsRouter from './routes/readings.js'
import mapsRouter from './routes/maps.js'
import authRouter, { ensureStaffAccount } from './routes/auth.js'
import notificationsRouter from './routes/notifications.js'
import Incident from './models/Incident.js'
import User from './models/User.js'
import { sendEmail, sendSms } from './services/mailer.js'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '.env') })

const app = express()
const port = process.env.PORT || 5000
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '28mb' }))
app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'demo mode' }))
app.use('/api/auth', authRouter)
app.use('/api/incidents', incidentsRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/readings', readingsRouter)
app.use('/api/map', mapsRouter)
app.use((error, _req, res, _next) => {
  console.error(error.message)
  res.status(500).json({ error: 'Something went wrong while processing your request.' })
})

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to MongoDB Atlas')
    await ensureStaffAccount().catch(error => console.error('Staff account bootstrap failed:', error.message))
  }).catch(error => console.error('MongoDB connection failed:', error.message))
} else {
  console.log('MONGODB_URI is not set; starting in demo mode.')
}
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set before production startup.')

// Escalate unresolved reports when their service target expires; notify the resident and email if SMTP is configured.
setInterval(async () => {
  if (mongoose.connection.readyState !== 1) return
  try {
    const overdue = await Incident.find({ status: { $nin: ['Resolved', 'Rejected'] }, slaDueAt: { $lte: new Date() }, slaBreachedAt: null }).limit(50)
    for (const item of overdue) {
      item.slaBreachedAt = new Date()
      item.timeline.push({ status: item.status, note: 'Service target passed; escalated to the department queue.', by: 'CitySync', role: 'system', at: item.slaBreachedAt })
      await item.save()
      if (item.citizen) {
        await Notification.create({ user: item.citizen, complaintId: item.id, title: 'Report escalated', message: `${item.id} has been escalated to the department queue.` })
        const resident = await User.findById(item.citizen).select('email phone emailOptIn smsOptIn')
        if (resident) await Promise.all([resident.emailOptIn ? sendEmail(resident.email, `Complaint ${item.id} escalated`, `${item.id} passed its service target and was escalated to the department queue.`) : Promise.resolve(false), resident.smsOptIn ? sendSms(resident.phone, `CitySync: complaint ${item.id} passed its response target and was escalated.`) : Promise.resolve(false)])
      }
      const staff = await User.find({ role: 'staff', city: item.city, $or: [{ department: item.department }, { department: 'All departments' }] }).select('_id email emailOptIn')
      if (staff.length) {
        await Notification.insertMany(staff.map(member => ({ user: member._id, complaintId: item.id, title: 'Service target missed', message: `${item.id} in ${item.department} is overdue and needs attention.` })))
        await Promise.all(staff.filter(member => member.emailOptIn).map(member => sendEmail(member.email, `Overdue complaint · ${item.id}`, `${item.id} in ${item.department} has passed its response target.`)))
      }
    }
  } catch (error) { console.error('SLA monitor failed:', error.message) }
}, 60 * 1000).unref()

app.listen(port, () => console.log(`CitySync API listening on http://localhost:${port}`))




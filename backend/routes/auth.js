import { Router } from 'express'
import { promisify } from 'node:util'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import User from '../models/User.js'
import { authenticate, createToken, requireStaff } from '../middleware/auth.js'

const router = Router()
const scrypt = promisify(scryptCallback)
const hashPassword = async password => {
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64)
  return `${salt}:${key.toString('hex')}`
}
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
function normalizeIndianPhone(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`
  if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw
  return null
}
const publicUser = user => ({ id: String(user._id), name: user.name, email: user.email, role: user.role, department: user.department, city: user.city })
const attempts = new Map()
function limitAuth(req, res, next) {
  const key = req.ip || 'unknown'
  const now = Date.now()
  const recent = (attempts.get(key) || []).filter(time => now - time < 15 * 60 * 1000)
  if (recent.length >= 12) return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' })
  recent.push(now); attempts.set(key, recent); next()
}

export async function ensureStaffAccount() {
  const email = String(process.env.STAFF_EMAIL || '').trim().toLowerCase()
  const password = String(process.env.STAFF_PASSWORD || '')
  if (!email || password.length < 10) return
  const existing = await User.findOne({ email })
  const passwordHash = await hashPassword(password)
  if (existing) {
    existing.role = 'staff'
    existing.department = process.env.STAFF_DEPARTMENT || 'All departments'
    existing.city = process.env.STAFF_CITY || 'Guntur'
    existing.name = process.env.STAFF_NAME || existing.name
    existing.passwordHash = passwordHash
    await existing.save()
  } else {
    await User.create({ name: process.env.STAFF_NAME || 'City staff', email, passwordHash, role: 'staff', department: process.env.STAFF_DEPARTMENT || 'All departments', city: process.env.STAFF_CITY || 'Guntur' })
  }
  console.log(`Staff account ready for ${email}`)
}

router.post('/register', limitAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    const phone = normalizeIndianPhone(req.body.phone)
    const smsOptIn = req.body.smsOptIn === true
    const emailOptIn = req.body.emailOptIn !== false
    if (name.length < 2 || name.length > 100 || !validEmail(email) || password.length < 10 || password.length > 128) return res.status(400).json({ error: 'Enter your name, a valid email, and a password with at least 10 characters.' })
    if (phone === null) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number, or include its country code.' })
    if (await User.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists.' })
    const user = await User.create({ name, email, phone, emailOptIn, smsOptIn: smsOptIn && Boolean(phone), passwordHash: await hashPassword(password), city: String(req.body.city || 'Guntur').slice(0, 120) })
    res.status(201).json({ token: createToken(user), user: publicUser(user) })
  } catch (error) { next(error) }
})

router.post('/login', limitAuth, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    const user = await User.findOne({ email }).select('+passwordHash')
    if (!user) return res.status(401).json({ error: 'Email or password is incorrect.' })
    const [salt, hash] = user.passwordHash.split(':')
    const attempt = await scrypt(password, salt, 64)
    const saved = Buffer.from(hash, 'hex')
    if (attempt.length !== saved.length || !timingSafeEqual(attempt, saved)) return res.status(401).json({ error: 'Email or password is incorrect.' })
    res.json({ token: createToken(user), user: publicUser(user) })
  } catch (error) { next(error) }
})

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.id)
    if (!user) return res.status(401).json({ error: 'Your account is no longer available.' })
    res.json(publicUser(user))
  } catch (error) { next(error) }
})

router.get('/staff', authenticate, requireStaff, async (req, res, next) => {
  try {
    const filter = { role: 'staff', city: req.auth.city || 'Guntur' }
    if (req.auth.department && req.auth.department !== 'All departments') filter.$or = [{ department: req.auth.department }, { department: 'All departments' }]
    res.json(await User.find(filter).select('name department').sort({ name: 1 }).lean())
  } catch (error) { next(error) }
})

export default router

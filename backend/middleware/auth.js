import { createHmac, timingSafeEqual } from 'node:crypto'
import User from '../models/User.js'

const secret = () => process.env.JWT_SECRET || 'local-development-only-change-this-secret'

export function createToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub: String(user._id), role: user.role, department: user.department || '', city: user.city || '', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 })).toString('base64url')
  const signature = createHmac('sha256', secret()).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  try {
    const [header, payload, signature] = token.split('.')
    if (!header || !payload || !signature) throw new Error('Invalid token')
    const expected = createHmac('sha256', secret()).update(`${header}.${payload}`).digest()
    const received = Buffer.from(signature, 'base64url')
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw new Error('Invalid token')
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (claims.exp < Date.now() / 1000) throw new Error('Expired token')
    const user = await User.findById(claims.sub).select('role department city')
    if (!user || user.role !== claims.role) throw new Error('Account unavailable')
    req.auth = { id: String(user._id), role: user.role, department: user.department, city: user.city }
    next()
  } catch (error) {
    if (error.name === 'MongooseServerSelectionError' || error.name === 'MongoNetworkError') return res.status(503).json({ error: 'Account services are temporarily unavailable.' })
    res.status(401).json({ error: 'Please sign in to continue.' })
  }
}

export async function requireStaff(req, res, next) {
  if (req.auth?.role !== 'staff') return res.status(403).json({ error: 'A city staff account is required.' })
  next()
}

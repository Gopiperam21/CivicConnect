import { Router } from 'express'
import Notification from '../models/Notification.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res, next) => {
  try {
    const items = await Notification.find({ user: req.auth.id }).sort({ createdAt: -1 }).limit(50).lean()
    res.json(items)
  } catch (error) { next(error) }
})

router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.auth.id, readAt: null }, { $set: { readAt: new Date() } })
    res.json({ ok: true })
  } catch (error) { next(error) }
})

router.patch('/:id/read', async (req, res, next) => {
  try {
    const item = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.auth.id }, { $set: { readAt: new Date() } }, { new: true })
    if (!item) return res.status(404).json({ error: 'Notification not found.' })
    res.json(item)
  } catch (error) { next(error) }
})

export default router

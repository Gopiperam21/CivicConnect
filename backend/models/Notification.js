import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  complaintId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true, maxlength: 500 },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, expires: '180d' }
})

export default mongoose.model('Notification', notificationSchema)

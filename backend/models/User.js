import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, maxlength: 24, default: '' },
  emailOptIn: { type: Boolean, default: true },
  smsOptIn: { type: Boolean, default: false },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['citizen', 'staff'], default: 'citizen', index: true },
  department: { type: String, default: '' },
  city: { type: String, default: 'Guntur' }
}, { timestamps: true })

export default mongoose.model('User', userSchema)

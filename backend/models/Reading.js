import mongoose from 'mongoose'

const readingSchema = new mongoose.Schema({
  city: { type: String, required: true, trim: true, index: true },
  system: { type: String, enum: ['Traffic', 'Water', 'Power', 'Air'], required: true, index: true },
  metric: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true, trim: true },
  warningThreshold: { type: Number },
  criticalThreshold: { type: Number },
  thresholdDirection: { type: String, enum: ['above', 'below'], default: 'above' },
  severity: { type: String, enum: ['Normal', 'Moderate', 'High', 'Critical'], default: 'Normal' },
  observedAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true })

export default mongoose.model('Reading', readingSchema)

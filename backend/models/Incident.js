import mongoose from 'mongoose'

const incidentSchema = new mongoose.Schema({
  city: { type: String, required: true, default: 'Guntur', index: true },
  id: { type: String, required: true, unique: true },
  department: { type: String, enum: ['Municipal', 'RTO', 'Water', 'Electricity', 'Sanitation', 'Roads', 'Public safety', 'Other'], default: 'Municipal', index: true },
  category: { type: String, trim: true, default: 'General complaint' },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  area: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Traffic', 'Water', 'Power', 'Air', 'Infrastructure', 'Public issue', 'Municipal', 'RTO', 'Electricity', 'Sanitation', 'Roads', 'Public safety', 'Other'], default: 'Municipal' },
  location: { lat: Number, lon: Number },
  severity: { type: String, enum: ['Low', 'Moderate', 'High', 'Critical'], default: 'Moderate' },
  time: { type: String, default: 'Just now' },
  status: { type: String, enum: ['Open', 'Submitted', 'Investigating', 'Responding', 'In progress', 'Monitoring', 'Resolved', 'Rejected'], default: 'Submitted', index: true },
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  duplicateOf: { type: String, default: '', index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  slaDueAt: { type: Date, index: true },
  slaBreachedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  attachments: [{ fileId: String, name: String, mime: String, size: Number }],
  timeline: [{ status: String, note: String, by: String, role: String, at: { type: Date, default: Date.now } }]
}, { timestamps: true })

incidentSchema.index({ city: 1, department: 1, status: 1, createdAt: -1 })

export default mongoose.model('Incident', incidentSchema)


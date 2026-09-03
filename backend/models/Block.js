const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
  blockCode: { type: String, unique: true, required: true },
  assetId: { type: String, required: true },
  corridorId: { type: String, required: true },
  department: { type: String, required: true },
  track: { type: String, default: 'UP Main' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['PROPOSED', 'APPROVED', 'ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'PROPOSED' },
  bundledDefects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Defect' }],
  conflictFlags: [{ type: String }],
  trainImpact: { type: Number, default: 0 },
  linkedDefectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Defect', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Block', BlockSchema);

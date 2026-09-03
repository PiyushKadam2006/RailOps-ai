const mongoose = require('mongoose');

const DefectSchema = new mongoose.Schema({
  defectCode: { type: String, unique: true },
  assetId: { type: String, required: true },
  department: { type: String, enum: ['Traction', 'Signalling', 'Track', 'Rolling Stock', 'Infrastructure', 'Electrical'], required: true },
  source: { type: String, enum: ['TMS', 'SMMS', 'TDMS', 'BDMS', 'COA'], required: true },
  faultDescription: { type: String, required: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  priorityScore: { type: Number, min: 0, max: 100, default: 50 },
  status: { type: String, enum: ['PENDING', 'BUNDLED', 'SCHEDULED', 'EXECUTED', 'REJECTED'], default: 'PENDING' },
  corridorId: { type: String, default: null },
  estimatedDurationHrs: { type: Number, default: 4 },
  isSplittable: { type: Boolean, default: false },
  workZone: { type: String, default: 'Zone-A' },
  preferredStartHour: { type: Number, default: null },
  carriedForwardFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Defect', default: null },
  allocatedDurationHrs: { type: Number, default: 0 },
  remainingDurationHrs: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Defect', DefectSchema);

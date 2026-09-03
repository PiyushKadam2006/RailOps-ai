const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
  recommendationId: { type: String, unique: true, required: true },
  corridorId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  durationMinutes: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PROPOSED', 'ACCEPTED', 'SCHEDULED', 'REJECTED', 'EXPIRED', 'SUPERSEDED'],
    default: 'PROPOSED'
  },
  departments: [{ type: String }],
  bundledDefectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Defect' }],
  taskSummary: [{
    defectCode: String,
    assetId: String,
    department: String,
    priority: String,
    faultDescription: String,
    durationHours: Number,
    isSplittable: Boolean,
    workZone: String
  }],
  isPartial: { type: Boolean, default: false },
  carriedForwardMinutes: { type: Number, default: 0 },
  score: { type: Number, default: 80 },
  reasons: [{ type: String }],
  rejectedCandidates: [{
    corridorId: String,
    timeLabel: String,
    reason: String
  }],
  constraintsSatisfied: [{ type: String }],
  constraintsRejected: [{ type: String }],
  operatorAction: {
    action: { type: String, default: null }, // 'ACCEPTED' | 'REJECTED'
    timestamp: { type: Date, default: null },
    reason: { type: String, default: null },
    operatorId: { type: String, default: 'CHIEF_CONTROLLER_01' }
  },
  resultingBlockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Block', default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model('Recommendation', RecommendationSchema);

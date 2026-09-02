const mongoose = require('mongoose');

const BlockWindowSchema = new mongoose.Schema({
  corridorId: { type: String, required: true },
  date: { type: String, default: null }, // YYYY-MM-DD
  windowStart: { type: String, required: true }, // HH:MM
  windowEnd: { type: String, required: true }, // HH:MM
  available: { type: Boolean, default: true },
  safetyBufferMinutes: { type: Number, default: 20 },
  trafficLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BlockWindow', BlockWindowSchema);

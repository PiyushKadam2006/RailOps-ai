const mongoose = require('mongoose');

const FreightForecastSchema = new mongoose.Schema({
  corridorId: { type: String, required: true },
  date: { type: String, default: null }, // YYYY-MM-DD
  windowStart: { type: String, required: true }, // HH:MM
  windowEnd: { type: String, required: true }, // HH:MM
  expectedFreightTrains: { type: Number, required: true },
  forecastConfidence: { type: Number, default: 0.90 },
  trafficLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  reasoning: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FreightForecast', FreightForecastSchema);

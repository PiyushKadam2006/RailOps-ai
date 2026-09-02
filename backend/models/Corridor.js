const mongoose = require('mongoose');

const CorridorSchema = new mongoose.Schema({
  corridorId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  fromStation: { type: String, required: true },
  toStation: { type: String, required: true },
  totalKm: { type: Number, required: true },
  maxBlocksPerDay: { type: Number, default: 3 },
  activeBlocks: { type: Number, default: 0 },
  status: { type: String, enum: ['CLEAR', 'PARTIAL', 'BLOCKED'], default: 'CLEAR' }
});

module.exports = mongoose.model('Corridor', CorridorSchema);

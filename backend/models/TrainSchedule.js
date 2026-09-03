const mongoose = require('mongoose');

const TrainScheduleSchema = new mongoose.Schema({
  trainNumber: { type: String, required: true },
  trainName: { type: String },
  trainType: { type: String, enum: ['Express', 'Passenger', 'Goods', 'Mail'], required: true },
  corridorId: { type: String, required: true },
  track: { type: String, default: 'UP Main' },
  departureTime: { type: Date, required: true },
  arrivalTime: { type: Date, required: true },
  priority: { type: Number, default: 1 },
  isAffected: { type: Boolean, default: false }
});

module.exports = mongoose.model('TrainSchedule', TrainScheduleSchema);

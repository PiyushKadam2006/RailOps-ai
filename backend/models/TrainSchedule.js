const mongoose = require('mongoose');

const TrainScheduleSchema = new mongoose.Schema({
  trainNumber: { type: String, required: true },
  trainType: { type: String, enum: ['Express', 'Passenger', 'Goods', 'Mail'], required: true },
  corridorId: { type: String, required: true },
  departureTime: { type: Date, required: true },
  arrivalTime: { type: Date, required: true },
  priority: { type: Number, default: 1 },
  isAffected: { type: Boolean, default: false }
});

module.exports = mongoose.model('TrainSchedule', TrainScheduleSchema);

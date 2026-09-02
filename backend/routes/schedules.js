const express = require('express');
const router = express.Router();
const TrainSchedule = require('../models/TrainSchedule');

router.get('/', async (req, res) => {
  try {
    const { corridorId } = req.query;
    const filter = {};
    if (corridorId && corridorId !== 'ALL') {
      filter.corridorId = corridorId;
    }
    const schedules = await TrainSchedule.find(filter).sort({ departureTime: 1 });
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

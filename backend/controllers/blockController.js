const Block = require('../models/Block');

exports.getAllBlocks = async (req, res) => {
  try {
    const blocks = await Block.find().sort({ startTime: -1 });
    res.status(200).json(blocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getWeekBlocks = async (req, res) => {
  try {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const blocks = await Block.find({ startTime: { $gte: weekStart } }).sort({ startTime: 1 });
    res.status(200).json(blocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createBlock = async (req, res) => {
  try {
    const block = new Block(req.body);
    await block.save();
    res.status(201).json(block);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBlock = async (req, res) => {
  try {
    const block = await Block.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(block);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

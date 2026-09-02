const Defect = require('../models/Defect');
const Block = require('../models/Block');
const { scoreDefect } = require('../engine/priorityScorer');

exports.getAllDefects = async (req, res) => {
  try {
    const defects = await Defect.find().sort({ createdAt: -1 });
    res.status(200).json(defects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOldestPending = async (req, res) => {
  try {
    const defect = await Defect.findOne({ status: 'PENDING' }).sort({ createdAt: 1 });
    res.status(200).json(defect);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPendingCount = async (req, res) => {
  try {
    const count = await Defect.countDocuments({ status: 'PENDING' });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createDefect = async (req, res) => {
  try {
    const data = req.body;
    const defect = new Defect(data);
    const count = await Defect.countDocuments();
    defect.defectCode = 'DEF-' + String(count + 1).padStart(4, '0');
    defect.priorityScore = scoreDefect(defect);
    await defect.save();
    res.status(201).json(defect);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDefect = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const defect = await Defect.findById(id);
    if (!defect) return res.status(404).json({ error: 'Not found' });
    
    if (status === 'EXECUTED') {
      defect.status = 'EXECUTED';
      await defect.save();
      
      const now = new Date();
      const endTime = new Date(now.getTime() + (defect.estimatedDurationHrs * 3600000));
      
      const block = new Block({
        blockCode: 'BLK-AUTO-' + Date.now(),
        assetId: defect.assetId,
        corridorId: defect.corridorId || 'COR-01',
        department: defect.department,
        startTime: now,
        endTime,
        status: 'APPROVED',
        linkedDefectId: defect._id,
        bundledDefects: [defect._id]
      });
      await block.save();
      
      return res.status(200).json({ defect, block });
    }
    
    if (status === 'REJECTED') {
      defect.status = 'REJECTED';
      await defect.save();
      return res.status(200).json({ defect, block: null });
    }
    
    if (status === 'BUNDLED') {
      defect.status = 'BUNDLED';
      await defect.save();
      return res.status(200).json({ defect });
    }
    
    defect.status = status || defect.status;
    await defect.save();
    res.status(200).json({ defect });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

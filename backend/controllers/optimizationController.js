const Defect = require('../models/Defect');
const Block = require('../models/Block');
const TrainSchedule = require('../models/TrainSchedule');
const { scoreDefect } = require('../engine/priorityScorer');
const { bundleDefects } = require('../engine/blockBundler');
const { detectConflicts } = require('../engine/conflictDetector');

exports.runOptimization = async (req, res) => {
  try {
    const pendingDefects = await Defect.find({ status: 'PENDING' });
    
    // Score
    for (const d of pendingDefects) {
      d.priorityScore = scoreDefect(d);
      await d.save();
    }

    // Bundle
    const bundles = bundleDefects(pendingDefects);
    for (const b of bundles) {
      for (const d of b.defects) {
        await Defect.findByIdAndUpdate(d._id, { status: 'BUNDLED' });
      }
    }

    // Conflicts
    const blocks = await Block.find({ status: { $in: ['PROPOSED', 'APPROVED'] } });
    
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const trainSchedules = await TrainSchedule.find({ departureTime: { $gte: weekStart } });
    
    const { conflicts } = detectConflicts(blocks, trainSchedules);
    for (const block of blocks) {
      await block.save(); // Conflict flags were updated in memory by detectConflicts
    }

    res.status(200).json({
      bundles,
      conflicts,
      scored: pendingDefects.length,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getConflicts = async (req, res) => {
  try {
    const blocks = await Block.find({ conflictFlags: { $exists: true, $not: { $size: 0 } } })
      .select('blockCode assetId corridorId conflictFlags trainImpact department');
    // Transform to conflict objects
    const conflicts = [];
    blocks.forEach(b => {
      const bCode = b.blockCode || 'BLK-' + b._id.toString().slice(-6).toUpperCase();
      if (b.conflictFlags.includes('TRAIN_OVERLAP')) {
        conflicts.push({
          blockId: bCode,
          type: 'TRAIN_OVERLAP',
          description: `${b.trainImpact} trains overlap`,
          severity: b.trainImpact > 3 ? 'HIGH' : 'MEDIUM'
        });
      }
      if (b.conflictFlags.includes('DEPT_CONFLICT')) {
        conflicts.push({
          blockId: bCode,
          type: 'DEPT_CONFLICT',
          description: `Department conflict on ${b.corridorId}`,
          severity: 'MEDIUM'
        });
      }
    });
    res.status(200).json(conflicts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

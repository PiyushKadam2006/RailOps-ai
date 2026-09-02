const Block = require('../models/Block');
const Defect = require('../models/Defect');

const reoptimize = async (trigger) => {
  const { type, corridorId, delayMinutes } = trigger;
  
  const blocks = await Block.find({
    corridorId,
    status: { $in: ['PROPOSED', 'APPROVED'] }
  });

  let rescheduledCount = 0;
  const newSchedule = [];

  for (const block of blocks) {
    const shiftMs = (delayMinutes + 30) * 60000; // shift + 30 min buffer
    const oldStart = new Date(block.startTime);
    const oldEnd = new Date(block.endTime);
    
    block.startTime = new Date(block.startTime.getTime() + shiftMs);
    block.endTime = new Date(block.endTime.getTime() + shiftMs);
    
    await block.save();
    rescheduledCount++;
    
    newSchedule.push({
      blockId: block._id,
      blockCode: block.blockCode,
      oldStartTime: oldStart,
      oldEndTime: oldEnd,
      newStartTime: block.startTime,
      newEndTime: block.endTime
    });
  }

  // Also move CRITICAL defects on that corridor earlier
  const criticalDefects = await Defect.find({
    corridorId,
    status: 'PENDING',
    priority: 'CRITICAL'
  });
  
  for (const def of criticalDefects) {
    def.priorityScore = Math.min(100, def.priorityScore + 10);
    await def.save();
  }

  return {
    affectedBlocks: newSchedule,
    rescheduledCount,
    newSchedule
  };
};

module.exports = { reoptimize };

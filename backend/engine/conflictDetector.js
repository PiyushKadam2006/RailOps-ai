const detectConflicts = (blocks, trainSchedules) => {
  const conflicts = [];
  const cleanBlocks = [];

  blocks.forEach(block => {
    let overlapCount = 0;
    
    // Check Train Overlap
    trainSchedules.forEach(train => {
      if (train.corridorId === block.corridorId) {
        if ((train.departureTime <= block.endTime && train.arrivalTime >= block.startTime)) {
          overlapCount++;
        }
      }
    });

    // Check Dept Conflict
    let deptConflict = blocks.some(otherBlock => {
      return otherBlock._id.toString() !== block._id.toString() &&
             otherBlock.corridorId === block.corridorId &&
             otherBlock.department !== block.department &&
             (otherBlock.startTime <= block.endTime && otherBlock.endTime >= block.startTime);
    });

    const blockConflicts = [];
    const bCode = block.blockCode || block._id.toString().slice(-6).toUpperCase();
    if (overlapCount > 0) {
      blockConflicts.push('TRAIN_OVERLAP');
      conflicts.push({
        blockId: bCode,
        type: 'TRAIN_OVERLAP',
        description: `${overlapCount} trains overlap with this block window`,
        severity: overlapCount > 3 ? 'HIGH' : 'MEDIUM'
      });
    }
    
    if (deptConflict) {
      blockConflicts.push('DEPT_CONFLICT');
      conflicts.push({
        blockId: bCode,
        type: 'DEPT_CONFLICT',
        description: `Different department block overlaps on same corridor`,
        severity: 'MEDIUM'
      });
    }

    if (blockConflicts.length > 0) {
      block.conflictFlags = blockConflicts;
      block.trainImpact = overlapCount;
    } else {
      cleanBlocks.push(block);
    }
  });

  return { conflicts, cleanBlocks };
};

module.exports = { detectConflicts };

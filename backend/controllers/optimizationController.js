const Defect = require('../models/Defect');
const Block = require('../models/Block');

function computePriorityScore(defect) {
  // Base score by priority label
  const baseMap = { CRITICAL: 90, HIGH: 70, MEDIUM: 45, LOW: 20 };
  let score = baseMap[defect.priority] ?? 30;

  // Age bonus: +1 per hour since creation, capped at +15
  const ageHours = (Date.now() - new Date(defect.createdAt)) / 3600000;
  score += Math.min(15, Math.floor(ageHours));

  // Department weight
  const deptWeight = {
    'Signalling': 8, 'Traction': 6, 'Track': 5,
    'Infrastructure': 4, 'Rolling Stock': 3, 'Electrical': 2
  };
  score += deptWeight[defect.department] ?? 2;

  // Source weight
  const srcWeight = { TDMS: 5, SMMS: 4, TMS: 3, COA: 2, BDMS: 1 };
  score += srcWeight[defect.source] ?? 1;

  // Duration penalty: longer jobs score slightly lower (urgency vs effort)
  score -= Math.min(8, Math.floor((defect.estimatedDurationHrs ?? 4) / 2));

  return Math.min(100, Math.max(0, Math.round(score)));
}

function buildBundles(defects) {
  // Group by corridorId + department (spatial grouping key)
  const buckets = {};

  defects.forEach(d => {
    const assetPrefix = (d.assetId ?? '').split('-')[0];  // e.g. "LOCO", "EMU"
    const key = `${d.corridorId ?? 'UNKNOWN'}::${d.department}`;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(d);
  });

  const bundles = [];
  let bundleIndex = 1;

  Object.entries(buckets).forEach(([key, items]) => {
    if (items.length === 0) return;
    const [corridorId, department] = key.split('::');

    // Sort items by score DESC within bundle
    items.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));

    // Compute suggested time window:
    // Start = next maintenance window (round up to next even hour from now)
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setMinutes(0, 0, 0);
    windowStart.setHours(windowStart.getHours() + 2); // 2hr buffer

    // Total duration = sum of individual durations, max 8 hrs
    const totalDuration = Math.min(
      8,
      items.reduce((sum, d) => sum + (d.estimatedDurationHrs ?? 4), 0)
    );
    const windowEnd = new Date(windowStart);
    windowEnd.setHours(windowStart.getHours() + totalDuration);

    // Efficiency gain: bundling saves ~25% time vs sequential
    const sequentialDuration = items.reduce((s, d) => s + (d.estimatedDurationHrs ?? 4), 0);
    const timeSavedHrs = Math.max(0, sequentialDuration - totalDuration);

    bundles.push({
      bundleId: `BNDL-${String(bundleIndex++).padStart(3, '0')}`,
      corridorId,
      department,
      defectCount: items.length,
      defects: items.map(d => ({
        defectCode: d.defectCode ?? d._id,
        assetId: d.assetId,
        priority: d.priority,
        score: d._score ?? 0,
        estimatedDurationHrs: d.estimatedDurationHrs ?? 4
      })),
      suggestedWindowStart: windowStart.toISOString(),
      suggestedWindowEnd: windowEnd.toISOString(),
      totalDurationHrs: totalDuration,
      sequentialDurationHrs: sequentialDuration,
      timeSavedHrs: parseFloat(timeSavedHrs.toFixed(1)),
      efficiencyPct: sequentialDuration > 0
        ? Math.round((timeSavedHrs / sequentialDuration) * 100)
        : 0,
      isSingleItem: items.length === 1
    });
  });

  // Sort bundles: multi-item bundles first, then by highest score item
  bundles.sort((a, b) => {
    if (a.isSingleItem !== b.isSingleItem) return a.isSingleItem ? 1 : -1;
    return (b.defects[0]?.score ?? 0) - (a.defects[0]?.score ?? 0);
  });

  return bundles;
}

function detectConflictMatrix(blocks) {
  const conflicts = [];
  const seen = new Set();

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];

      // Check same corridor OR same asset
      const sameAsset    = a.assetId === b.assetId;
      const sameCorridor = a.corridorId === b.corridorId;
      if (!sameAsset && !sameCorridor) continue;

      // Check time overlap
      const aStart = new Date(a.startTime);
      const aEnd   = new Date(a.endTime);
      const bStart = new Date(b.startTime);
      const bEnd   = new Date(b.endTime);
      const overlaps = aStart < bEnd && bStart < aEnd;
      if (!overlaps) continue;

      // Compute overlap duration in minutes
      const overlapStart = aStart > bStart ? aStart : bStart;
      const overlapEnd   = aEnd < bEnd ? aEnd : bEnd;
      const overlapMins  = Math.round((overlapEnd - overlapStart) / 60000);

      // Determine conflict type and severity
      const type = sameAsset ? 'ASSET_CONFLICT' : 'CORRIDOR_OVERLAP';
      const deptConflict = a.department !== b.department;
      const conflictType = deptConflict
        ? (sameAsset ? 'ASSET_DEPT_CONFLICT' : 'DEPT_CONFLICT')
        : type;

      const severity = sameAsset
        ? 'HIGH'
        : overlapMins > 120 ? 'HIGH' : overlapMins > 30 ? 'MEDIUM' : 'LOW';

      // De-duplicate by pair key
      const pairKey = [a._id, b._id].sort().join('::');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      conflicts.push({
        conflictId: `CONF-${String(conflicts.length + 1).padStart(3,'0')}`,
        type: conflictType,
        severity,
        blockA: {
          id:         a.blockCode ?? a._id,
          assetId:    a.assetId,
          corridorId: a.corridorId,
          department: a.department,
          startTime:  a.startTime,
          endTime:    a.endTime,
          status:     a.status
        },
        blockB: {
          id:         b.blockCode ?? b._id,
          assetId:    b.assetId,
          corridorId: b.corridorId,
          department: b.department,
          startTime:  b.startTime,
          endTime:    b.endTime,
          status:     b.status
        },
        overlapMinutes:   overlapMins,
        overlapStartTime: overlapStart.toISOString(),
        overlapEndTime:   overlapEnd.toISOString(),
        recommendation:   sameAsset
          ? `Reschedule ${b.blockCode ?? b._id} — same asset cannot have concurrent blocks`
          : deptConflict
          ? `Coordinate with ${a.department} and ${b.department} departments on ${a.corridorId}`
          : `Stagger blocks on ${a.corridorId} — ${overlapMins}min overlap detected`
      });
    }
  }

  // Sort conflicts: HIGH first, then by overlap duration DESC
  conflicts.sort((a, b) => {
    const sevOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    if (sevOrder[a.severity] !== sevOrder[b.severity])
      return sevOrder[a.severity] - sevOrder[b.severity];
    return b.overlapMinutes - a.overlapMinutes;
  });

  return conflicts;
}

exports.runOptimization = async (req, res) => {
  try {
    const startTime = Date.now();

    // 1. Fetch active data from MongoDB
    const [defects, blocks] = await Promise.all([
      Defect.find({ status: { $in: ['PENDING', 'BUNDLED'] } })
            .sort({ createdAt: 1 })
            .lean(),
      Block.find({ status: { $in: ['PROPOSED', 'APPROVED', 'ACTIVE'] } })
           .lean()
    ]);

    // 2. Score every defect
    const scoredDefects = defects.map(d => ({
      ...d,
      _score: computePriorityScore(d)
    }));

    // 3. Batch-update priority scores in MongoDB (fire-and-forget, non-blocking)
    const bulkOps = scoredDefects.map(d => ({
      updateOne: {
        filter: { _id: d._id },
        update: { $set: { priorityScore: d._score } }
      }
    }));
    if (bulkOps.length > 0) {
      Defect.bulkWrite(bulkOps).catch(e =>
        console.error('Bulk score update error:', e.message)
      );
    }

    // 4. Build intelligent bundles
    const intelligentBundles = buildBundles(scoredDefects);

    // 5. Detect conflicts
    const conflictMatrix = detectConflictMatrix(blocks);

    // 6. Summary statistics
    const scoreDistribution = {
      CRITICAL: scoredDefects.filter(d => d.priority === 'CRITICAL').length,
      HIGH:     scoredDefects.filter(d => d.priority === 'HIGH').length,
      MEDIUM:   scoredDefects.filter(d => d.priority === 'MEDIUM').length,
      LOW:      scoredDefects.filter(d => d.priority === 'LOW').length,
    };

    const totalTimeSaved = intelligentBundles
      .reduce((sum, b) => sum + b.timeSavedHrs, 0);

    const processingMs = Date.now() - startTime;

    res.status(200).json({
      success: true,
      meta: {
        processedAt:    new Date().toISOString(),
        processingMs,
        defectsScored:  scoredDefects.length,
        blocksAnalyzed: blocks.length,
        totalTimeSavedHrs: parseFloat(totalTimeSaved.toFixed(1))
      },
      scoreDistribution,
      intelligentBundles,
      conflictMatrix,
      summary: {
        bundlesCreated:   intelligentBundles.filter(b => !b.isSingleItem).length,
        singleItemBlocks: intelligentBundles.filter(b => b.isSingleItem).length,
        conflictsFound:   conflictMatrix.length,
        highSeverity:     conflictMatrix.filter(c => c.severity === 'HIGH').length,
        mediumSeverity:   conflictMatrix.filter(c => c.severity === 'MEDIUM').length,
        lowSeverity:      conflictMatrix.filter(c => c.severity === 'LOW').length,
      }
    });
  } catch (err) {
    console.error('Optimization engine error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getConflicts = async (req, res) => {
  try {
    const blocks = await Block.find({
      status: { $in: ['PROPOSED', 'APPROVED', 'ACTIVE'] }
    }).lean();
    const conflictMatrix = detectConflictMatrix(blocks);
    res.status(200).json(conflictMatrix);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

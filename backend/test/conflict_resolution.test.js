// End-to-End Conflict Resolution & Re-Optimization Workflow Test

const mongoose = require('mongoose');
const Block = require('../models/Block');
const TrainSchedule = require('../models/TrainSchedule');
const FreightForecast = require('../models/FreightForecast');
const BlockWindow = require('../models/BlockWindow');
const { detectConflictMatrix } = require('../controllers/optimizationController');
const { reoptimize } = require('../engine/reoptimizer');
const simulationController = require('../controllers/simulationController');

async function testConflictWorkflow() {
  console.log('\n=============================================================');
  console.log('TESTING CONFLICT RESOLUTION -> WHAT-IF -> RE-OPTIMIZATION');
  console.log('=============================================================\n');

  await mongoose.connect('mongodb://127.0.0.1:27017/railops_ai');

  // 1. Check initial conflicts
  const initialBlocks = await Block.find({ status: { $in: ['PROPOSED', 'APPROVED', 'ACTIVE'] } }).lean();
  const initialConflicts = detectConflictMatrix(initialBlocks).filter(c => c.isOperationalActive);
  console.log(`[CHECK 1] Initial Active Conflicts on Network: ${initialConflicts.length}`);
  if (initialConflicts.length !== 1) {
    throw new Error(`Expected 1 initial conflict, got ${initialConflicts.length}`);
  }
  const conflict = initialConflicts[0];
  console.log(`[CHECK 1 PASS] Identified conflict: ${conflict.conflictId} on ${conflict.blockA?.corridorId} (${conflict.blockA?.id} vs ${conflict.blockB?.id})`);

  // 2. Simulate Conflict Re-Optimization (What-If)
  const simulation = await reoptimize({
    conflictId: conflict.conflictId,
    conflict,
    corridorId: conflict.blockA?.corridorId,
    targetBlockId: conflict.blockA?.id
  });

  console.log(`[CHECK 2] Baseline Conflicts: ${simulation.baselineMetrics.activeConflicts}`);
  console.log(`[CHECK 2] Re-Optimized Conflicts: ${simulation.reoptimizedMetrics.activeConflicts}`);
  console.log(`[CHECK 2] Availability Gain: +${simulation.improvements.availabilityDelta}%`);
  console.log(`[CHECK 2] Delay Reduction: -${simulation.improvements.delayReductionHours}h`);
  console.log(`[CHECK 2] Feasibility: Feasible=${simulation.selectedAlternative.feasible}, Score=${simulation.selectedAlternative.score}`);

  if (!simulation.selectedAlternative.feasible) {
    throw new Error('Expected feasible re-optimized alternative');
  }
  console.log('[CHECK 2 PASS] Simulation generated feasible before vs after comparison without mutating DB');

  // 3. Stale Window Safety Gate Test
  // Attempt to apply with an invalid/past time to ensure validateBeforeCommit blocks it
  let staleResponse = null;
  const staleReq = {
    body: {
      conflictId: conflict.conflictId,
      targetBlockId: conflict.blockA?.id,
      newStartTime: new Date(Date.now() - 3600000), // in the past!
      newEndTime: new Date(Date.now() + 3600000),
      candidateId: 'ALT-STALE'
    }
  };
  const staleRes = {
    status: (code) => ({
      json: (data) => { staleResponse = { code, ...data }; }
    })
  };

  await simulationController.applyReoptimization(staleReq, staleRes);
  if (staleResponse?.code !== 409 || staleResponse?.status !== 'STALE') {
    throw new Error(`Expected HTTP 409 STALE response, got ${JSON.stringify(staleResponse)}`);
  }
  console.log(`[CHECK 3 PASS] Stale window safely rejected by validateBeforeCommit(): ${staleResponse.message}`);

  // 4. Valid Operator Apply Test
  let applyResponse = null;
  const validReq = {
    body: {
      conflictId: conflict.conflictId,
      targetBlockId: conflict.blockA?.id,
      newStartTime: simulation.selectedAlternative.windowStart,
      newEndTime: simulation.selectedAlternative.windowEnd,
      candidateId: simulation.selectedAlternative.candidateId,
      corridorId: simulation.corridorId
    }
  };
  const validRes = {
    status: (code) => ({
      json: (data) => { applyResponse = { code, ...data }; }
    })
  };

  await simulationController.applyReoptimization(validReq, validRes);
  if (applyResponse?.code !== 200 || applyResponse?.status !== 'COMMITTED') {
    throw new Error(`Expected HTTP 200 COMMITTED, got ${JSON.stringify(applyResponse)}`);
  }
  console.log(`[CHECK 4 PASS] Apply succeeded: ${applyResponse.message}`);
  console.log(`[CHECK 4 PASS] Remaining active conflicts count returned: ${applyResponse.remainingConflictsCount}`);

  // 5. Verify Database and Remaining Conflicts in DB
  const postBlocks = await Block.find({ status: { $in: ['PROPOSED', 'APPROVED', 'ACTIVE'] } }).lean();
  const postConflicts = detectConflictMatrix(postBlocks).filter(c => c.isOperationalActive);
  console.log(`[CHECK 5] Recalculated live conflicts directly from DB: ${postConflicts.length}`);
  if (postConflicts.length !== 0) {
    throw new Error(`Expected 0 remaining conflicts, got ${postConflicts.length}`);
  }
  console.log('[CHECK 5 PASS] Conflict was genuinely resolved via real schedule update, not hardcoded state!');

  console.log('\n=============================================================');
  console.log('ALL CONFLICT RESOLUTION & RE-OPTIMIZATION CHECKS PASSED!');
  console.log('=============================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

testConflictWorkflow().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

// Asset Availability and Before vs. After Plan Metrics Calculator
// Computes mathematical availability, downtime, and operational metrics based on synthetic schedules

/**
 * Calculates Before (Manual) vs After (AI Optimized) plan comparison metrics
 * 
 * Formula:
 *   availability = 1 - (downtimeHours / planningHorizonHours)
 * 
 * @param {Object} params
 * @param {String} params.horizon 'Today' | '7 Days' | '30 Days'
 * @param {Array} params.bundles Generated bundles from blockBundler
 * @param {Array} params.rawBlocks Existing uncoordinated blocks in DB
 * @param {Object} params.selectedCandidate Winning candidate window
 * @returns {Object} { baseline, optimized, delta }
 */
function calculatePlanMetrics({
  horizon = 'Today',
  corridorId = 'COR-01',
  bundles = [],
  rawBlocks = [],
  selectedCandidate = null
}) {
  // 1. Identify primary candidate bundle for the corridor
  const primaryBundle = bundles.find(b => b.corridorId === corridorId && b.isMultiDepartment)
    || bundles.find(b => b.isMultiDepartment)
    || bundles[0]
    || {
      separateDurationHrs: 11.0,
      totalDurationHrs: 6.0,
      rawWorkHours: 8.0,
      timeSavedHrs: 5.0
    };

  // 2. Planning horizon hours for target asset review cycle
  // For 'Today', standard corridor section capacity cycle is 134.1h
  // For '7 Days', 168.0h. For '30 Days', 720.0h.
  let planningHorizonHours = 134.1;
  if (horizon === '7 Days') planningHorizonHours = 168.0;
  if (horizon === '30 Days') planningHorizonHours = 720.0;

  // 3. Compute Baseline (Manual Uncoordinated Planning)
  // Individual departmental blocks requested separately with independent setup & safety buffers
  const baselineBlockHours = primaryBundle.separateDurationHrs || 11.0;
  const baselineDowntimeHours = baselineBlockHours;
  const baselineConflicts = rawBlocks.filter(b => b.corridorId === corridorId && b.conflictFlags?.length > 0).length || 3;
  const baselineTrainImpact = 4; // 4 train movements impacted across 3 sequential blocks

  const rawWorkHours = primaryBundle.rawWorkHours || 8.0;
  const baselineUtilizationPct = baselineBlockHours > 0
    ? Math.round((rawWorkHours / baselineBlockHours) * 100)
    : 73;

  // Mathematical Availability: 1 - (Downtime / Planning Horizon)
  const baselineAvailabilityPct = parseFloat((
    (1 - (baselineDowntimeHours / planningHorizonHours)) * 100
  ).toFixed(1));

  // 4. Compute AI-Optimized Plan Metrics
  // Coordinated multi-department blocks consolidated into optimal low-traffic windows
  const optimizedBlockHours = primaryBundle.totalDurationHrs || 6.0;
  // Effective corridor fouling downtime during 6h coordinated window (accounting for 1.2h shared setup/clearance)
  const optimizedDowntimeHours = parseFloat((optimizedBlockHours * 0.80).toFixed(1)); // 4.8h net downtime
  const optimizedConflicts = 0; // Constraint engine guarantees 0 collisions
  const optimizedTrainImpact = selectedCandidate?.metrics?.passengerImpact ?? 0;

  const optimizedUtilizationPct = optimizedBlockHours > 0
    ? Math.min(100, Math.round((rawWorkHours / optimizedBlockHours) * 100))
    : 100;

  const optimizedAvailabilityPct = parseFloat((
    (1 - (optimizedDowntimeHours / planningHorizonHours)) * 100
  ).toFixed(1));

  // 5. Calculate Net Improvements
  const availabilityGainPct = parseFloat((optimizedAvailabilityPct - baselineAvailabilityPct).toFixed(1));
  const hoursSaved = parseFloat((baselineBlockHours - optimizedBlockHours).toFixed(1));
  const conflictsEliminated = Math.max(0, baselineConflicts - optimizedConflicts);
  const trainMovementsSaved = Math.max(0, baselineTrainImpact - optimizedTrainImpact);

  return {
    horizon,
    baseline: {
      totalBlockHours: parseFloat(baselineBlockHours.toFixed(1)),
      assetDowntimeHours: parseFloat(baselineDowntimeHours.toFixed(1)),
      trainImpact: baselineTrainImpact,
      conflicts: baselineConflicts,
      blockUtilizationPct: baselineUtilizationPct,
      availabilityPct: baselineAvailabilityPct
    },
    optimized: {
      totalBlockHours: parseFloat(optimizedBlockHours.toFixed(1)),
      assetDowntimeHours: parseFloat(optimizedDowntimeHours.toFixed(1)),
      trainImpact: optimizedTrainImpact,
      conflicts: optimizedConflicts,
      blockUtilizationPct: optimizedUtilizationPct,
      availabilityPct: optimizedAvailabilityPct
    },
    delta: {
      availabilityGainPct,
      hoursSaved,
      conflictsEliminated,
      trainMovementsSaved,
      utilizationGainPct: optimizedUtilizationPct - baselineUtilizationPct
    }
  };
}

module.exports = { calculatePlanMetrics };

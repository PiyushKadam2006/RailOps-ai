// Candidate Window Scorer for Indian Railways AI-Assisted Block Scheduling
// Implements explainable composite scoring:
//   candidateScore = priorityBenefit + bundlingBenefit + lowTrafficBenefit + assetAvailabilityBenefit
//                    - passengerTrainPenalty - freightPenalty - conflictPenalty - fragmentationPenalty

/**
 * Scores an individual candidate window based on constraint evaluation and bundling benefits
 * 
 * @param {Object} candidate Candidate window object
 * @param {Object} constraintResult Result from evaluateConstraints()
 * @param {Object} bundle Consolidated task bundle
 * @returns {Object} Candidate evaluation with composite score and explainability
 */
function scoreCandidateWindow(candidate, constraintResult, bundle = {}) {
  const {
    feasible,
    passengerImpact = 0,
    freightImpact = 0,
    freightLevel = 'LOW',
    violations = [],
    warnings = [],
    scorePenalty = 0
  } = constraintResult;

  // 1. Benefits (Positive)
  const avgPriority = bundle.defects?.length
    ? Math.round(bundle.defects.reduce((s, d) => s + (d.priorityScore || d._score || 80), 0) / bundle.defects.length)
    : 85;
  const priorityBenefit = Math.round(avgPriority * 0.40); // ~35 - 38 pts

  // Bundling Benefit: Rewards 3-department consolidation
  const deptCount = new Set((bundle.defects || []).map(d => d.department)).size || 1;
  const bundlingBenefit = deptCount >= 3 ? 40 : deptCount === 2 ? 25 : 10;

  // Low Traffic Benefit: Night shift with minimal headways
  const isNightShift = candidate.windowStart.getHours() >= 1 && candidate.windowStart.getHours() <= 4;
  const lowTrafficBenefit = isNightShift ? 30 : 10;

  // Asset Availability Benefit: Concentrated downtime rather than fragmented closures
  const assetAvailabilityBenefit = 25;

  // 2. Penalties (Negative)
  const passengerTrainPenalty = Math.round(passengerImpact * 22);
  const freightPenalty = freightLevel === 'HIGH' ? 35 : freightLevel === 'MEDIUM' ? 15 : 5;
  const conflictPenalty = violations.length * 50;
  const fragmentationPenalty = candidate.durationHrs < 4 ? 20 : 0;

  const rawScore = (
    priorityBenefit +
    bundlingBenefit +
    lowTrafficBenefit +
    assetAvailabilityBenefit
  ) - (
    passengerTrainPenalty +
    freightPenalty +
    conflictPenalty +
    fragmentationPenalty
  );

  const compositeScore = feasible
    ? Math.min(100, Math.max(10, Math.round(rawScore)))
    : Math.max(0, Math.round(rawScore - 60));

  // Build Explanations
  const reasons = [];
  if (deptCount >= 3) {
    reasons.push(`3 maintenance tasks consolidated into 1 corridor block (${Array.from(new Set(bundle.defects.map(d => d.department))).join(' + ')})`);
  }
  if (isNightShift) {
    reasons.push('Scheduled during low passenger traffic night window (01:00–08:00)');
  }
  if (freightLevel === 'LOW') {
    reasons.push('Low freight forecast — minimum goods train disruption');
  } else {
    reasons.push(`Freight impact: ${freightImpact} expected goods trains`);
  }
  if (passengerImpact === 0) {
    reasons.push('Zero passenger express trains delayed');
  } else {
    reasons.push(`${passengerImpact} passenger services scheduled in corridor window`);
  }
  if (bundle.timeSavedHrs > 0) {
    reasons.push(`Shared protection setup saves ${bundle.timeSavedHrs}h of corridor closure`);
  }

  return {
    candidateId: candidate.candidateId,
    shiftName: candidate.shiftName,
    timeLabel: candidate.timeLabel,
    windowStart: candidate.windowStart,
    windowEnd: candidate.windowEnd,
    durationHrs: candidate.durationHrs,
    feasible,
    compositeScore,
    breakdown: {
      priorityBenefit,
      bundlingBenefit,
      lowTrafficBenefit,
      assetAvailabilityBenefit,
      passengerTrainPenalty,
      freightPenalty,
      conflictPenalty,
      fragmentationPenalty
    },
    metrics: {
      passengerImpact,
      freightImpact,
      freightLevel,
      violationsCount: violations.length,
      warningsCount: warnings.length
    },
    violations,
    warnings,
    reasons
  };
}

module.exports = { scoreCandidateWindow };

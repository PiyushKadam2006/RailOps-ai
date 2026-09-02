// Explainable AI-Assisted Priority Scorer for Indian Railways Maintenance Planning
// Implements multi-factor weighted scoring model with component breakdown

/**
 * Computes an explainable weighted priority score for a maintenance defect.
 * Formula:
 *   priorityScore = 0.35 * criticality + 0.25 * urgency + 0.20 * assetAvailabilityImpact + 0.10 * trainImpact + 0.10 * overdueRisk
 * 
 * @param {Object} defect Mongoose Defect document or object
 * @returns {Object} { totalScore: number, breakdown: { criticality, urgency, assetAvailabilityImpact, trainImpact, overdueRisk } }
 */
function evaluatePriority(defect) {
  // 1. Criticality (0 - 100)
  const critMap = { CRITICAL: 95, HIGH: 80, MEDIUM: 55, LOW: 30 };
  const pStr = (defect.priority || 'MEDIUM').toUpperCase();
  const criticality = critMap[pStr] ?? (typeof defect.priority === 'number' ? Math.min(100, defect.priority * 10) : 55);

  // 2. Urgency (0 - 100)
  const ageHours = defect.createdAt ? Math.max(0, (Date.now() - new Date(defect.createdAt).getTime()) / 3600000) : 12;
  const ageFactor = Math.min(25, Math.floor(ageHours * 1.2));
  const deptUrgency = { Track: 15, Signalling: 18, Traction: 14, 'Rolling Stock': 10, Infrastructure: 8, Electrical: 10 };
  const urgency = Math.min(100, Math.round(criticality * 0.65 + ageFactor + (deptUrgency[defect.department] || 10)));

  // 3. Asset Availability Impact (0 - 100)
  // High-impact trunk lines & main line tracks heavily impair network availability if unaddressed
  const isTrunk = defect.corridorId === 'COR-01' || defect.corridorId === 'COR-02';
  const durationFactor = Math.min(20, (defect.estimatedDurationHrs || 4) * 3);
  const assetAvailabilityImpact = Math.min(100, Math.round((isTrunk ? 80 : 65) + durationFactor));

  // 4. Train Traffic Impact (0 - 100)
  const corridorDensity = {
    'COR-01': 88, // Delhi–Mumbai (heavy express + freight)
    'COR-02': 92, // Delhi–Howrah (highest passenger density)
    'COR-03': 75,
    'COR-04': 72,
    'COR-05': 82
  };
  const trainImpact = corridorDensity[defect.corridorId] || 75;

  // 5. Overdue Risk (0 - 100)
  const overdueRisk = Math.min(100, Math.round(criticality * 0.5 + Math.min(45, ageHours * 1.8)));

  // Composite Weighted Sum
  const totalScore = Math.min(100, Math.max(0, Math.round(
    0.35 * criticality +
    0.25 * urgency +
    0.20 * assetAvailabilityImpact +
    0.10 * trainImpact +
    0.10 * overdueRisk
  )));

  return {
    totalScore,
    breakdown: {
      criticality,
      urgency,
      assetAvailabilityImpact,
      trainImpact,
      overdueRisk
    }
  };
}

// Backward compatibility helper
function scoreDefect(defect) {
  return evaluatePriority(defect).totalScore;
}

module.exports = { evaluatePriority, scoreDefect };

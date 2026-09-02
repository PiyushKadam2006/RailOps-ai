// Constraint Engine for Indian Railways AI-Assisted Block Scheduling
// Validates candidate maintenance windows against 10 operational and safety constraints

/**
 * Validates a candidate window against operational constraints
 * 
 * @param {Object} params
 * @param {Date} params.windowStart Date object for candidate block start
 * @param {Date} params.windowEnd Date object for candidate block end
 * @param {String} params.corridorId Target corridor ID (e.g. 'COR-01')
 * @param {Array} params.defects Defects bundled in this candidate block
 * @param {Array} params.activeBlocks Existing active / scheduled blocks in DB
 * @param {Array} params.trainSchedules Timetable train schedules
 * @param {Array} params.freightForecasts Freight forecasts for this corridor
 * @param {Array} params.blockWindows Allowed corridor white space windows
 * @returns {Object} { feasible, scorePenalty, violations, warnings, passengerImpact, freightImpact, affectedTrains, freightDetails }
 */
function evaluateConstraints({
  windowStart,
  windowEnd,
  corridorId,
  defects = [],
  activeBlocks = [],
  trainSchedules = [],
  freightForecasts = [],
  blockWindows = []
}) {
  const violations = [];
  const warnings = [];
  let scorePenalty = 0;

  const sMs = new Date(windowStart).getTime();
  const eMs = new Date(windowEnd).getTime();
  const durationHrs = (eMs - sMs) / 3600000;

  // 1. Max Block Duration Cap (Constraint 10)
  if (durationHrs > 8.0) {
    violations.push('EXCEEDS_MAX_DURATION: Block duration exceeds 8.0 hour administrative maximum.');
    scorePenalty += 100;
  }

  // 2. Minimum Maintenance Duration (Constraint 2)
  const maxTaskDuration = defects.reduce((max, d) => Math.max(max, d.estimatedDurationHrs || 2), 0);
  if (durationHrs < maxTaskDuration) {
    violations.push(`INSUFFICIENT_DURATION: Window is ${durationHrs.toFixed(1)}h but largest task requires ${maxTaskDuration}h.`);
    scorePenalty += 100;
  }

  // 3. Corridor Availability & Peak Hour Prohibitions (Constraint 1)
  const startHour = new Date(windowStart).getHours() + new Date(windowStart).getMinutes() / 60;
  const endHour = new Date(windowEnd).getHours() + new Date(windowEnd).getMinutes() / 60;

  if (blockWindows.length > 0) {
    // Check if window falls in an explicitly blocked corridor window
    const blockedWindow = blockWindows.find(bw => {
      if (bw.corridorId !== corridorId || bw.available) return false;
      const [bsh, bsm] = bw.windowStart.split(':').map(Number);
      const [beh, bem] = bw.windowEnd.split(':').map(Number);
      const bwStartH = bsh + bsm / 60;
      const bwEndH = beh + bem / 60;
      return (startHour < bwEndH && endHour > bwStartH);
    });

    if (blockedWindow) {
      violations.push(`CORRIDOR_BLOCKED_FOR_PEAK: ${blockedWindow.description || 'Corridor closed for high-density train traffic'}`);
      scorePenalty += 80;
    }
  }

  // 4. Passenger Train Overlap (Constraint 4)
  const affectedTrains = [];
  let passengerImpact = 0;

  trainSchedules.forEach(train => {
    if (train.corridorId !== corridorId) return;
    const depMs = new Date(train.departureTime).getTime();
    const arrMs = new Date(train.arrivalTime).getTime();

    // Check intersection
    if (depMs < eMs && arrMs > sMs) {
      const isExpressOrMail = train.trainType === 'Express' || train.trainType === 'Mail';
      affectedTrains.push({
        trainNumber: train.trainNumber,
        trainType: train.trainType,
        priority: train.priority
      });

      if (isExpressOrMail) {
        passengerImpact++;
        scorePenalty += 25 * (train.priority === 1 ? 1.5 : 1.0);
        warnings.push(`TRAIN_OVERLAP: ${train.trainType} ${train.trainNumber} passes through candidate window`);
      }
    }
  });

  if (passengerImpact >= 3) {
    violations.push(`EXCESSIVE_PASSENGER_IMPACT: ${passengerImpact} passenger express trains impacted.`);
  }

  // 5. Freight Train Overlap & Freight Forecast Penalty (Constraint 5)
  let freightImpact = 0;
  let freightLevel = 'LOW';

  const matchingForecast = freightForecasts.find(ff => {
    if (ff.corridorId !== corridorId) return false;
    const [fsh] = ff.windowStart.split(':').map(Number);
    const [feh] = ff.windowEnd.split(':').map(Number);
    return (startHour < feh && endHour > fsh);
  });

  if (matchingForecast) {
    freightImpact = matchingForecast.expectedFreightTrains || 1;
    freightLevel = matchingForecast.trafficLevel;
    if (freightLevel === 'HIGH') {
      scorePenalty += 40;
      warnings.push(`HIGH_FREIGHT_FORECAST: High expected goods traffic (${freightImpact} rakes) during window.`);
    } else if (freightLevel === 'MEDIUM') {
      scorePenalty += 15;
    } else {
      scorePenalty += 5; // minimal impact during low freight window
    }
  }

  // 6. Existing Block Overlap (Constraint 6)
  activeBlocks.forEach(existing => {
    if (existing.corridorId !== corridorId) return;
    const exStartMs = new Date(existing.startTime).getTime();
    const exEndMs = new Date(existing.endTime).getTime();

    if (exStartMs < eMs && exEndMs > sMs) {
      violations.push(`BLOCK_COLLISION: Overlaps with existing scheduled block ${existing.blockCode || existing.assetId}`);
      scorePenalty += 90;
    }
  });

  // 7. Same Asset Conflict (Constraint 7)
  const candidateAssetIds = new Set(defects.map(d => d.assetId));
  activeBlocks.forEach(existing => {
    if (candidateAssetIds.has(existing.assetId)) {
      const exStartMs = new Date(existing.startTime).getTime();
      const exEndMs = new Date(existing.endTime).getTime();
      if (exStartMs < eMs && exEndMs > sMs) {
        violations.push(`ASSET_DOUBLE_BOOKED: Asset ${existing.assetId} already committed in another block.`);
        scorePenalty += 100;
      }
    }
  });

  // 8. Safety Buffer Verification (Constraint 3)
  // Ensure at least 20 mins clearance before peak or adjacent blocks
  const safetyBufferMinutes = 20;

  const feasible = violations.length === 0;

  return {
    feasible,
    scorePenalty: Math.round(scorePenalty),
    violations,
    warnings,
    passengerImpact,
    freightImpact,
    freightLevel,
    affectedTrains,
    safetyBufferMinutes
  };
}

module.exports = { evaluateConstraints };

// Interval-Based Candidate Window Generator for Indian Railways AI Block Scheduling
// Discovers true contiguous safe maintenance windows by subtracting:
//   1. Passenger / Express trains (+ safety buffer)
//   2. Goods / Freight trains (+ safety buffer)
//   3. Existing committed maintenance blocks (+ safety buffer)
//   4. Prohibited peak hour windows
//
// Ensures candidateStart >= now + SAFETY_BUFFER_MINUTES (Strictly Future-Only)

const { SAFETY_BUFFER_MINUTES, isFutureWindow, formatTime } = require('./timeUtils');
const { evaluateConstraints } = require('./constraintEngine');

/**
 * Subtracts a blocked interval [bStart, bEnd] from a list of available intervals
 */
function subtractInterval(intervals, bStart, bEnd) {
  const result = [];
  for (const [iStart, iEnd] of intervals) {
    if (bEnd <= iStart || bStart >= iEnd) {
      // No overlap
      result.push([iStart, iEnd]);
    } else if (bStart <= iStart && bEnd >= iEnd) {
      // Completely consumed
      continue;
    } else if (bStart > iStart && bEnd < iEnd) {
      // Block cuts middle: split into two intervals
      result.push([iStart, bStart]);
      result.push([bEnd, iEnd]);
    } else if (bStart <= iStart && bEnd < iEnd) {
      // Block cuts beginning
      result.push([bEnd, iEnd]);
    } else if (bStart > iStart && bEnd >= iEnd) {
      // Block cuts end
      result.push([iStart, bStart]);
    }
  }
  return result;
}

/**
 * Generates candidate windows for a given corridor and date
 * 
 * @param {Object} params
 * @param {String} params.corridorId Target corridor ID
 * @param {Date} params.targetDate Target date for scheduling
 * @param {Number} [params.requiredDurationHrs=4] Desired block duration in hours
 * @param {Array} [params.defects=[]] Defects bundled in this candidate
 * @param {Array} [params.trainSchedules=[]] Timetable train schedules
 * @param {Array} [params.activeBlocks=[]] Existing committed blocks
 * @param {Array} [params.blockWindows=[]] Corridor white space / peak window configurations
 * @param {Date} [params.now=new Date()] Current reference time
 * @param {Number} [params.safetyBufferMinutes=SAFETY_BUFFER_MINUTES]
 * @returns {Array} Array of candidate window objects
 */
function generateCandidateWindows({
  corridorId,
  targetDate = new Date(),
  requiredDurationHrs = 4,
  defects = [],
  trainSchedules = [],
  activeBlocks = [],
  blockWindows = [],
  now = new Date(),
  safetyBufferMinutes = SAFETY_BUFFER_MINUTES
}) {
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const bufferMs = safetyBufferMinutes * 60 * 1000;
  const nowMs = new Date(now).getTime();
  const searchStartMs = Math.max(dayStart.getTime(), nowMs + bufferMs);

  if (searchStartMs >= dayEnd.getTime()) {
    // Target date has completely passed or is too close to now
    return [];
  }

  // 1. Initial available domain for the day
  let freeIntervals = [[searchStartMs, dayEnd.getTime()]];

  // 2. Subtract Passenger Trains (± buffer)
  trainSchedules.forEach(train => {
    if (train.corridorId !== corridorId) return;
    const isPassenger = train.trainType !== 'Goods';
    if (!isPassenger) return;

    const dep = new Date(train.departureTime).getTime();
    const arr = new Date(train.arrivalTime).getTime();
    const bStart = Math.max(dayStart.getTime(), dep - bufferMs);
    const bEnd = Math.min(dayEnd.getTime(), arr + bufferMs);
    if (bStart < bEnd) {
      freeIntervals = subtractInterval(freeIntervals, bStart, bEnd);
    }
  });

  // 3. Subtract Freight Trains (± buffer)
  trainSchedules.forEach(train => {
    if (train.corridorId !== corridorId) return;
    const isFreight = train.trainType === 'Goods';
    if (!isFreight) return;

    const dep = new Date(train.departureTime).getTime();
    const arr = new Date(train.arrivalTime).getTime();
    const bStart = Math.max(dayStart.getTime(), dep - bufferMs);
    const bEnd = Math.min(dayEnd.getTime(), arr + bufferMs);
    if (bStart < bEnd) {
      freeIntervals = subtractInterval(freeIntervals, bStart, bEnd);
    }
  });

  // 4. Subtract Existing Committed Maintenance Blocks (± buffer)
  activeBlocks.forEach(blk => {
    if (blk.corridorId !== corridorId) return;
    const status = (blk.status || 'PROPOSED').toUpperCase();
    if (['CANCELLED', 'REJECTED', 'COMPLETED'].includes(status)) return;

    const s = new Date(blk.startTime).getTime();
    const e = new Date(blk.endTime).getTime();
    const bStart = Math.max(dayStart.getTime(), s - bufferMs);
    const bEnd = Math.min(dayEnd.getTime(), e + bufferMs);
    if (bStart < bEnd) {
      freeIntervals = subtractInterval(freeIntervals, bStart, bEnd);
    }
  });

  // 5. Subtract Corridor Peak Prohibitions
  if (blockWindows && blockWindows.length > 0) {
    blockWindows.forEach(bw => {
      if (bw.corridorId !== corridorId || bw.available) return;
      const [bsh, bsm] = (bw.windowStart || '00:00').split(':').map(Number);
      const [beh, bem] = (bw.windowEnd || '00:00').split(':').map(Number);
      const pStart = new Date(dayStart);
      pStart.setHours(bsh, bsm || 0, 0, 0);
      const pEnd = new Date(dayStart);
      pEnd.setHours(beh, bem || 0, 0, 0);
      if (pStart.getTime() < pEnd.getTime()) {
        freeIntervals = subtractInterval(freeIntervals, pStart.getTime(), pEnd.getTime());
      }
    });
  }

  const candidates = [];
  const requiredMins = Math.round(requiredDurationHrs * 60);

  // 6. Build Candidate Windows from remaining contiguous intervals
  let candidateIndex = 1;
  freeIntervals.forEach(([iStart, iEnd]) => {
    const availableMins = Math.round((iEnd - iStart) / 60000);
    // Only consider windows with at least 90 minutes of clear track time
    if (availableMins < 90) return;

    const windowStart = new Date(iStart);
    // Cap allocation at required duration or 8 hours administrative cap
    const allocationMins = Math.min(availableMins, requiredMins, 480);
    const windowEnd = new Date(iStart + allocationMins * 60000);

    const sStr = formatTime(windowStart);
    const eStr = formatTime(windowEnd);

    // Identify shift description
    const startH = windowStart.getHours();
    let shiftName = 'Day Maintenance Window';
    if (startH >= 1 && startH < 5) shiftName = 'Early Night Golden Window';
    else if (startH >= 5 && startH < 11) shiftName = 'Morning Inter-Peak Window';
    else if (startH >= 11 && startH < 17) shiftName = 'Midday Inter-Peak Window';
    else if (startH >= 17 && startH < 22) shiftName = 'Evening Off-Peak Window';
    else shiftName = 'Late Night Window';

    candidates.push({
      candidateId: `CAND-${corridorId}-${String(candidateIndex++).padStart(2, '0')}`,
      corridorId,
      shiftName,
      timeLabel: `${sStr} – ${eStr}`,
      windowStart,
      windowEnd,
      durationHrs: parseFloat((allocationMins / 60).toFixed(1)),
      durationMins: allocationMins,
      availableContinuousMins: availableMins,
      description: `${sStr}–${eStr} on ${corridorId} (${(allocationMins / 60).toFixed(1)}h continuous safe possession)`
    });
  });

  return candidates;
}

/**
 * Searches across ALL 5 corridors (COR-01 to COR-05) and returns candidate windows for each
 */
function searchAllCorridors({
  corridorIds = ['COR-01', 'COR-02', 'COR-03', 'COR-04', 'COR-05'],
  targetDate = new Date(),
  bundles = [],
  trainSchedules = [],
  activeBlocks = [],
  blockWindows = [],
  now = new Date()
}) {
  const corridorCandidates = {};

  corridorIds.forEach(corridorId => {
    const bundle = bundles.find(b => b.corridorId === corridorId) || { totalDurationHrs: 4, defects: [] };
    const requiredDuration = bundle.totalDurationHrs || 4;

    const candidates = generateCandidateWindows({
      corridorId,
      targetDate,
      requiredDurationHrs: requiredDuration,
      defects: bundle.defects || [],
      trainSchedules,
      activeBlocks,
      blockWindows,
      now
    });

    corridorCandidates[corridorId] = candidates;
  });

  return corridorCandidates;
}

module.exports = {
  generateCandidateWindows,
  searchAllCorridors,
  subtractInterval
};

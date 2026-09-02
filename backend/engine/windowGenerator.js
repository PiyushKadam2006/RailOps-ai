// Candidate Window Generator for Indian Railways AI-Assisted Block Scheduling
// Generates multiple candidate maintenance windows across different shifts for evaluation

/**
 * Generates candidate time windows for a target corridor on a specific target date
 * 
 * @param {Date} targetDate Base date for scheduling (e.g. today or tomorrow)
 * @param {Number} requiredDurationHrs Total duration required for the maintenance work
 * @param {String} corridorId Target corridor ID (e.g. 'COR-01')
 * @returns {Array} Array of candidate window objects with candidateId, start, end, shiftName
 */
function generateCandidateWindows(targetDate, requiredDurationHrs = 4, corridorId = 'COR-01') {
  const base = new Date(targetDate);
  base.setHours(0, 0, 0, 0);

  // Define candidate window anchors (startHour, startMin)
  const candidateConfigs = [
    {
      candidateId: 'CAND-01',
      shiftName: 'Early Night Overhaul Window',
      startHour: 1,
      startMin: 0,
      targetDuration: Math.min(8, Math.max(requiredDurationHrs, 4)),
      description: '01:00 – Post-midnight low-traffic shift'
    },
    {
      candidateId: 'CAND-02',
      shiftName: 'Golden Maintenance Window (Recommended)',
      startHour: 2,
      startMin: 0,
      targetDuration: Math.min(8, Math.max(requiredDurationHrs, 6)), // 6-hour consolidated block
      description: '02:00 – Coordinated multi-department window'
    },
    {
      candidateId: 'CAND-03',
      shiftName: 'Morning Passenger Bank Window',
      startHour: 7,
      startMin: 0,
      targetDuration: Math.min(6, requiredDurationHrs),
      description: '07:00 – High-density commuter & express slot'
    },
    {
      candidateId: 'CAND-04',
      shiftName: 'Midday Maintenance Slot',
      startHour: 12,
      startMin: 30,
      targetDuration: Math.min(6, Math.max(requiredDurationHrs, 4)),
      description: '12:30 – Inter-peak daytime corridor availability'
    },
    {
      candidateId: 'CAND-05',
      shiftName: 'Late Night Pre-Block Window',
      startHour: 22,
      startMin: 0,
      targetDuration: Math.min(6, Math.max(requiredDurationHrs, 4)),
      description: '22:00 – Night shift start before Rajdhani bank'
    }
  ];

  return candidateConfigs.map(cfg => {
    const s = new Date(base);
    s.setHours(cfg.startHour, cfg.startMin, 0, 0);
    const e = new Date(s.getTime() + cfg.targetDuration * 3600000);

    const sStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const eStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    return {
      candidateId: cfg.candidateId,
      shiftName: cfg.shiftName,
      windowStart: s,
      windowEnd: e,
      timeLabel: `${sStr} – ${eStr}`,
      durationHrs: cfg.targetDuration,
      description: cfg.description,
      corridorId
    };
  });
}

module.exports = { generateCandidateWindows };

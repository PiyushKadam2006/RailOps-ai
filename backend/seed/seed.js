// Controlled Deterministic Seed Data for RailOps AI Prototype
// Covers 04 September 2026 and 05 September 2026 across all 5 Indian Railways Trunk Corridors
// Scenarios A through F included deterministically without random overlapping block loops.

const mongoose = require('mongoose');
const Defect = require('../models/Defect');
const Block = require('../models/Block');
const Corridor = require('../models/Corridor');
const TrainSchedule = require('../models/TrainSchedule');
const FreightForecast = require('../models/FreightForecast');
const BlockWindow = require('../models/BlockWindow');
const Recommendation = require('../models/Recommendation');

const timetableData = require('../data/timetableData');
const freightForecastData = require('../data/freightForecastData');
const blockWindowsData = require('../data/blockWindowsData');
const { getToday, getTomorrow } = require('../engine/timeUtils');

const CORRIDORS_DATA = [
  { corridorId: 'COR-01', name: 'Delhi–Mumbai', fromStation: 'NDLS', toStation: 'CSMT', totalKm: 1384 },
  { corridorId: 'COR-02', name: 'Delhi–Howrah', fromStation: 'NDLS', toStation: 'HWH', totalKm: 1441 },
  { corridorId: 'COR-03', name: 'Mumbai–Chennai', fromStation: 'CSMT', toStation: 'MAS', totalKm: 1279 },
  { corridorId: 'COR-04', name: 'Howrah–Chennai', fromStation: 'HWH', toStation: 'MAS', totalKm: 1659 },
  { corridorId: 'COR-05', name: 'Delhi–Chennai', fromStation: 'NDLS', toStation: 'MAS', totalKm: 2175 }
];

function generateTrainSchedules(baseDate) {
  const schedules = [];
  const days = [-1, 0, 1, 2]; // yesterday, today, tomorrow, day after
  days.forEach(dayOffset => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(0, 0, 0, 0);

    timetableData.forEach(t => {
      const dep = new Date(d);
      dep.setHours(t.startHour, t.startMin, 0, 0);
      const arr = new Date(d);
      arr.setHours(t.endHour, t.endMin, 0, 0);
      if (arr < dep) {
        arr.setDate(arr.getDate() + 1);
      }

      schedules.push({
        trainNumber: t.trainNumber,
        trainName: t.trainName,
        trainType: t.trainType,
        corridorId: t.corridorId,
        track: t.track || (t.trainType === 'Goods' ? 'DN Main' : 'UP Main'),
        departureTime: dep,
        arrivalTime: arr,
        priority: t.priority || 1,
        isAffected: false
      });
    });
  });
  return schedules;
}

const seedDatabase = async (force = true) => {
  console.log('Seeding controlled deterministic RailOps AI dataset for Sep 4 & 5...');

  await Corridor.deleteMany({});
  await Defect.deleteMany({});
  await Block.deleteMany({});
  await TrainSchedule.deleteMany({});
  await FreightForecast.deleteMany({});
  await BlockWindow.deleteMany({});
  await Recommendation.deleteMany({});

  const today = getToday();
  const tomorrow = getTomorrow();

  // 1. Insert Corridors, Freight Forecasts, and Corridor Windows
  await Corridor.insertMany(CORRIDORS_DATA);
  await FreightForecast.insertMany(freightForecastData);
  await BlockWindow.insertMany(blockWindowsData);
  await TrainSchedule.insertMany(generateTrainSchedules(today));

  // 2. Controlled Defects for Scenarios A through F
  const defectsData = [
    // ── SCENARIO A: STRONG MULTI-DEPARTMENT MERGE (COR-02) ──
    {
      defectCode: 'DEF-0101',
      assetId: 'TRK-COR2-201',
      department: 'Track',
      source: 'TMS',
      corridorId: 'COR-02',
      estimatedDurationHrs: 4,
      priority: 'CRITICAL',
      priorityScore: 95,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-2A',
      faultDescription: 'Ultrasonic rail defect at KM 188.4 near Kanpur. Requires switch rail renewal and machine tamping.'
    },
    {
      defectCode: 'DEF-0102',
      assetId: 'SIG-COR2-202',
      department: 'Signalling',
      source: 'SMMS',
      corridorId: 'COR-02',
      estimatedDurationHrs: 2,
      priority: 'HIGH',
      priorityScore: 88,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-2A',
      faultDescription: 'Point machine electronic interlocking relay calibration and detection rod overhaul at Junction 188.'
    },
    {
      defectCode: 'DEF-0103',
      assetId: 'OHE-COR2-203',
      department: 'Traction',
      source: 'TDMS',
      corridorId: 'COR-02',
      estimatedDurationHrs: 2,
      priority: 'HIGH',
      priorityScore: 86,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-2A',
      faultDescription: 'OHE contact wire dropper replacement and catenary tension realignment at KM 188.9.'
    },

    // ── SCENARIO B: PASSENGER BLOCKED WINDOW (COR-01) ──
    {
      defectCode: 'DEF-0201',
      assetId: 'TRK-COR1-102',
      department: 'Track',
      source: 'TMS',
      corridorId: 'COR-01',
      estimatedDurationHrs: 3,
      priority: 'HIGH',
      priorityScore: 82,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-1B',
      preferredStartHour: 11,
      faultDescription: 'Track gauge widening flagged on UP Main. Preferred slot 11:30 conflicts with Paschim Superfast 12954.'
    },

    // ── SCENARIO C: FREIGHT BLOCKED WINDOW (COR-04) ──
    {
      defectCode: 'DEF-0301',
      assetId: 'OHE-COR4-401',
      department: 'Traction',
      source: 'TDMS',
      corridorId: 'COR-04',
      estimatedDurationHrs: 2.5,
      priority: 'MEDIUM',
      priorityScore: 65,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-4A',
      preferredStartHour: 6,
      faultDescription: 'Catenary insulator washing and mast earth checking. Morning slot 06:00 conflicts with Iron Ore Freight GDS-501.'
    },

    // ── SCENARIO D: PARTIAL EXECUTION WITH CARRY-FORWARD (COR-05) ──
    {
      defectCode: 'DEF-0401',
      assetId: 'TRK-COR5-501',
      department: 'Track',
      source: 'TMS',
      corridorId: 'COR-05',
      estimatedDurationHrs: 4,
      priority: 'HIGH',
      priorityScore: 84,
      status: 'PENDING',
      isSplittable: true,
      workZone: 'Zone-5C',
      faultDescription: 'Deep ballast screening and sleeper spacing adjustment over 600m segment. Splittable into 3h initial block + 1h carry-forward.'
    },

    // ── SCENARIO E: EXISTING MAINTENANCE CONSTRAINT (COR-03) ──
    {
      defectCode: 'DEF-0501',
      assetId: 'SIG-COR3-301',
      department: 'Signalling',
      source: 'SMMS',
      corridorId: 'COR-03',
      estimatedDurationHrs: 2.5,
      priority: 'MEDIUM',
      priorityScore: 68,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-3A',
      faultDescription: 'Track circuit receiver renewal. Cannot overlap existing morning traction block BLK-C3-01.'
    },

    // Background Routine Defects for realistic operations
    {
      defectCode: 'DEF-0601',
      assetId: 'LOCO-003',
      department: 'Rolling Stock',
      source: 'BDMS',
      corridorId: 'COR-01',
      estimatedDurationHrs: 3,
      priority: 'MEDIUM',
      priorityScore: 55,
      status: 'PENDING',
      isSplittable: false,
      faultDescription: 'Traction motor brush wear and bogie clearance inspection at Vadodara shed.'
    },
    {
      defectCode: 'DEF-0602',
      assetId: 'SIG-COR1-115',
      department: 'Signalling',
      source: 'SMMS',
      corridorId: 'COR-01',
      estimatedDurationHrs: 2,
      priority: 'LOW',
      priorityScore: 38,
      status: 'PENDING',
      isSplittable: true,
      faultDescription: 'Telemetry battery backup testing on remote auto-signalling hut KM 210.'
    },
    {
      defectCode: 'DEF-0603',
      assetId: 'OHE-COR2-218',
      department: 'Traction',
      source: 'TDMS',
      corridorId: 'COR-02',
      estimatedDurationHrs: 2,
      priority: 'MEDIUM',
      priorityScore: 60,
      status: 'PENDING',
      isSplittable: false,
      faultDescription: 'Neutral section ceramic insulator inspection at Substation 4.'
    },
    {
      defectCode: 'DEF-0604',
      assetId: 'TRK-COR4-412',
      department: 'Track',
      source: 'TMS',
      corridorId: 'COR-04',
      estimatedDurationHrs: 3,
      priority: 'LOW',
      priorityScore: 42,
      status: 'PENDING',
      isSplittable: false,
      faultDescription: 'Level crossing surface re-paving and check-rail clearance adjustment.'
    }
  ];

  await Defect.insertMany(defectsData);

  // 3. Controlled Committed Blocks (Clean, purposeful schedule without random overlapping clutter)
  const blocksData = [
    // ── COR-01: Clean historical morning block + clean evening block ──
    {
      blockCode: 'BLK-C1-01',
      assetId: 'TRK-COR1-01',
      corridorId: 'COR-01',
      department: 'Track',
      track: 'UP Main',
      startTime: (() => { const d = new Date(today); d.setHours(4, 30, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(6, 0, 0, 0); return d; })(),
      status: 'COMPLETED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'HISTORICAL'
    },
    {
      blockCode: 'BLK-C1-02',
      assetId: 'OHE-COR1-02',
      corridorId: 'COR-01',
      department: 'Traction',
      track: 'DN Main',
      startTime: (() => { const d = new Date(today); d.setHours(21, 30, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(23, 0, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    },

    // ── COR-02: Clean morning track possession (UP Main) ──
    {
      blockCode: 'BLK-C2-01',
      assetId: 'TRK-COR2-01',
      corridorId: 'COR-02',
      department: 'Track',
      track: 'UP Main',
      startTime: (() => { const d = new Date(today); d.setHours(8, 45, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(11, 30, 0, 0); return d; })(),
      status: 'COMPLETED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'MANUAL'
    },

    // ── COR-03: Morning traction + EXACTLY ONE GENUINE ACTIVE CONFLICT PAIR for demo resolution ──
    {
      blockCode: 'BLK-C3-01',
      assetId: 'OHE-COR3-01',
      corridorId: 'COR-03',
      department: 'Traction',
      track: 'DN Main',
      startTime: (() => { const d = new Date(today); d.setHours(6, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(9, 30, 0, 0); return d; })(),
      status: 'COMPLETED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'MANUAL'
    },
    // GENUINE ACTIVE CONFLICT: Track vs Signalling overlapping on same UP Main track
    {
      blockCode: 'BLK-CONF-01',
      assetId: 'TRK-COR3-302',
      corridorId: 'COR-03',
      department: 'Track',
      track: 'UP Main',
      startTime: (() => { const d = new Date(today); d.setHours(15, 30, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(18, 0, 0, 0); return d; })(),
      status: 'ACTIVE',
      trainImpact: 1,
      conflictFlags: ['DEPT_CONFLICT'],
      safetyBufferMinutes: 20,
      source: 'MANUAL'
    },
    {
      blockCode: 'BLK-CONF-02',
      assetId: 'SIG-COR3-303',
      corridorId: 'COR-03',
      department: 'Signalling',
      track: 'UP Main',
      startTime: (() => { const d = new Date(today); d.setHours(16, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(18, 30, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 1,
      conflictFlags: ['DEPT_CONFLICT'],
      safetyBufferMinutes: 20,
      source: 'MANUAL'
    },

    // ── COR-04: Midday track on UP Main (clean) ──
    {
      blockCode: 'BLK-C4-01',
      assetId: 'TRK-COR4-01',
      corridorId: 'COR-04',
      department: 'Track',
      track: 'UP Main',
      startTime: (() => { const d = new Date(today); d.setHours(12, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(15, 30, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    },

    // ── COR-05: Clean morning traction on DN Main ──
    {
      blockCode: 'BLK-C5-01',
      assetId: 'OHE-COR5-01',
      corridorId: 'COR-05',
      department: 'Traction',
      track: 'DN Main',
      startTime: (() => { const d = new Date(today); d.setHours(9, 30, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(13, 0, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    },

    // ── TOMORROW BLOCKS (Sep 5): 3 clean possessions across corridors ──
    {
      blockCode: 'BLK-TM-01',
      assetId: 'TRK-TM-01',
      corridorId: 'COR-01',
      department: 'Track',
      track: 'UP Main',
      startTime: (() => { const d = new Date(tomorrow); d.setHours(2, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(tomorrow); d.setHours(5, 30, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    },
    {
      blockCode: 'BLK-TM-02',
      assetId: 'OHE-TM-02',
      corridorId: 'COR-02',
      department: 'Traction',
      track: 'DN Main',
      startTime: (() => { const d = new Date(tomorrow); d.setHours(13, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(tomorrow); d.setHours(15, 30, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    },
    {
      blockCode: 'BLK-TM-03',
      assetId: 'SIG-TM-03',
      corridorId: 'COR-04',
      department: 'Signalling',
      track: 'UP Main',
      startTime: (() => { const d = new Date(tomorrow); d.setHours(18, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(tomorrow); d.setHours(20, 30, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    }
  ];

  await Block.insertMany(blocksData);

  console.log('Database successfully seeded with controlled, deterministic datasets (04–05 Sep 2026)!');
  console.log('Active conflicts on network: exactly 1 operational conflict pair on COR-03.');
};

module.exports = { seedDatabase };

if (require.main === module) {
  mongoose.connect('mongodb://127.0.0.1:27017/railops_ai')
    .then(() => seedDatabase(true))
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seed script error:', err);
      process.exit(1);
    });
}

const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const Defect = require('../models/Defect');
const Block = require('../models/Block');
const Corridor = require('../models/Corridor');
const TrainSchedule = require('../models/TrainSchedule');

const ASSETS = [
  'LOCO-001', 'LOCO-002', 'LOCO-003', 'LOCO-004', 'LOCO-005', 'LOCO-006', 'LOCO-007', 'LOCO-008',
  'EMU-101', 'EMU-102', 'EMU-103', 'EMU-104', 'EMU-105',
  'DMU-201', 'DMU-202', 'WAG-301', 'WAG-302', 'TRK-401', 'TRK-402', 'SIG-501', 'SIG-502'
];

const DEPTS = ['Traction', 'Signalling', 'Track', 'Rolling Stock', 'Infrastructure', 'Electrical'];
const SOURCES = ['TMS', 'SMMS', 'TDMS', 'BDMS', 'COA'];

const CORRIDORS_DATA = [
  { corridorId: 'COR-01', name: 'Delhi–Mumbai', fromStation: 'NDLS', toStation: 'CSMT', totalKm: 1384 },
  { corridorId: 'COR-02', name: 'Delhi–Howrah', fromStation: 'NDLS', toStation: 'HWH', totalKm: 1441 },
  { corridorId: 'COR-03', name: 'Mumbai–Chennai', fromStation: 'CSMT', toStation: 'MAS', totalKm: 1279 },
  { corridorId: 'COR-04', name: 'Howrah–Chennai', fromStation: 'HWH', toStation: 'MAS', totalKm: 1659 },
  { corridorId: 'COR-05', name: 'Delhi–Chennai', fromStation: 'NDLS', toStation: 'MAS', totalKm: 2175 }
];

const FAULTS = [
  'Pantograph alignment drift at OHE contact wire',
  'Axle bearing temperature exceeding 85°C threshold',
  'Signal relay failure causing block section lockout',
  'Brake cylinder pressure loss in bogie assembly',
  'Track gauge deviation at km marker 42 — 3mm over tolerance',
  'Traction motor insulation resistance below minimum spec',
  'OHE catenary tension loss in neutral section',
  'Wheel flange wear exceeding maintenance interval limit',
  'ATP transponder intermittent communication fault',
  'Point machine failure at platform entry switch',
  'Rolling stock coupling mechanism lateral misalignment',
  'Power supply unit overheating in relay control cabinet',
  'Track circuit shunting sensitivity degradation',
  'Emergency brake valve actuation under normal operations',
  'Overhead line equipment earthing fault detected',
  'Cab signalling display showing intermittent dropout errors',
  'Diesel injector fouling on DMU traction unit',
  'Speedometer sensor giving erratic velocity readings',
  'SCADA telemetry loss on remote signalling panel',
  'Fishplate crack detected at rail joint km 118',
  'Battery charger unit failure in control car',
  'Earth leakage detected on 25kV feeder cable',
  'Ballast voids recorded over 40m stretch at km 267',
  'Crossover switch heating element failure in winter ops',
  'Retaining wall erosion flagged near embankment km 89'
];

const getWeekStart = () => {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysFromMonday)
  weekStart.setHours(0, 0, 0, 0)
  return weekStart;
};

const seedDatabase = async () => {
  const existingDefects = await Defect.countDocuments();
  if (existingDefects > 0) return;

  await Corridor.deleteMany({});
  await Defect.deleteMany({});
  await Block.deleteMany({});
  await TrainSchedule.deleteMany({});

  await Corridor.insertMany(CORRIDORS_DATA);
  const corridorIds = CORRIDORS_DATA.map(c => c.corridorId);

  const weekStart = getWeekStart();
  const weekStartMs = weekStart.getTime();

  // Seed 100 Defects
  const defectsData = [];
  for (let i = 0; i < 100; i++) {
    const pRand = Math.random();
    let priority, pScore;
    if (pRand < 0.15) { priority = 'CRITICAL'; pScore = faker.number.int({ min: 85, max: 100 }); }
    else if (pRand < 0.45) { priority = 'HIGH'; pScore = faker.number.int({ min: 60, max: 84 }); }
    else if (pRand < 0.80) { priority = 'MEDIUM'; pScore = faker.number.int({ min: 35, max: 59 }); }
    else { priority = 'LOW'; pScore = faker.number.int({ min: 10, max: 34 }); }

    const sRand = Math.random();
    let status;
    if (sRand < 0.40) status = 'PENDING';
    else if (sRand < 0.65) status = 'EXECUTED';
    else if (sRand < 0.85) status = 'BUNDLED';
    else status = 'REJECTED';

    const randomDayOffset = Math.floor(Math.random() * 7);
    const randomHour = Math.floor(Math.random() * 24);
    const randomMin = Math.floor(Math.random() * 60);
    const createdAt = new Date(weekStartMs);
    createdAt.setDate(new Date(weekStartMs).getDate() + randomDayOffset);
    createdAt.setHours(randomHour, randomMin, 0, 0);
    
    defectsData.push({
      defectCode: 'DEF-' + String(i + 1).padStart(4, '0'),
      assetId: faker.helpers.arrayElement(ASSETS),
      department: faker.helpers.arrayElement(DEPTS),
      source: faker.helpers.arrayElement(SOURCES),
      faultDescription: faker.helpers.arrayElement(FAULTS),
      priority,
      priorityScore: pScore,
      status,
      corridorId: faker.helpers.arrayElement(corridorIds),
      estimatedDurationHrs: faker.number.int({ min: 2, max: 8 }),
      createdAt
    });
  }
  const defects = await Defect.insertMany(defectsData);

  // Seed 100 Blocks
  const blocksData = [];
  for (let i = 0; i < 100; i++) {
    const randomDayOffset = Math.floor(Math.random() * 7);
    const randomHour = Math.floor(Math.random() * 24);
    const randomMin = Math.floor(Math.random() * 60);
    const startTime = new Date(weekStartMs);
    startTime.setDate(new Date(weekStartMs).getDate() + randomDayOffset);
    startTime.setHours(randomHour, randomMin, 0, 0);

    const randomDurationHrs = Math.floor(Math.random() * 7) + 2;
    const endTime = new Date(startTime.getTime() + (randomDurationHrs * 3600 * 1000));
    
    const bRand = Math.random();
    let status;
    if (bRand < 0.30) status = 'APPROVED';
    else if (bRand < 0.55) status = 'ACTIVE';
    else if (bRand < 0.80) status = 'COMPLETED';
    else if (bRand < 0.95) status = 'PROPOSED';
    else status = 'CANCELLED';

    const hasConflict = Math.random() < 0.20;
    const conflictFlags = hasConflict ? [faker.helpers.arrayElement(['TRAIN_OVERLAP', 'DEPT_CONFLICT'])] : [];

    blocksData.push({
      blockCode: 'BLK-' + String(i + 1).padStart(4, '0'),
      assetId: faker.helpers.arrayElement(ASSETS),
      corridorId: faker.helpers.arrayElement(corridorIds),
      department: faker.helpers.arrayElement(DEPTS),
      startTime,
      endTime,
      status,
      trainImpact: faker.number.int({ min: 0, max: 5 }),
      conflictFlags
    });
  }
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);

  const CORRIDORS_IDS = ['COR-01','COR-02','COR-03','COR-04','COR-05'];
  const BLOCK_STATUSES = ['active','maintenance','inspection','approved','proposed','completed'];

  const todayBlocks = [];
  for (let i = 0; i < 25; i++) {
    const startHour = Math.floor(Math.random() * 20);
    const durationHrs = Math.floor(Math.random() * 5) + 2;
    const startTime = new Date(today);
    startTime.setHours(startHour, Math.floor(Math.random()*60), 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + durationHrs);

    const hasConflict = Math.random() < 0.3;
    todayBlocks.push({
      blockCode: 'BLK-T-' + String(i+1).padStart(3,'0'),
      assetId: faker.helpers.arrayElement(ASSETS),
      corridorId: CORRIDORS_IDS[i % 5],
      department: faker.helpers.arrayElement(DEPTS),
      startTime,
      endTime,
      status: faker.helpers.arrayElement(BLOCK_STATUSES),
      trainImpact: Math.floor(Math.random()*4),
      conflictFlags: hasConflict ? (Math.random()>0.5 ? ['TRAIN_OVERLAP'] : ['DEPT_CONFLICT']) : [],
      linkedDefectId: null
    });
  }

  const tomorrowBlocks = [];
  for (let i = 0; i < 15; i++) {
    const startHour = Math.floor(Math.random() * 20);
    const durationHrs = Math.floor(Math.random() * 5) + 2;
    const startTime = new Date(tomorrow);
    startTime.setHours(startHour, Math.floor(Math.random()*60), 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + durationHrs);

    tomorrowBlocks.push({
      blockCode: 'BLK-TM-' + String(i+1).padStart(3,'0'),
      assetId: faker.helpers.arrayElement(ASSETS),
      corridorId: CORRIDORS_IDS[i % 5],
      department: faker.helpers.arrayElement(DEPTS),
      startTime,
      endTime,
      status: faker.helpers.arrayElement(BLOCK_STATUSES),
      trainImpact: Math.floor(Math.random()*3),
      conflictFlags: Math.random() < 0.2 ? ['TRAIN_OVERLAP'] : [],
      linkedDefectId: null
    });
  }

  const overlapA = {
    blockCode: 'BLK-OVL-01',
    assetId: 'LOCO-001',
    corridorId: 'COR-01',
    department: 'Traction',
    startTime: (() => { const d=new Date(today); d.setHours(9,0,0,0); return d })(),
    endTime:   (() => { const d=new Date(today); d.setHours(15,0,0,0); return d })(),
    status: 'active',
    trainImpact: 2,
    conflictFlags: ['DEPT_CONFLICT'],
    linkedDefectId: null
  };
  const overlapB = {
    blockCode: 'BLK-OVL-02',
    assetId: 'EMU-101',
    corridorId: 'COR-01',
    department: 'Signalling',
    startTime: (() => { const d=new Date(today); d.setHours(11,0,0,0); return d })(),
    endTime:   (() => { const d=new Date(today); d.setHours(17,0,0,0); return d })(),
    status: 'approved',
    trainImpact: 3,
    conflictFlags: ['TRAIN_OVERLAP','DEPT_CONFLICT'],
    linkedDefectId: null
  };

  await Block.insertMany([...blocksData, ...todayBlocks, ...tomorrowBlocks, overlapA, overlapB]);

  // Seed 50 Train Schedules
  const trainsData = [];
  for (let i = 0; i < 50; i++) {
    const departureTime = new Date(weekStartMs + faker.number.int({ min: 0, max: 7 * 24 * 3600000 }));
    const arrivalTime = new Date(departureTime.getTime() + faker.number.int({ min: 2, max: 24 }) * 3600000);

    const tRand = Math.random();
    let trainType, priority;
    if (tRand < 0.30) { trainType = 'Express'; priority = 1; }
    else if (tRand < 0.55) { trainType = 'Passenger'; priority = 2; }
    else if (tRand < 0.80) { trainType = 'Goods'; priority = 3; }
    else { trainType = 'Mail'; priority = 4; }

    trainsData.push({
      trainNumber: 'TRN-' + String(i + 1).padStart(3, '0'),
      trainType,
      corridorId: faker.helpers.arrayElement(corridorIds),
      departureTime,
      arrivalTime,
      priority
    });
  }
  await TrainSchedule.insertMany(trainsData);
};

module.exports = { seedDatabase };

if (require.main === module) {
  mongoose.connect('mongodb://127.0.0.1:27017/railops_ai')
    .then(() => seedDatabase())
    .then(() => process.exit(0))
    .catch(console.error);
}

// Synthetic Corridor Maintenance Block Windows (Corridor Availability & White Space)
// Defines when corridors can safely accept scheduled maintenance blocks

module.exports = [
  // ── COR-01: Delhi–Mumbai ──
  {
    corridorId: 'COR-01',
    windowStart: '00:00',
    windowEnd: '08:00',
    available: true,
    safetyBufferMinutes: 20,
    trafficLevel: 'LOW',
    description: 'Primary Overhaul & Maintenance Window (Night Shift)'
  },
  {
    corridorId: 'COR-01',
    windowStart: '08:00',
    windowEnd: '12:30',
    available: false,
    safetyBufferMinutes: 30,
    trafficLevel: 'HIGH',
    description: 'Morning Superfast Express & Intercity Traffic Peak — Blocks Prohibited'
  },
  {
    corridorId: 'COR-01',
    windowStart: '12:30',
    windowEnd: '17:00',
    available: true,
    safetyBufferMinutes: 25,
    trafficLevel: 'MEDIUM',
    description: 'Secondary Afternoon Maintenance Window'
  },
  {
    corridorId: 'COR-01',
    windowStart: '17:00',
    windowEnd: '22:00',
    available: false,
    safetyBufferMinutes: 30,
    trafficLevel: 'HIGH',
    description: 'Evening Rush Hour & Express Departures — Blocks Prohibited'
  },
  {
    corridorId: 'COR-01',
    windowStart: '22:00',
    windowEnd: '24:00',
    available: true,
    safetyBufferMinutes: 20,
    trafficLevel: 'LOW',
    description: 'Late Night Pre-Block Preparation Window'
  },

  // ── COR-02: Delhi–Howrah ──
  { corridorId: 'COR-02', windowStart: '01:00', windowEnd: '07:30', available: true, safetyBufferMinutes: 20, trafficLevel: 'LOW' },
  { corridorId: 'COR-02', windowStart: '07:30', windowEnd: '13:00', available: false, safetyBufferMinutes: 30, trafficLevel: 'HIGH' },
  { corridorId: 'COR-02', windowStart: '13:00', windowEnd: '17:00', available: true, safetyBufferMinutes: 25, trafficLevel: 'MEDIUM' },
  { corridorId: 'COR-02', windowStart: '17:00', windowEnd: '23:00', available: false, safetyBufferMinutes: 30, trafficLevel: 'HIGH' },

  // ── COR-03: Mumbai–Chennai ──
  { corridorId: 'COR-03', windowStart: '01:30', windowEnd: '08:00', available: true, safetyBufferMinutes: 20, trafficLevel: 'LOW' },
  { corridorId: 'COR-03', windowStart: '08:00', windowEnd: '13:30', available: false, safetyBufferMinutes: 30, trafficLevel: 'HIGH' },
  { corridorId: 'COR-03', windowStart: '13:30', windowEnd: '17:30', available: true, safetyBufferMinutes: 20, trafficLevel: 'MEDIUM' },

  // ── COR-04: Howrah–Chennai ──
  { corridorId: 'COR-04', windowStart: '01:00', windowEnd: '07:00', available: true, safetyBufferMinutes: 20, trafficLevel: 'LOW' },
  { corridorId: 'COR-04', windowStart: '12:00', windowEnd: '16:00', available: true, safetyBufferMinutes: 25, trafficLevel: 'MEDIUM' },

  // ── COR-05: Delhi–Chennai ──
  { corridorId: 'COR-05', windowStart: '01:00', windowEnd: '08:00', available: true, safetyBufferMinutes: 20, trafficLevel: 'LOW' },
  { corridorId: 'COR-05', windowStart: '13:00', windowEnd: '17:00', available: true, safetyBufferMinutes: 25, trafficLevel: 'MEDIUM' }
];

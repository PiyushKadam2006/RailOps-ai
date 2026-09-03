// Deterministic Synthetic Train Timetable Data for Indian Railways Trunk Corridors
// Specifically covers COR-01 (Delhi–Mumbai) and interconnecting trunk routes
// Each record explicitly specifies its operational resource / track (UP Main or DN Main)

module.exports = [
  // ── COR-01: Delhi–Mumbai ──
  { trainNumber: '12951', trainName: 'Mumbai Rajdhani Exp', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 0, startMin: 30, endHour: 1, endMin: 10, priority: 1 },
  { trainNumber: '12952', trainName: 'August Kranti Tejas Rajdhani', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 2, startMin: 20, endHour: 3, endMin: 0, priority: 1 },
  { trainNumber: 'GDS-401', trainName: 'Dedicated Freight Container', trainType: 'Goods', corridorId: 'COR-01', track: 'DN Main', startHour: 4, startMin: 10, endHour: 5, endMin: 0, priority: 3 },
  { trainNumber: '12953', trainName: 'Golden Temple Mail', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 6, startMin: 20, endHour: 7, endMin: 0, priority: 1 },
  { trainNumber: 'GDS-402', trainName: 'Automobile Container Rake', trainType: 'Goods', corridorId: 'COR-01', track: 'UP Main', startHour: 9, startMin: 0, endHour: 10, endMin: 0, priority: 3 },
  { trainNumber: '12954', trainName: 'Paschim Superfast Exp', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 11, startMin: 30, endHour: 12, endMin: 10, priority: 1 },
  { trainNumber: '12955', trainName: 'Garib Rath Express', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 13, startMin: 30, endHour: 14, endMin: 15, priority: 1 },
  { trainNumber: 'GDS-403', trainName: 'Petroleum POL Rake', trainType: 'Goods', corridorId: 'COR-01', track: 'DN Main', startHour: 15, startMin: 30, endHour: 16, endMin: 30, priority: 3 },
  { trainNumber: '12956', trainName: 'Swarna Jayanti Superfast', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 17, startMin: 0, endHour: 17, endMin: 45, priority: 1 },
  { trainNumber: '12957', trainName: 'Vande Bharat Express', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 19, startMin: 30, endHour: 20, endMin: 15, priority: 1 },
  { trainNumber: 'GDS-404', trainName: 'Bulk Cement Freight', trainType: 'Goods', corridorId: 'COR-01', track: 'DN Main', startHour: 21, startMin: 0, endHour: 22, endMin: 0, priority: 3 },
  { trainNumber: '12958', trainName: 'Dehradun Express', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 23, startMin: 10, endHour: 23, endMin: 50, priority: 1 },

  // ── COR-02: Delhi–Howrah ──
  { trainNumber: '12301', trainName: 'Howrah Rajdhani', trainType: 'Express', corridorId: 'COR-02', track: 'UP Main', startHour: 1, startMin: 15, endHour: 2, endMin: 0, priority: 1 },
  { trainNumber: 'GDS-201', trainName: 'Coal Corridor Freight', trainType: 'Goods', corridorId: 'COR-02', track: 'DN Main', startHour: 3, startMin: 0, endHour: 4, endMin: 0, priority: 3 },
  { trainNumber: '12305', trainName: 'Kolkata Mail', trainType: 'Express', corridorId: 'COR-02', track: 'UP Main', startHour: 7, startMin: 30, endHour: 8, endMin: 15, priority: 1 },
  { trainNumber: '12307', trainName: 'Poorva Express', trainType: 'Express', corridorId: 'COR-02', track: 'UP Main', startHour: 12, startMin: 0, endHour: 12, endMin: 45, priority: 1 },
  { trainNumber: 'GDS-202', trainName: 'Steel Coil Rake', trainType: 'Goods', corridorId: 'COR-02', track: 'DN Main', startHour: 16, startMin: 0, endHour: 17, endMin: 0, priority: 3 },
  { trainNumber: '12309', trainName: 'Patna Rajdhani', trainType: 'Express', corridorId: 'COR-02', track: 'UP Main', startHour: 20, startMin: 15, endHour: 21, endMin: 0, priority: 1 },

  // ── COR-03: Mumbai–Chennai ──
  { trainNumber: '12163', trainName: 'Chennai Express', trainType: 'Express', corridorId: 'COR-03', track: 'UP Main', startHour: 2, startMin: 30, endHour: 3, endMin: 15, priority: 1 },
  { trainNumber: 'GDS-301', trainName: 'Grain Special Freight', trainType: 'Goods', corridorId: 'COR-03', track: 'DN Main', startHour: 5, startMin: 0, endHour: 6, endMin: 0, priority: 3 },
  { trainNumber: '11041', trainName: 'CSMT Chennai Superfast', trainType: 'Express', corridorId: 'COR-03', track: 'UP Main', startHour: 10, startMin: 0, endHour: 10, endMin: 50, priority: 1 },
  { trainNumber: 'GDS-302', trainName: 'Container Cargo Rake', trainType: 'Goods', corridorId: 'COR-03', track: 'DN Main', startHour: 14, startMin: 0, endHour: 15, endMin: 0, priority: 3 },
  { trainNumber: '12165', trainName: 'Ratnagiri Express', trainType: 'Express', corridorId: 'COR-03', track: 'UP Main', startHour: 18, startMin: 30, endHour: 19, endMin: 15, priority: 1 },

  // ── COR-04: Howrah–Chennai ──
  { trainNumber: '12841', trainName: 'Coromandel Express', trainType: 'Express', corridorId: 'COR-04', track: 'UP Main', startHour: 3, startMin: 0, endHour: 3, endMin: 45, priority: 1 },
  { trainNumber: 'GDS-501', trainName: 'Iron Ore Freight Rake', trainType: 'Goods', corridorId: 'COR-04', track: 'DN Main', startHour: 6, startMin: 0, endHour: 7, endMin: 0, priority: 3 },
  { trainNumber: '12839', trainName: 'Howrah Chennai Mail', trainType: 'Express', corridorId: 'COR-04', track: 'UP Main', startHour: 11, startMin: 0, endHour: 11, endMin: 50, priority: 1 },
  { trainNumber: '12845', trainName: 'Bhubaneswar Superfast', trainType: 'Express', corridorId: 'COR-04', track: 'UP Main', startHour: 16, startMin: 30, endHour: 17, endMin: 15, priority: 1 },

  // ── COR-05: Delhi–Chennai ──
  { trainNumber: '12616', trainName: 'Grand Trunk Express', trainType: 'Express', corridorId: 'COR-05', track: 'UP Main', startHour: 1, startMin: 45, endHour: 2, endMin: 30, priority: 1 },
  { trainNumber: 'GDS-601', trainName: 'Heavy Haul Freight', trainType: 'Goods', corridorId: 'COR-05', track: 'DN Main', startHour: 4, startMin: 30, endHour: 5, endMin: 30, priority: 3 },
  { trainNumber: '12622', trainName: 'Tamil Nadu Express', trainType: 'Express', corridorId: 'COR-05', track: 'UP Main', startHour: 8, startMin: 15, endHour: 9, endMin: 0, priority: 1 },
  { trainNumber: '12626', trainName: 'Kerala Express', trainType: 'Express', corridorId: 'COR-05', track: 'UP Main', startHour: 15, startMin: 0, endHour: 15, endMin: 50, priority: 1 },
  { trainNumber: 'GDS-602', trainName: 'Automobile Carrier Special', trainType: 'Goods', corridorId: 'COR-05', track: 'DN Main', startHour: 22, startMin: 0, endHour: 23, endMin: 0, priority: 3 }
];

// Synthetic Freight Forecast Dataset representing projected goods train traffic
// Derived from simulated COA / freight operations forecast streams

module.exports = [
  // ── COR-01: Delhi–Mumbai ──
  {
    corridorId: 'COR-01',
    windowStart: '00:00',
    windowEnd: '04:00',
    expectedFreightTrains: 1,
    forecastConfidence: 0.92,
    trafficLevel: 'LOW',
    reasoning: 'Off-peak freight window; container rakes held at marshalling yards.'
  },
  {
    corridorId: 'COR-01',
    windowStart: '02:00',
    windowEnd: '06:00',
    expectedFreightTrains: 1,
    forecastConfidence: 0.91,
    trafficLevel: 'LOW',
    reasoning: 'Golden night window; minimum freight interference expected.'
  },
  {
    corridorId: 'COR-01',
    windowStart: '06:00',
    windowEnd: '10:00',
    expectedFreightTrains: 4,
    forecastConfidence: 0.88,
    trafficLevel: 'MEDIUM',
    reasoning: 'Morning goods departures clearing industrial sidings.'
  },
  {
    corridorId: 'COR-01',
    windowStart: '08:00',
    windowEnd: '12:00',
    expectedFreightTrains: 5,
    forecastConfidence: 0.86,
    trafficLevel: 'HIGH',
    reasoning: 'Peak goods traffic; heavy inter-zonal rake exchanges.'
  },
  {
    corridorId: 'COR-01',
    windowStart: '12:00',
    windowEnd: '16:00',
    expectedFreightTrains: 2,
    forecastConfidence: 0.89,
    trafficLevel: 'LOW',
    reasoning: 'Midday traffic lull between passenger express banks.'
  },
  {
    corridorId: 'COR-01',
    windowStart: '16:00',
    windowEnd: '20:00',
    expectedFreightTrains: 6,
    forecastConfidence: 0.85,
    trafficLevel: 'HIGH',
    reasoning: 'Evening freight dispatch wave from port and logistics terminals.'
  },
  {
    corridorId: 'COR-01',
    windowStart: '20:00',
    windowEnd: '24:00',
    expectedFreightTrains: 3,
    forecastConfidence: 0.90,
    trafficLevel: 'MEDIUM',
    reasoning: 'Late evening goods transit connecting northern feeder lines.'
  },

  // ── COR-02: Delhi–Howrah ──
  { corridorId: 'COR-02', windowStart: '01:00', windowEnd: '05:00', expectedFreightTrains: 2, forecastConfidence: 0.90, trafficLevel: 'LOW' },
  { corridorId: 'COR-02', windowStart: '08:00', windowEnd: '14:00', expectedFreightTrains: 7, forecastConfidence: 0.84, trafficLevel: 'HIGH' },
  { corridorId: 'COR-02', windowStart: '14:00', windowEnd: '18:00', expectedFreightTrains: 3, forecastConfidence: 0.87, trafficLevel: 'MEDIUM' },
  { corridorId: 'COR-02', windowStart: '21:00', windowEnd: '01:00', expectedFreightTrains: 2, forecastConfidence: 0.91, trafficLevel: 'LOW' },

  // ── COR-03: Mumbai–Chennai ──
  { corridorId: 'COR-03', windowStart: '02:00', windowEnd: '06:00', expectedFreightTrains: 1, forecastConfidence: 0.93, trafficLevel: 'LOW' },
  { corridorId: 'COR-03', windowStart: '09:00', windowEnd: '15:00', expectedFreightTrains: 5, forecastConfidence: 0.85, trafficLevel: 'HIGH' },
  { corridorId: 'COR-03', windowStart: '15:00', windowEnd: '21:00', expectedFreightTrains: 3, forecastConfidence: 0.88, trafficLevel: 'MEDIUM' },

  // ── COR-04: Howrah–Chennai ──
  { corridorId: 'COR-04', windowStart: '01:30', windowEnd: '05:30', expectedFreightTrains: 1, forecastConfidence: 0.92, trafficLevel: 'LOW' },
  { corridorId: 'COR-04', windowStart: '08:00', windowEnd: '16:00', expectedFreightTrains: 6, forecastConfidence: 0.83, trafficLevel: 'HIGH' },

  // ── COR-05: Delhi–Chennai ──
  { corridorId: 'COR-05', windowStart: '02:00', windowEnd: '07:00', expectedFreightTrains: 2, forecastConfidence: 0.89, trafficLevel: 'LOW' },
  { corridorId: 'COR-05', windowStart: '10:00', windowEnd: '17:00', expectedFreightTrains: 7, forecastConfidence: 0.86, trafficLevel: 'HIGH' }
];

const { reoptimize } = require('../engine/reoptimizer');

exports.runWhatIf = async (req, res) => {
  try {
    const { scenario, corridorId, delayMinutes, description } = req.body;
    const result = await reoptimize({
      type: scenario || 'EMERGENCY_BLOCK',
      corridorId: corridorId || 'COR-01',
      delayMinutes: Number(delayMinutes) || 120,
      description: description || 'Track disruption requiring re-optimization'
    });
    res.status(200).json({ success: true, result, scenario, timestamp: new Date() });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getScenarios = (req, res) => {
  try {
    const scenarios = [
      { id: 'S1', name: 'Train Delay — 90 min', type: 'TRAIN_DELAY', corridorId: 'COR-01', delayMinutes: 90, description: 'Rajdhani Express delayed by 90 min on Delhi–Mumbai corridor' },
      { id: 'S2', name: 'Track Emergency', type: 'NEW_CRITICAL', corridorId: 'COR-02', delayMinutes: 120, description: 'Sudden track fracture detected — emergency block required' },
      { id: 'S3', name: 'Monsoon Disruption', type: 'WEATHER', corridorId: 'COR-03', delayMinutes: 180, description: 'Heavy rainfall causing speed restriction and rescheduling' },
      { id: 'S4', name: 'Power Failure — OHE', type: 'TRAIN_DELAY', corridorId: 'COR-04', delayMinutes: 60, description: 'OHE power failure causing traction halt on Howrah–Chennai' },
      { id: 'S5', name: 'Goods Train Reroute', type: 'NEW_CRITICAL', corridorId: 'COR-05', delayMinutes: 45, description: 'Goods train rerouted — block window freed for urgent maintenance' }
    ];
    res.status(200).json(scenarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

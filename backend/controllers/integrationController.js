const Defect = require('../models/Defect');
const Block = require('../models/Block');
const TrainSchedule = require('../models/TrainSchedule');
const Corridor = require('../models/Corridor');

exports.getMetrics = async (req, res) => {
  try {
    // 1. Query real MongoDB document counts using Mongoose countDocuments()
    const [
      tmsCount,
      smmsCount,
      trkCount,
      oheCount,
      coaCount,
      totalDefects,
      totalBlocks,
      totalSchedules
    ] = await Promise.all([
      // TMS (Track Maintenance System / Defects filtered by Track dept or TMS source)
      Defect.countDocuments({ $or: [{ source: 'TMS' }, { department: 'Track' }] }),
      // SMMS (Signal Maintenance System / Defects filtered by Signalling dept or SMMS source)
      Defect.countDocuments({ $or: [{ source: 'SMMS' }, { department: 'Signalling' }] }),
      // TRK (Track / Assets collection & Permanent Way defects)
      Defect.countDocuments({ $or: [{ source: 'TDMS' }, { department: 'Track' }, { assetId: /^TRK/ }] }),
      // OHE (Overhead Equipment / Traction & Electrical infrastructure)
      Defect.countDocuments({ department: { $in: ['Traction', 'Electrical', 'Infrastructure'] } }),
      // COA (Control Office Application / Schedule & Block records)
      Promise.all([
        Block.countDocuments(),
        TrainSchedule.countDocuments(),
        Defect.countDocuments({ source: 'COA' })
      ]).then(([blocks, trains, coaDefects]) => blocks + trains + coaDefects),
      Defect.countDocuments(),
      Block.countDocuments(),
      TrainSchedule.countDocuments()
    ]);

    // Unified storage total dynamically calculated by summing individual counts
    const totalRecords = tmsCount + smmsCount + trkCount + oheCount + coaCount;
    const storageVolumeKb = totalRecords * 1.8;
    const storageVolumeMb = (storageVolumeKb / 1024).toFixed(2) + ' MB';

    // 2. Source health & latency simulation
    const sourceConfigs = [
      { id: 'TMS', name: 'TMS', desc: 'Track Management', count: tmsCount, baseMin: 10, baseMax: 26 },
      { id: 'SMMS', name: 'SMMS', desc: 'Signal Maintenance', count: smmsCount, baseMin: 18, baseMax: 42 },
      { id: 'TRK', name: 'TRK', desc: 'Permanent Way Assets', count: trkCount, baseMin: 8, baseMax: 22 },
      { id: 'OHE', name: 'OHE', desc: 'Overhead Equipment', count: oheCount, baseMin: 12, baseMax: 35 },
      { id: 'COA', name: 'COA', desc: 'Control Office Ops', count: coaCount, baseMin: 16, baseMax: 38 }
    ];

    const sources = sourceConfigs.map(cfg => {
      // Fluctuating latency between 8ms and 45ms (simulating live network socket polling)
      const latency = Math.floor(Math.random() * (cfg.baseMax - cfg.baseMin + 1)) + cfg.baseMin;
      // Rare random spike condition (< 2% chance) to simulate minor source degradation
      const hasSpike = Math.random() < 0.02;
      const errorRate = hasSpike ? (Math.random() * 1.5 + 0.4).toFixed(1) + '%' : '0.0%';
      const isOnline = true;

      return {
        id: cfg.id,
        name: cfg.name,
        desc: cfg.desc,
        records: cfg.count,
        latency,
        errorRate,
        isOnline,
        status: isOnline ? 'ONLINE' : 'DEGRADED',
        lastHeartbeat: new Date().toISOString()
      };
    });

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      unifiedStorage: {
        totalRecords,
        volumeMb: storageVolumeMb,
        databaseBreakdown: {
          defects: totalDefects,
          blocks: totalBlocks,
          schedules: totalSchedules
        }
      },
      pipelines: {
        TMS: { count: tmsCount, desc: 'Track Management' },
        SMMS: { count: smmsCount, desc: 'Signal Maintenance' },
        TRK: { count: trkCount, desc: 'Permanent Way Assets' },
        OHE: { count: oheCount, desc: 'Overhead Equipment' },
        COA: { count: coaCount, desc: 'Control Office Ops' }
      },
      sources
    });
  } catch (error) {
    console.error('Data integration metrics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

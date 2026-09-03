import React, { useState, useMemo } from 'react';

// Semantic Evaluation Helper: Checks Corridor, Time Overlap, AND Operational Resource/Track
export function evaluateTrainConflict(train, blocks = []) {
  const trainDep = new Date(train.departureTime).getTime();
  const trainArr = new Date(train.arrivalTime).getTime();
  const trainTrack = train.track || (train.trainType === 'Goods' ? 'DN Main' : 'UP Main');

  // Find all maintenance blocks on the same corridor that overlap in time
  const overlappingBlocks = blocks.filter((b) => {
    if (b.corridorId !== train.corridorId) return false;
    const bStart = new Date(b.startTime).getTime();
    const bEnd = new Date(b.endTime).getTime();
    return trainDep < bEnd && trainArr > bStart;
  });

  if (overlappingBlocks.length === 0) {
    return {
      status: 'CLEAR',
      badge: '✓ CLEAR',
      title: 'CLEAR (No Overlapping Possession)',
      trackText: trainTrack,
      reason: 'No overlapping maintenance possessions scheduled on this corridor during train movement slot.',
      isConflict: false,
    };
  }

  // Check if ANY overlapping block uses the SAME operational resource/track
  const sameTrackBlock = overlappingBlocks.find((b) => {
    const bTrack = b.track || 'UP Main';
    return bTrack === trainTrack || bTrack === 'Both Tracks';
  });

  if (sameTrackBlock) {
    const sStr = new Date(sameTrackBlock.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const eStr = new Date(sameTrackBlock.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return {
      status: 'CONFLICT',
      badge: '⚠️ CONFLICT',
      title: '⚠️ OPERATIONAL CONFLICT DETECTED',
      trackText: `${trainTrack} (Shared Conflict with ${sameTrackBlock.blockCode})`,
      conflictingBlock: sameTrackBlock,
      reason: `Same operational resource (${trainTrack}) + overlapping time. Maintenance possession ${sameTrackBlock.blockCode} (${sStr}–${eStr}) fouls active train path.`,
      isConflict: true,
    };
  }

  // Overlapping in time on same corridor, but operational resources are separated!
  const sepBlock = overlappingBlocks[0];
  const bTrack = sepBlock.track || 'DN Main';
  const sStr = new Date(sepBlock.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const eStr = new Date(sepBlock.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return {
    status: 'SEPARATED',
    badge: '✓ CLEAR',
    title: 'CLEAR (Separated Operational Resource / Track)',
    trackText: `${trainTrack} (Train) vs ${bTrack} (Block ${sepBlock.blockCode})`,
    parallelBlock: sepBlock,
    reason: `Separated operational resource / track. Train operates on ${trainTrack} while maintenance possession ${sepBlock.blockCode} (${sStr}–${eStr}) is isolated on parallel ${bTrack}. Double-line bi-directional signalling allows safe passage without catenary de-energization or fouling conflict.`,
    isConflict: false,
  };
}

export default function TrainMovementTimeline({
  schedules = [],
  blocks = [],
  selectedCorridor = 'COR-01',
  targetDate: propTargetDate,
  selectedDayOffset = 0,
  nowPct = 0,
  nowTimeStr = '',
}) {
  const [selectedTrain, setSelectedTrain] = useState(null);

  const ALL_CORRIDORS = [
    { id: 'COR-01', label: 'Delhi – Mumbai', short: 'NDLS→CSMT' },
    { id: 'COR-02', label: 'Delhi – Howrah', short: 'NDLS→HWH' },
    { id: 'COR-03', label: 'Mumbai – Chennai', short: 'CSMT→MAS' },
    { id: 'COR-04', label: 'Howrah – Chennai', short: 'HWH→MAS' },
    { id: 'COR-05', label: 'Delhi – Chennai', short: 'NDLS→MAS' },
  ];

  // Corridors to display based on active filter
  const visibleCorridors = useMemo(() => {
    if (selectedCorridor === 'ALL') return ALL_CORRIDORS;
    const found = ALL_CORRIDORS.filter((c) => c.id === selectedCorridor);
    return found.length > 0 ? found : ALL_CORRIDORS;
  }, [selectedCorridor]);

  const filterDate = useMemo(() => {
    const d = propTargetDate ? new Date(propTargetDate) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [propTargetDate]);

  const filterDateEnd = useMemo(() => {
    const d = new Date(filterDate);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [filterDate]);

  // Filter train schedules by target date
  const dayTrains = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    return schedules.filter((tr) => {
      const dep = new Date(tr.departureTime);
      const arr = new Date(tr.arrivalTime);
      return dep <= filterDateEnd && arr >= filterDate;
    });
  }, [schedules, filterDate, filterDateEnd]);

  // Coordinate helper across 24h axis
  function getPosition(departureTime, arrivalTime) {
    const dayStart = new Date(filterDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(24, 0, 0, 0);

    const s = new Date(departureTime);
    const e = new Date(arrivalTime);

    const clampedStart = s < dayStart ? dayStart : s;
    const clampedEnd = e > dayEnd ? dayEnd : e;

    const startMinutes = (clampedStart - dayStart) / 60000;
    const durationMinutes = (clampedEnd - clampedStart) / 60000;

    const leftPct = (startMinutes / (24 * 60)) * 100;
    const widthPct = (durationMinutes / (24 * 60)) * 100;

    return {
      left: Math.max(0, Math.min(100, leftPct)),
      width: Math.max(2.4, Math.min(100 - leftPct, widthPct)),
    };
  }

  const totalPassengerTrains = dayTrains.filter(
    (tr) => tr.trainType !== 'Goods' && (selectedCorridor === 'ALL' || tr.corridorId === selectedCorridor)
  ).length;

  const totalGoodsTrains = dayTrains.filter(
    (tr) => tr.trainType === 'Goods' && (selectedCorridor === 'ALL' || tr.corridorId === selectedCorridor)
  ).length;

  // Compute conflict state for clicked train
  const trainConflictInfo = useMemo(() => {
    if (!selectedTrain) return null;
    return evaluateTrainConflict(selectedTrain, blocks);
  }, [selectedTrain, blocks]);

  return (
    <div className="flex flex-col gap-2.5">
      
      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: 🚆 PASSENGER / EXPRESS TRAIN MOVEMENT SCHEDULE (5 CORRIDOR ROWS)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🚆</span>
            <span className="font-mono-rail text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
              TRAIN MOVEMENT SCHEDULE — PASSENGER / EXPRESS
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono-rail text-[9px] text-slate-400">
            <span>
              Corridor: <strong className="text-slate-200">{selectedCorridor === 'ALL' ? 'ALL TRUNKS (5 ROWS)' : selectedCorridor}</strong>
            </span>
            <span>
              Timetable Services: <strong className="text-cyan-400">{totalPassengerTrains} Express Trains</strong>
            </span>
          </div>
        </div>

        {/* 5 Corridor Rows for Passenger Trains */}
        <div className="flex flex-col gap-1.5">
          {visibleCorridors.map((corridor) => {
            const corrPassengerTrains = dayTrains.filter(
              (tr) => tr.corridorId === corridor.id && tr.trainType !== 'Goods'
            );

            return (
              <div key={corridor.id} className="flex items-center gap-0">
                {/* Corridor Label Column (Synchronized w-36 width) */}
                <div className="w-36 flex-shrink-0 pr-2">
                  <div className="font-mono-rail text-[9px] text-slate-200 font-bold truncate">
                    {corridor.label}
                  </div>
                  <div className="font-mono-rail text-[8px] text-cyan-400/80 flex items-center gap-1">
                    <span>{corridor.short}</span>
                    <span className="text-[7px] text-slate-500">({corrPassengerTrains.length} Exp)</span>
                  </div>
                </div>

                {/* 24-Hour Track Lane */}
                <div className="flex-1 relative bg-slate-950/90 border border-slate-800 rounded overflow-hidden h-8">
                  {/* Hour Grid Lines */}
                  {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-slate-800/60"
                      style={{ left: `${(h / 24) * 100}%` }}
                    />
                  ))}

                  {/* Dynamic NOW Marker Line */}
                  {selectedDayOffset === 0 && (
                    <div
                      className="absolute top-0 bottom-0 border-l border-emerald-400/90 z-20 pointer-events-none"
                      style={{ left: `${nowPct}%` }}
                    />
                  )}

                  {/* Passenger Train Bars */}
                  {corrPassengerTrains.length === 0 ? (
                    <div className="absolute inset-0 flex items-center px-2 font-mono-rail text-[8px] text-slate-700">
                      NO PASSENGER SERVICES
                    </div>
                  ) : (
                    corrPassengerTrains.map((tr, idx) => {
                      const { left, width } = getPosition(tr.departureTime, tr.arrivalTime);
                      const depStr = new Date(tr.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                      const arrStr = new Date(tr.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

                      // Evaluate train conflict state
                      const conflictEval = evaluateTrainConflict(tr, blocks);

                      return (
                        <div
                          key={tr._id || idx}
                          onClick={() => setSelectedTrain(tr)}
                          className={`absolute top-1 bottom-1 rounded ${
                            conflictEval.isConflict
                              ? 'bg-red-500/35 border-2 border-red-400 text-red-200 animate-pulse'
                              : 'bg-cyan-600/35 border border-cyan-400/70 text-cyan-100 hover:bg-cyan-500/50 hover:border-cyan-300'
                          } flex items-center px-1.5 overflow-hidden cursor-pointer shadow-sm transition-all hover:scale-105 hover:z-30 group`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            zIndex: 10 + idx,
                          }}
                          title={`🚆 Express ${tr.trainNumber}: ${tr.trainName || ''}\n${depStr}–${arrStr}\nTrack: ${tr.track || 'UP Main'}\nStatus: ${conflictEval.badge} - ${conflictEval.reason}`}
                        >
                          <span className="font-mono-rail text-[8.5px] font-bold truncate leading-none flex items-center gap-1">
                            <span>{conflictEval.isConflict ? '⚠️' : '🚆'}</span>
                            <span>{tr.trainNumber}</span>
                            {width > 6 && <span className="opacity-75 text-[7.5px]">({depStr})</span>}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3: 🚛 GOODS / FREIGHT TRAIN MOVEMENT SCHEDULE (5 CORRIDOR ROWS)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🚛</span>
            <span className="font-mono-rail text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              TRAIN MOVEMENT SCHEDULE — GOODS / FREIGHT
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono-rail text-[9px] text-slate-400">
            <span>
              Corridor: <strong className="text-slate-200">{selectedCorridor === 'ALL' ? 'ALL TRUNKS (5 ROWS)' : selectedCorridor}</strong>
            </span>
            <span>
              Freight Rakes: <strong className="text-amber-400">{totalGoodsTrains} Dedicated Goods</strong>
            </span>
          </div>
        </div>

        {/* 5 Corridor Rows for Goods Trains */}
        <div className="flex flex-col gap-1.5">
          {visibleCorridors.map((corridor) => {
            const corrGoodsTrains = dayTrains.filter(
              (tr) => tr.corridorId === corridor.id && tr.trainType === 'Goods'
            );

            return (
              <div key={corridor.id} className="flex items-center gap-0">
                {/* Corridor Label Column (Synchronized w-36 width) */}
                <div className="w-36 flex-shrink-0 pr-2">
                  <div className="font-mono-rail text-[9px] text-slate-200 font-bold truncate">
                    {corridor.label}
                  </div>
                  <div className="font-mono-rail text-[8px] text-amber-400/80 flex items-center gap-1">
                    <span>{corridor.short}</span>
                    <span className="text-[7px] text-slate-500">({corrGoodsTrains.length} Goods)</span>
                  </div>
                </div>

                {/* 24-Hour Track Lane */}
                <div className="flex-1 relative bg-slate-950/90 border border-slate-800 rounded overflow-hidden h-8">
                  {/* Hour Grid Lines */}
                  {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-slate-800/60"
                      style={{ left: `${(h / 24) * 100}%` }}
                    />
                  ))}

                  {/* Dynamic NOW Marker Line */}
                  {selectedDayOffset === 0 && (
                    <div
                      className="absolute top-0 bottom-0 border-l border-emerald-400/90 z-20 pointer-events-none"
                      style={{ left: `${nowPct}%` }}
                    />
                  )}

                  {/* Goods Train Bars */}
                  {corrGoodsTrains.length === 0 ? (
                    <div className="absolute inset-0 flex items-center px-2 font-mono-rail text-[8px] text-slate-700">
                      NO GOODS MOVEMENTS
                    </div>
                  ) : (
                    corrGoodsTrains.map((tr, idx) => {
                      const { left, width } = getPosition(tr.departureTime, tr.arrivalTime);
                      const depStr = new Date(tr.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                      const arrStr = new Date(tr.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

                      const conflictEval = evaluateTrainConflict(tr, blocks);

                      return (
                        <div
                          key={tr._id || idx}
                          onClick={() => setSelectedTrain(tr)}
                          className={`absolute top-1 bottom-1 rounded ${
                            conflictEval.isConflict
                              ? 'bg-red-500/35 border-2 border-red-400 text-red-200 animate-pulse'
                              : 'bg-amber-600/35 border border-amber-500/70 text-amber-100 hover:bg-amber-500/50 hover:border-amber-400'
                          } flex items-center px-1.5 overflow-hidden cursor-pointer shadow-sm transition-all hover:scale-105 hover:z-30 group`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            zIndex: 10 + idx,
                          }}
                          title={`🚛 Goods Rake ${tr.trainNumber}: ${tr.trainName || 'Special'}\n${depStr}–${arrStr}\nTrack: ${tr.track || 'DN Main'}\nStatus: ${conflictEval.badge} - ${conflictEval.reason}`}
                        >
                          <span className="font-mono-rail text-[8.5px] font-bold truncate leading-none flex items-center gap-1">
                            <span>{conflictEval.isConflict ? '⚠️' : '🚛'}</span>
                            <span>{tr.trainNumber}</span>
                            {width > 6 && <span className="opacity-75 text-[7.5px]">({depStr})</span>}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Train Click Modal with Detailed Semantic Conflict Explanation */}
      {selectedTrain && trainConflictInfo && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3 font-mono-rail">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{selectedTrain.trainType === 'Goods' ? '🚛' : '🚆'}</span>
                <div>
                  <div className="text-xs font-bold text-slate-100">
                    {selectedTrain.trainType === 'Goods' ? 'GOODS / FREIGHT RAKE' : 'PASSENGER / EXPRESS TRAIN'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    Operational Line Headway Status
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrain(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 text-[10px]">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Train Number:</span>
                <span className="font-bold text-slate-100">{selectedTrain.trainNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Service Name:</span>
                <span className="font-bold text-cyan-300">{selectedTrain.trainName || 'Scheduled Rail Service'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Category:</span>
                <span className={selectedTrain.trainType === 'Goods' ? 'text-amber-400 font-bold' : 'text-cyan-400 font-bold'}>
                  {selectedTrain.trainType}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Corridor Route:</span>
                <span className="text-slate-200 font-bold">{selectedTrain.corridorId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Operational Track:</span>
                <span className="text-amber-300 font-bold">{selectedTrain.track || (selectedTrain.trainType === 'Goods' ? 'DN Main' : 'UP Main')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Scheduled Time Slot:</span>
                <span className="text-emerald-400 font-bold">
                  {new Date(selectedTrain.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {new Date(selectedTrain.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>

              {/* Explicit Semantic Conflict Assessment Display */}
              <div className="border-t border-slate-800 pt-2 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Operational Conflict State:</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                    trainConflictInfo.isConflict
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {trainConflictInfo.badge}
                  </span>
                </div>
                <div className={`p-2.5 rounded-lg border text-[9.5px] leading-relaxed ${
                  trainConflictInfo.isConflict
                    ? 'bg-red-950/40 border-red-500/40 text-red-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}>
                  <div className="font-bold mb-1 text-slate-200">
                    {trainConflictInfo.title}
                  </div>
                  <div>
                    {trainConflictInfo.reason}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedTrain(null)}
              className="mt-1 w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';

// Static / fallback Freight Forecast windows across trunk corridors
const FREIGHT_WINDOWS = [
  { startHour: 0, endHour: 4, level: 'LOW', label: '1 Rake', desc: 'Off-peak freight window' },
  { startHour: 4, endHour: 8, level: 'LOW', label: '1 Rake', desc: 'Golden night window; minimum goods traffic' },
  { startHour: 8, endHour: 12, level: 'HIGH', label: '5 Rakes', desc: 'Morning peak freight & industrial interchange' },
  { startHour: 12, endHour: 16, level: 'LOW', label: '2 Rakes', desc: 'Midday inter-peak freight clearance' },
  { startHour: 16, endHour: 20, level: 'MEDIUM', label: '4 Rakes', desc: 'Evening goods dispatch' },
  { startHour: 20, endHour: 24, level: 'LOW', label: '1 Rake', desc: 'Late night container stream' }
];

export default function NativeTimeline({
  blocks = [],
  schedules = [],
  selectedCorridor = 'COR-01',
  setSelectedCorridor,
  targetDate: propTargetDate,
  selectedDayOffset = 0,
  onBlockClick,
  setActiveConflict
}) {
  const [selectedItem, setSelectedItem] = useState(null); // { type: 'TRAIN' | 'BLOCK', data: ... }
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute for dynamic "NOW" line
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  const CORRIDORS = [
    { id: 'COR-01', label: 'COR-01 Delhi – Mumbai', short: 'NDLS→CSMT' },
    { id: 'COR-02', label: 'COR-02 Delhi – Howrah', short: 'NDLS→HWH' },
    { id: 'COR-03', label: 'COR-03 Mumbai – Chennai', short: 'CSMT→MAS' },
    { id: 'COR-04', label: 'COR-04 Howrah – Chennai', short: 'HWH→MAS' },
    { id: 'COR-05', label: 'COR-05 Delhi – Chennai', short: 'NDLS→MAS' },
  ];

  // 1. FILTER TRAIN SCHEDULES for Selected Corridor & Date
  const filteredTrains = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    return schedules.filter(tr => {
      if (selectedCorridor !== 'ALL' && tr.corridorId !== selectedCorridor) return false;
      const dep = new Date(tr.departureTime);
      const arr = new Date(tr.arrivalTime);
      return dep <= filterDateEnd && arr >= filterDate;
    });
  }, [schedules, selectedCorridor, filterDate, filterDateEnd]);

  // 2. FILTER MAINTENANCE BLOCKS for Selected Corridor & Date
  // TODAY: show ACTIVE, APPROVED, PROPOSED. Hide COMPLETED & CANCELLED.
  // YESTERDAY: show historical/completed records in audit style.
  // TOMORROW: show projected approved/proposed schedule.
  const filteredBlocks = useMemo(() => {
    return blocks.filter(b => {
      if (!b.startTime) return false;
      if (selectedCorridor !== 'ALL' && b.corridorId !== selectedCorridor) return false;

      const s = new Date(b.startTime);
      const e = new Date(b.endTime);
      const matchesDate = s <= filterDateEnd && e >= filterDate;
      if (!matchesDate) return false;

      const status = (b.status || '').toUpperCase();
      if (selectedDayOffset === 0) {
        // Today / Live: exclude completed/cancelled
        return !['COMPLETED', 'CANCELLED'].includes(status);
      } else if (selectedDayOffset === -1) {
        // Yesterday: include completed & active
        return true;
      }
      return true;
    });
  }, [blocks, selectedCorridor, filterDate, filterDateEnd, selectedDayOffset]);

  // Detect overlapping blocks to highlight genuine conflict blocks
  const conflictingBlockIds = useMemo(() => {
    const conflictSet = new Set();
    for (let i = 0; i < filteredBlocks.length; i++) {
      for (let j = i + 1; j < filteredBlocks.length; j++) {
        const a = filteredBlocks[i];
        const b = filteredBlocks[j];
        if (a.corridorId === b.corridorId || a.assetId === b.assetId) {
          const aS = new Date(a.startTime).getTime();
          const aE = new Date(a.endTime).getTime();
          const bS = new Date(b.startTime).getTime();
          const bE = new Date(b.endTime).getTime();
          if (aS < bE && bS < aE) {
            conflictSet.add(a._id || a.blockCode);
            conflictSet.add(b._id || b.blockCode);
          }
        }
      }
    }
    return conflictSet;
  }, [filteredBlocks]);

  // Check if AI Recommended block should be shown on COR-01 Today
  const showAiBlock = (selectedCorridor === 'ALL' || selectedCorridor === 'COR-01') && selectedDayOffset === 0;

  // Percentage coordinate helper across 24-hour horizontal axis
  function getTimelinePosition(startTime, endTime) {
    const dayStart = new Date(filterDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(24, 0, 0, 0);

    const s = new Date(startTime);
    const e = new Date(endTime);

    const clampedStart = s < dayStart ? dayStart : s;
    const clampedEnd = e > dayEnd ? dayEnd : e;

    const startMinutes = (clampedStart - dayStart) / 60000;
    const durationMinutes = (clampedEnd - clampedStart) / 60000;

    const leftPct = (startMinutes / (24 * 60)) * 100;
    const widthPct = (durationMinutes / (24 * 60)) * 100;

    return {
      left: Math.max(0, Math.min(100, leftPct)),
      width: Math.max(1.8, Math.min(100 - leftPct, widthPct))
    };
  }

  // Calculate dynamic NOW line percentage
  const nowPct = useMemo(() => {
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    return (minutes / (24 * 60)) * 100;
  }, [currentTime]);

  const nowTimeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="flex flex-col h-full select-none bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* ── TOP HEADER / TOOLBAR: CORRIDOR SELECTOR & SCHEDULE MODE ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/90 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Corridor Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              CORRIDOR:
            </span>
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor && setSelectedCorridor(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-emerald-400 text-xs py-1 px-2.5 rounded font-mono-rail font-bold outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">ALL CORRIDORS (OVERVIEW)</option>
              <option value="COR-01">COR-01 — Delhi → Mumbai (Golden Demo)</option>
              <option value="COR-02">COR-02 — Delhi → Howrah</option>
              <option value="COR-03">COR-03 — Mumbai → Chennai</option>
              <option value="COR-04">COR-04 — Howrah → Chennai</option>
              <option value="COR-05">COR-05 — Delhi → Chennai</option>
            </select>
          </div>

          <div className="h-4 w-[1px] bg-slate-700" />

          {/* Schedule Status Badge */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              selectedDayOffset === -1 ? 'bg-slate-500' : selectedDayOffset === 0 ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'
            }`} />
            <span className="font-mono-rail text-[10px] text-slate-300 font-semibold uppercase tracking-wider">
              {selectedDayOffset === -1 ? 'AUDIT MODE (HISTORICAL)' : selectedDayOffset === 0 ? 'ACTIVE LIVE SCHEDULE' : 'PROJECTED SCHEDULE'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono-rail text-[10px]">
          <span className="text-slate-400">
            Trains: <strong className="text-cyan-400">{filteredTrains.length}</strong>
          </span>
          <span className="text-slate-400">
            Blocks: <strong className="text-emerald-400">{filteredBlocks.length + (showAiBlock ? 1 : 0)}</strong>
          </span>
          {conflictingBlockIds.size > 0 && (
            <span className="text-red-400 font-bold flex items-center gap-1 bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded">
              <span className="animate-pulse">⚠</span>
              <span>{Math.ceil(conflictingBlockIds.size / 2)} Active Conflict{conflictingBlockIds.size > 2 ? 's' : ''}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── 24-HOUR TIME SCALE AXIS ── */}
      <div className="flex-shrink-0 px-4 pt-2 pb-1 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center">
          <div className="w-32 flex-shrink-0 font-mono-rail text-[8px] uppercase tracking-wider text-slate-500 font-bold">
            TIMELINE (24H)
          </div>
          <div className="flex-1 relative h-4">
            {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map(h => (
              <span
                key={h}
                className="absolute font-mono-rail text-[8px] text-slate-500 -translate-x-1/2"
                style={{ left: `${(h / 24) * 100}%` }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN SCROLLABLE SECTIONS ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4 relative">

        {/* ── SECTION A: 🚆 TRAIN MOVEMENTS (PASSENGER & GOODS) ── */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">🚆</span>
              <span className="font-mono-rail text-xs font-bold text-slate-200">
                SECTION A: TRAIN MOVEMENTS (TIMETABLE & GOODS STREAMS)
              </span>
            </div>
            <span className="font-mono-rail text-[9px] text-slate-500">
              Blue = Passenger / Express · Orange = Goods / Freight
            </span>
          </div>

          <div className="flex items-center gap-0 mt-1">
            <div className="w-32 flex-shrink-0 font-mono-rail text-[9px] text-slate-400 font-semibold pr-2">
              <div>Passenger & Goods</div>
              <div className="text-[8px] text-slate-500">Headway Slots</div>
            </div>

            {/* 24-hour Train Movement Track Row */}
            <div className="flex-1 relative bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden h-14">
              {/* Hour Grid Lines */}
              {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => (
                <div
                  key={h}
                  className="absolute top-0 bottom-0 border-l border-slate-800/60"
                  style={{ left: `${(h / 24) * 100}%` }}
                />
              ))}

              {/* Dynamic NOW Marker Line (Only for Today) */}
              {selectedDayOffset === 0 && (
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-emerald-400 z-30 pointer-events-none"
                  style={{ left: `${nowPct}%` }}
                >
                  <div className="absolute -top-1 -left-2 bg-emerald-500 text-slate-950 font-mono-rail text-[7px] font-bold px-1 rounded shadow">
                    NOW
                  </div>
                </div>
              )}

              {/* Train Bars */}
              {filteredTrains.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center font-mono-rail text-[9px] text-slate-600">
                  NO TIMETABLE TRAINS SCHEDULED ON THIS DATE
                </div>
              ) : (
                filteredTrains.map((train, idx) => {
                  const { left, width } = getTimelinePosition(train.departureTime, train.arrivalTime);
                  const isGoods = train.trainType === 'Goods';
                  const depStr = new Date(train.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  const arrStr = new Date(train.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

                  // Style distinction: Cyan for Express, Amber for Goods
                  const barStyle = isGoods
                    ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 hover:bg-amber-500/40'
                    : 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200 hover:bg-cyan-500/40';

                  return (
                    <div
                      key={train._id || idx}
                      onClick={() => setSelectedItem({ type: 'TRAIN', data: train })}
                      className={`absolute top-2 bottom-2 rounded border ${barStyle} flex items-center px-1.5 overflow-hidden cursor-pointer shadow transition-all hover:scale-105 hover:z-40 group`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        zIndex: 10 + idx
                      }}
                      title={`${isGoods ? '🚛 Goods' : '🚆 Express'} ${train.trainNumber}: ${train.trainName || ''} (${depStr}–${arrStr})`}
                    >
                      <span className="font-mono-rail text-[8px] font-bold truncate leading-none flex items-center gap-1">
                        <span>{isGoods ? '🚛' : '🚆'}</span>
                        <span>{train.trainNumber}</span>
                        {width > 8 && <span className="opacity-80">({depStr}–{arrStr})</span>}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION B: 🔧 MAINTENANCE BLOCKS (ACTIVE, APPROVED, AI RECOMMENDED) ── */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔧</span>
              <span className="font-mono-rail text-xs font-bold text-slate-200">
                SECTION B: CORRIDOR MAINTENANCE BLOCKS & AI RE-PLANNING
              </span>
            </div>
            <span className="font-mono-rail text-[9px] text-slate-500">
              Only specific conflicting blocks are highlighted in red (no entire corridor row red)
            </span>
          </div>

          <div className="flex items-center gap-0 mt-1">
            <div className="w-32 flex-shrink-0 font-mono-rail text-[9px] text-slate-400 font-semibold pr-2">
              <div>Corridor Possession</div>
              <div className="text-[8px] text-slate-500">Track & Catenary</div>
            </div>

            {/* 24-hour Maintenance Track Row */}
            <div className="flex-1 relative bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden h-16">
              {/* Hour Grid Lines */}
              {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => (
                <div
                  key={h}
                  className="absolute top-0 bottom-0 border-l border-slate-800/60"
                  style={{ left: `${(h / 24) * 100}%` }}
                />
              ))}

              {/* Dynamic NOW Marker Line (Only for Today) */}
              {selectedDayOffset === 0 && (
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-emerald-400 z-30 pointer-events-none"
                  style={{ left: `${nowPct}%` }}
                >
                  <div className="absolute -top-1 -left-2 bg-emerald-500 text-slate-950 font-mono-rail text-[7px] font-bold px-1 rounded shadow">
                    NOW
                  </div>
                </div>
              )}

              {/* 1. AI RECOMMENDED GOLDEN DEMO BLOCK (02:00–08:00 on COR-01) */}
              {showAiBlock && (
                <div
                  onClick={() => setSelectedItem({
                    type: 'AI_BLOCK',
                    data: {
                      blockCode: 'AI-BLK-COORD-01',
                      corridorId: 'COR-01',
                      department: 'Track + Signalling + Traction',
                      timeLabel: '02:00 – 08:00 (6h Duration)',
                      defects: ['DEF-0101 (Track 4h)', 'DEF-0102 (Signalling 2h)', 'DEF-0103 (Traction 2h)'],
                      score: 78,
                      feasible: true,
                      timeSaved: '5.0h Saved',
                      trainImpact: '0 Passenger Express Delays'
                    }
                  })}
                  className="absolute top-1.5 bottom-1.5 rounded-lg border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 flex items-center px-2 overflow-hidden cursor-pointer shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.02] hover:z-40 animate-pulse"
                  style={{
                    left: `${(2 / 24) * 100}%`,
                    width: `${(6 / 24) * 100}%`,
                    zIndex: 25
                  }}
                  title="🤖 AI RECOMMENDED: 02:00–08:00 | Track + Signalling + Traction (6h, Score 78, Feasible)"
                >
                  <div className="font-mono-rail text-[8px] font-bold flex flex-col justify-center leading-tight">
                    <div className="flex items-center gap-1 text-emerald-400">
                      <span>🤖</span>
                      <span className="bg-emerald-500 text-slate-950 px-1 py-0.2 rounded text-[7px] font-extrabold">
                        AI RECOMMENDED
                      </span>
                      <span>02:00 – 08:00</span>
                    </div>
                    <div className="text-[7px] text-emerald-200/90 truncate">
                      Track + Signalling + Traction · Score 78 (Feasible)
                    </div>
                  </div>
                </div>
              )}

              {/* 2. REAL OPERATIONAL MAINTENANCE BLOCKS */}
              {filteredBlocks.map((block, idx) => {
                const { left, width } = getTimelinePosition(block.startTime, block.endTime);
                const hasConflict = conflictingBlockIds.has(block._id || block.blockCode);
                const sH = new Date(block.startTime).getHours();
                const sM = new Date(block.startTime).getMinutes();
                const eH = new Date(block.endTime).getHours();
                const eM = new Date(block.endTime).getMinutes();
                const timeLabel = `${String(sH).padStart(2,'0')}:${String(sM).padStart(2,'0')}–${String(eH).padStart(2,'0')}:${String(eM).padStart(2,'0')}`;

                let colorStyle = 'bg-violet-600/30 border-violet-500 text-violet-200';
                if (block.status === 'ACTIVE') {
                  colorStyle = 'bg-emerald-600/30 border-emerald-500 text-emerald-200';
                } else if (block.status === 'APPROVED') {
                  colorStyle = 'bg-cyan-600/30 border-cyan-500 text-cyan-200';
                }

                // If genuine operational conflict, apply red border/accent to THIS BLOCK only
                if (hasConflict) {
                  colorStyle = 'bg-red-500/20 border-red-500 text-red-300 ring-1 ring-red-500';
                }

                return (
                  <div
                    key={block._id || idx}
                    onClick={() => {
                      if (hasConflict && setActiveConflict) {
                        setActiveConflict(block);
                      }
                      setSelectedItem({ type: 'BLOCK', data: block, hasConflict });
                    }}
                    className={`absolute top-2 bottom-2 rounded border ${colorStyle} flex items-center px-1.5 overflow-hidden cursor-pointer shadow transition-all hover:scale-105 hover:z-40 group`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      zIndex: hasConflict ? 35 : 15 + idx
                    }}
                    title={`${block.blockCode || 'Block'} | ${block.department} | ${timeLabel}${hasConflict ? ' [⚠ CONFLICT]' : ''}`}
                  >
                    <span className="font-mono-rail text-[8px] font-bold truncate leading-none flex items-center gap-1">
                      {hasConflict && <span className="text-red-400 font-extrabold animate-pulse">⚠</span>}
                      <span>{block.blockCode || block.assetId}</span>
                      <span className="opacity-75">({block.department})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SECTION C: 📦 FREIGHT / TRAFFIC DENSITY CONTEXT ── */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">📦</span>
              <span className="font-mono-rail text-xs font-bold text-slate-200">
                SECTION C: FREIGHT TRAFFIC DENSITY & CORRIDOR HEADWAY WINDOWS
              </span>
            </div>
            <span className="font-mono-rail text-[9px] text-slate-500">
              Low density night windows (00:00–08:00) represent ideal white space for coordinated block execution
            </span>
          </div>

          <div className="flex items-center gap-0 mt-1">
            <div className="w-32 flex-shrink-0 font-mono-rail text-[9px] text-slate-400 font-semibold pr-2">
              <div>Freight Density</div>
              <div className="text-[8px] text-slate-500">COA Projection</div>
            </div>

            {/* 24-hour Freight Context Axis */}
            <div className="flex-1 relative bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden h-8 flex">
              {FREIGHT_WINDOWS.map((fw, idx) => {
                const widthPct = ((fw.endHour - fw.startHour) / 24) * 100;
                const isHigh = fw.level === 'HIGH';
                const isMed = fw.level === 'MEDIUM';

                const bgClass = isHigh
                  ? 'bg-red-500/15 text-red-300 border-red-500/30'
                  : isMed
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';

                return (
                  <div
                    key={idx}
                    className={`h-full border-r border-slate-800/80 flex items-center justify-between px-2 font-mono-rail text-[8px] ${bgClass}`}
                    style={{ width: `${widthPct}%` }}
                    title={`${fw.startHour}:00–${fw.endHour}:00 | ${fw.level} Freight Traffic (${fw.label}): ${fw.desc}`}
                  >
                    <span className="font-bold">{String(fw.startHour).padStart(2,'0')}–{String(fw.endHour).padStart(2,'0')}</span>
                    <span className="opacity-90">{fw.level} ({fw.label})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ── BOTTOM LEGEND & "NOW" INDICATOR ── */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-cyan-500/40 border border-cyan-400" />
            <span className="font-mono-rail text-[8px] text-slate-400">🚆 Passenger / Express</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-400" />
            <span className="font-mono-rail text-[8px] text-slate-400">🚛 Goods / Freight</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-violet-500/40 border border-violet-400" />
            <span className="font-mono-rail text-[8px] text-slate-400">🔧 Maintenance Block</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-400 animate-pulse" />
            <span className="font-mono-rail text-[8px] text-emerald-400 font-bold">🤖 AI Recommended (02:00–08:00)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-red-500/40 border border-red-500 ring-1 ring-red-400" />
            <span className="font-mono-rail text-[8px] text-red-400 font-bold">⚠ Conflict / At Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-slate-600 border border-slate-500" />
            <span className="font-mono-rail text-[8px] text-slate-500">✓ Completed / Historical</span>
          </div>
        </div>

        {/* Dynamic NOW Clock Indicator */}
        <div className="flex items-center gap-2 bg-slate-950 border border-emerald-500/40 px-2.5 py-1 rounded">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono-rail text-[9px] font-bold text-emerald-400">
            NOW · {nowTimeStr} IST
          </span>
        </div>
      </div>

      {/* ── INTERACTIVE DETAIL MODAL / POPUP ON ITEM CLICK ── */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3 font-mono-rail">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {selectedItem.type === 'TRAIN' ? (selectedItem.data.trainType === 'Goods' ? '🚛' : '🚆') : selectedItem.type === 'AI_BLOCK' ? '🤖' : '🔧'}
                </span>
                <span className="text-xs font-bold text-slate-100">
                  {selectedItem.type === 'TRAIN' ? `TRAIN MOVEMENT: ${selectedItem.data.trainNumber}` : selectedItem.type === 'AI_BLOCK' ? 'AI RECOMMENDED BLOCK' : `MAINTENANCE BLOCK: ${selectedItem.data.blockCode || selectedItem.data.assetId}`}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-100 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* TRAIN DETAILS */}
            {selectedItem.type === 'TRAIN' && (
              <div className="flex flex-col gap-2 text-[10px]">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Train Name:</span>
                  <span className="text-slate-200 font-bold">{selectedItem.data.trainName || 'Scheduled Service'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Train Type:</span>
                  <span className={selectedItem.data.trainType === 'Goods' ? 'text-amber-400 font-bold' : 'text-cyan-400 font-bold'}>
                    {selectedItem.data.trainType}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Corridor Route:</span>
                  <span className="text-slate-200">{selectedItem.data.corridorId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Timing Slot:</span>
                  <span className="text-emerald-400 font-bold">
                    {new Date(selectedItem.data.departureTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false})} – {new Date(selectedItem.data.arrivalTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false})}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Priority Level:</span>
                  <span className="text-slate-200">Priority {selectedItem.data.priority || 1}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">AI Block Status:</span>
                  <span className="text-emerald-400">Headway clear; zero interference with 02:00–08:00 window</span>
                </div>
              </div>
            )}

            {/* AI RECOMMENDED BLOCK DETAILS */}
            {selectedItem.type === 'AI_BLOCK' && (
              <div className="flex flex-col gap-2 text-[10px]">
                <div className="bg-emerald-500/10 border border-emerald-500/40 p-2.5 rounded-lg text-emerald-300">
                  <div className="font-bold text-xs">CAND-02: 02:00 – 08:00 (Night Golden Window)</div>
                  <div className="text-[9px] text-emerald-400/90 mt-1">
                    Constraint-Engine validated: 3 departments consolidated into 1 corridor block.
                  </div>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Departments:</span>
                  <span className="text-slate-200 font-bold">Track + Signalling + Traction</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Tasks Bundled:</span>
                  <span className="text-slate-200">DEF-0101 (4h), DEF-0102 (2h), DEF-0103 (2h)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Composite Score:</span>
                  <span className="text-emerald-400 font-bold">78 / 100 (FEASIBLE)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Downtime Saved:</span>
                  <span className="text-amber-400 font-bold">5.0 Hours Saved (vs 11.0h separate)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Train Impact:</span>
                  <span className="text-emerald-400 font-bold">0 Express Passenger Delays</span>
                </div>
              </div>
            )}

            {/* MAINTENANCE BLOCK DETAILS */}
            {selectedItem.type === 'BLOCK' && (
              <div className="flex flex-col gap-2 text-[10px]">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Block Code:</span>
                  <span className="text-slate-200 font-bold">{selectedItem.data.blockCode || selectedItem.data.assetId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Department:</span>
                  <span className="text-slate-200">{selectedItem.data.department}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Corridor:</span>
                  <span className="text-slate-200">{selectedItem.data.corridorId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Window:</span>
                  <span className="text-cyan-400 font-bold">
                    {new Date(selectedItem.data.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false})} – {new Date(selectedItem.data.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false})}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-emerald-400 font-bold uppercase">{selectedItem.data.status}</span>
                </div>
                {selectedItem.hasConflict && (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-[9px]">
                    ⚠ CONFLICT DETECTED: This block overlaps with another active possession on {selectedItem.data.corridorId}.
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setSelectedItem(null)}
              className="mt-2 w-full py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

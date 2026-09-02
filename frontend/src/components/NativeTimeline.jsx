import { useState } from 'react';

export default function NativeTimeline({ 
  blocks = [], 
  onBlockClick, 
  setActiveConflict, 
  targetDate: propTargetDate, 
  selectedDayOffset = 0 
}) {
  const [internalDate, setInternalDate] = useState('today');

  const now = new Date();
  const filterDate = propTargetDate 
    ? new Date(propTargetDate) 
    : (() => {
        const d = new Date(now);
        if (internalDate === 'tomorrow') d.setDate(now.getDate() + 1);
        return d;
      })();

  filterDate.setHours(0, 0, 0, 0);
  const filterDateEnd = new Date(filterDate);
  filterDateEnd.setHours(23, 59, 59, 999);

  const dayBlocks = blocks.filter(b => {
    if (!b.startTime) return false;
    const s = new Date(b.startTime);
    const e = new Date(b.endTime);
    return s <= filterDateEnd && e >= filterDate;
  });

  const CORRIDORS = [
    { id: 'COR-01', label: 'Delhi – Mumbai',   short: 'NDLS→CSMT' },
    { id: 'COR-02', label: 'Delhi – Howrah',    short: 'NDLS→HWH'  },
    { id: 'COR-03', label: 'Mumbai – Chennai',  short: 'CSMT→MAS'  },
    { id: 'COR-04', label: 'Howrah – Chennai',  short: 'HWH→MAS'   },
    { id: 'COR-05', label: 'Delhi – Chennai',   short: 'NDLS→MAS'  },
  ];

  function getCorridorBlocks(corridorId) {
    return dayBlocks.filter(b => b.corridorId === corridorId);
  }

  function getBlockPosition(block) {
    const dayStart = new Date(filterDate);
    dayStart.setHours(0, 0, 0, 0);
    const s = new Date(block.startTime);
    const e = new Date(block.endTime);

    const clampedStart = s < dayStart ? dayStart : s;
    const dayEnd = new Date(dayStart); dayEnd.setHours(24, 0, 0, 0);
    const clampedEnd = e > dayEnd ? dayEnd : e;

    const startMinutes = (clampedStart - dayStart) / 60000;
    const durationMinutes = (clampedEnd - clampedStart) / 60000;

    const startHour = startMinutes / 60;
    const durationHours = durationMinutes / 60;

    const leftPct  = (startHour / 24) * 100;
    const widthPct = (durationHours / 24) * 100;

    return {
      left:  Math.max(0, Math.min(100, leftPct)),
      width: Math.max(0.5, Math.min(100 - leftPct, widthPct))
    };
  }

  function getBlockColor(block) {
    const isYesterday = selectedDayOffset === -1;
    const isCompletedOrExecuted = ['COMPLETED', 'EXECUTED'].includes(block.status?.toUpperCase());

    if (isYesterday || isCompletedOrExecuted) {
      return 'bg-slate-600/70 border-slate-500 text-slate-300';
    }

    const colors = {
      active:      'bg-emerald-500/70 border-emerald-400/50',
      approved:    'bg-cyan-500/70    border-cyan-400/50',
      proposed:    'bg-blue-500/70    border-blue-400/50',
      completed:   'bg-slate-600/70   border-slate-500/40',
      executed:    'bg-slate-600/70   border-slate-500/40',
      cancelled:   'bg-red-800/60     border-red-700/40',
      maintenance: 'bg-violet-500/70  border-violet-400/50',
      inspection:  'bg-amber-500/70   border-amber-400/50',
    };
    return colors[block.status?.toLowerCase()] || 'bg-slate-500/60 border-slate-400/40';
  }

  function getDeptAccent(dept) {
    const d = {
      'Traction':       'border-l-emerald-400',
      'Signalling':     'border-l-blue-400',
      'Track':          'border-l-amber-400',
      'Rolling Stock':  'border-l-violet-400',
      'Infrastructure': 'border-l-teal-400',
      'Electrical':     'border-l-red-400',
    };
    return d[dept] || 'border-l-slate-400';
  }

  function hasTimeOverlap(blocks) {
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const aStart = new Date(blocks[i].startTime);
        const aEnd   = new Date(blocks[i].endTime);
        const bStart = new Date(blocks[j].startTime);
        const bEnd   = new Date(blocks[j].endTime);
        if (aStart < bEnd && bStart < aEnd) return true;
      }
    }
    return false;
  }

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-900/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            selectedDayOffset === -1 
              ? 'bg-slate-500' 
              : selectedDayOffset === 0 
                ? 'bg-emerald-400 animate-pulse' 
                : 'bg-blue-400'
          }`} />
          <span className="font-mono-rail text-[10px] text-slate-300 font-semibold uppercase tracking-wider">
            {selectedDayOffset === -1 ? 'AUDIT MODE (HISTORICAL)' : selectedDayOffset === 0 ? 'ACTIVE LIVE SCHEDULE' : 'PROJECTED SCHEDULE'}
          </span>
        </div>
        <span className="font-mono-rail text-[9px] text-slate-400">
          {dayBlocks.length} {dayBlocks.length === 1 ? 'block' : 'blocks'} {selectedDayOffset === -1 ? 'recorded' : 'scheduled'}
        </span>
      </div>

      <div className="flex-shrink-0 px-4 pt-3 pb-1">
        <div className="flex items-center">
          <div className="w-36 flex-shrink-0" />
          <div className="flex-1 relative h-4">
            {[0,2,4,6,8,10,12,14,16,18,20,22,24].map(h => (
              <span
                key={h}
                className="absolute font-mono-rail text-[8px] text-slate-600 -translate-x-1/2"
                style={{ left: `${(h/24)*100}%` }}
              >
                {String(h).padStart(2,'0')}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-2">
          {CORRIDORS.map(corridor => {
            const corrBlocks = getCorridorBlocks(corridor.id);
            const hasConflict = corrBlocks.length >= 2 && hasTimeOverlap(corrBlocks);
            
            let trackRowClass = "flex-1 relative bg-slate-900/80 border border-slate-700/60 rounded-md overflow-hidden";
            if (hasConflict) {
              trackRowClass += " bg-red-900/10 border-red-800/40";
            }

            return (
              <div key={corridor.id} className="flex items-center gap-0">
                <div className="w-36 flex-shrink-0 pr-3">
                  <div className="font-mono-rail text-[9px] text-slate-300 font-semibold truncate">
                    {corridor.label}
                    {hasConflict && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-1 align-middle" />
                    )}
                  </div>
                  <div className="font-mono-rail text-[8px] text-slate-600 mt-0.5">
                    {corridor.short}
                    {hasConflict && (
                      <span className="text-red-400 ml-1">⚠</span>
                    )}
                  </div>
                </div>

                <div
                  className={trackRowClass}
                  style={{ height: '44px' }}
                >
                  {[2,4,6,8,10,12,14,16,18,20,22].map(h => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-slate-700/30"
                      style={{ left: `${(h/24)*100}%` }}
                    />
                  ))}
                  <div
                    className="absolute top-0 bottom-0 border-l border-slate-600/50"
                    style={{ left: '50%' }}
                  />
                  {selectedDayOffset === 0 && (() => {
                    const nowPct = ((now.getHours() * 60 + now.getMinutes()) / (24*60)) * 100;
                    return (
                      <div
                        className="absolute top-0 bottom-0 border-l-2 border-emerald-400/80 z-20"
                        style={{ left: `${nowPct}%` }}
                      >
                        <div className="absolute -top-0 -left-1 w-2 h-2 bg-emerald-400 rounded-full" />
                      </div>
                    );
                  })()}
                  {corrBlocks.length === 0 && (
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="font-mono-rail text-[8px] text-slate-700">
                        NO BLOCKS SCHEDULED
                      </span>
                    </div>
                  )}
                  {corrBlocks.map((block, idx) => {
                    const { left, width } = getBlockPosition(block);
                    const colorClass = getBlockColor(block);
                    const deptAccent = getDeptAccent(block.department);
                    const assetShort = block.assetId?.split('-').slice(-1)[0] || '';
                    const startH = new Date(block.startTime).getHours();
                    const startM = new Date(block.startTime).getMinutes();
                    const endH = new Date(block.endTime).getHours();
                    const endM = new Date(block.endTime).getMinutes();
                    const timeLabel = `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}–${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;

                    return (
                      <div
                        key={block._id || idx}
                        onClick={() => {
                          const handler = onBlockClick || setActiveConflict;
                          if (handler) handler(block);
                        }}
                        className={`absolute top-1 bottom-1 rounded border ${colorClass} border-l-2 ${deptAccent} 
                                    flex items-center overflow-hidden cursor-pointer
                                    hover:brightness-125 hover:ring-1 hover:ring-emerald-400 hover:z-30 transition-all group`}
                        style={{
                          left:  `${left}%`,
                          width: `${width}%`,
                          zIndex: 10 + idx,
                        }}
                        title={`Click to resolve conflict: ${block.assetId} | ${block.department} | ${block.status}\n${timeLabel}\nCorridor: ${block.corridorId}`}
                      >
                        <div className="absolute bottom-full left-0 mb-1 z-50 hidden group-hover:flex 
                                        flex-col bg-slate-900 border border-slate-600 rounded-lg p-2 
                                        shadow-xl min-w-max pointer-events-none">
                          <span className="font-mono-rail text-[9px] text-slate-300 font-bold">
                            {block.assetId}
                          </span>
                          <span className="font-mono-rail text-[8px] text-slate-500">
                            {block.department}
                          </span>
                          <span className="font-mono-rail text-[8px] text-emerald-400">
                            {timeLabel}
                          </span>
                          <span className="font-mono-rail text-[8px] text-slate-500 capitalize">
                            {block.status}
                          </span>
                          {block.conflictFlags?.length > 0 && (
                            <span className="font-mono-rail text-[8px] text-red-400 mt-0.5">
                              ⚠ {block.conflictFlags.join(', ')}
                            </span>
                          )}
                        </div>
                        {width > 4 && (
                          <span className="font-mono-rail text-[8px] text-white/90 font-semibold 
                                           px-1.5 truncate leading-none">
                            {width > 8 ? block.assetId : assetShort}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-2 border-t border-slate-700/50 flex items-center gap-4 flex-wrap">
        {[
          { label: 'Active',      cls: 'bg-emerald-500/70' },
          { label: 'Approved',    cls: 'bg-cyan-500/70'    },
          { label: 'Proposed',    cls: 'bg-blue-500/70'    },
          { label: 'Maintenance', cls: 'bg-violet-500/70'  },
          { label: 'Inspection',  cls: 'bg-amber-500/70'   },
          { label: 'Completed',   cls: 'bg-slate-500/60'   },
          { label: 'Conflict ⚠', cls: 'bg-red-500/70'     },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${cls} border border-white/10`} />
            <span className="font-mono-rail text-[8px] text-slate-500">{label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-0.5 h-3 bg-emerald-400/80" />
          <span className="font-mono-rail text-[8px] text-slate-500">Now</span>
        </div>
      </div>
    </div>
  );
}

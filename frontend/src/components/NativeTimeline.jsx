export default function NativeTimeline({ blocks, days }) {
  const getStatusClass = (status) => {
    switch(status) {
      case 'ACTIVE': return 'tl-block-active';
      case 'APPROVED': return 'tl-block-approved';
      case 'PROPOSED': return 'tl-block-proposed';
      case 'COMPLETED': return 'tl-block-completed';
      case 'CANCELLED': return 'tl-block-cancelled';
      default: return 'tl-block-idle';
    }
  };

  const getDayBlocks = (dayIndex) => {
    return blocks.filter(b => {
      const bDay = new Date(b.startTime).getDay();
      // dayIndex is 0 for Mon, 6 for Sun in this specific UI?
      // Wait, let's map generic day string to standard getDay()
      const dayMap = { 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6, 'SUN': 0 };
      return bDay === dayMap[days[dayIndex]];
    });
  };

  return (
    <div className="flex flex-col h-full text-xs">
      <div className="flex justify-between font-mono-rail text-[8px] text-slate-600 mb-1 ml-10">
        {[...Array(13)].map((_, i) => (
          <span key={i}>{String(i * 2).padStart(2, '0')}</span>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2">
        {days.map((day, i) => {
          const dayBlocks = getDayBlocks(i);
          const hasConflicts = dayBlocks.some(b => b.conflictFlags && b.conflictFlags.length > 0);
          
          return (
            <div key={day} className="flex items-center gap-2">
              <div className="font-mono-rail text-[9px] text-slate-500 uppercase w-10 flex-shrink-0 flex items-center justify-between">
                {day}
                {hasConflicts && <span className="text-red-500 text-xs leading-none">⚠</span>}
              </div>
              
              <div className="flex-1 bg-slate-700/40 rounded h-6 relative overflow-hidden">
                {dayBlocks.map(block => {
                  const s = new Date(block.startTime);
                  const e = new Date(block.endTime);
                  const startHour = s.getHours() + s.getMinutes()/60;
                  const endHour = e.getHours() + e.getMinutes()/60;
                  const leftPct = (startHour / 24) * 100;
                  const widthPct = ((endHour - startHour) / 24) * 100;
                  const isConflict = block.conflictFlags && block.conflictFlags.length > 0;
                  
                  return (
                    <div
                      key={block._id}
                      className={`absolute top-0 bottom-0 rounded flex items-center px-1 overflow-hidden
                        ${getStatusClass(block.status)} ${isConflict ? 'ring-1 ring-red-500 border border-red-500' : ''}`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`Asset: ${block.assetId} | Dept: ${block.department} | Status: ${block.status} | Time: ${s.toLocaleTimeString()} - ${e.toLocaleTimeString()}`}
                    >
                      {widthPct > 6 && (
                        <span className="font-mono-rail text-[8px] text-white/90 truncate w-full">
                          {block.assetId}
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

      <div className="flex gap-3 mt-2 flex-wrap items-center pt-2 border-t border-slate-700/50">
        <div className="flex items-center gap-1 font-mono-rail text-[9px] text-slate-400">
          <div className="w-2 h-2 tl-block-active rounded"></div> Active
        </div>
        <div className="flex items-center gap-1 font-mono-rail text-[9px] text-slate-400">
          <div className="w-2 h-2 tl-block-approved rounded"></div> Approved
        </div>
        <div className="flex items-center gap-1 font-mono-rail text-[9px] text-slate-400">
          <div className="w-2 h-2 tl-block-proposed rounded"></div> Proposed
        </div>
        <div className="flex items-center gap-1 font-mono-rail text-[9px] text-slate-400">
          <div className="w-2 h-2 tl-block-completed rounded"></div> Completed
        </div>
      </div>
    </div>
  );
}

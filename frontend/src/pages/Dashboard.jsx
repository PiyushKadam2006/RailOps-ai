import { useState } from 'react';
import { useRailOps } from '../context/RailOpsContext';
import KPICard from '../components/KPICard';
import NativeTimeline from '../components/NativeTimeline';
import ApprovalDrawer from '../components/ApprovalDrawer';
import Toast from '../components/Toast';

export default function Dashboard() {
  const {
    defects,
    blocks,
    conflicts,
    isLoading: loading,
    activityFeed,
    handleApproveDefect,
    handleRejectDefect,
    handleRescheduleBlock,
  } = useRailOps();

  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [activeConflict, setActiveConflict] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // -1: Yesterday, 0: Today, 1: Tomorrow
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);

  // Derive active target date object and display string
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + selectedDayOffset);

  const formattedDateStr = targetDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const filteredBlocks = blocks.filter((block) => {
    if (!block.startTime) return false;
    const blockDate = new Date(block.startTime);
    return (
      blockDate.getFullYear() === targetDate.getFullYear() &&
      blockDate.getMonth() === targetDate.getMonth() &&
      blockDate.getDate() === targetDate.getDate()
    );
  });

  const handleReschedule = async (blockId) => {
    const targetBlock = activeConflict || blocks.find(b => b._id === blockId);
    const id = blockId || targetBlock?._id;
    if (!id || !targetBlock) return;

    try {
      setRescheduleLoading(true);
      const s = new Date(targetBlock.startTime);
      const e = new Date(targetBlock.endTime);
      const newStartTime = new Date(s.getTime() + 30 * 60 * 1000);
      const newEndTime = new Date(e.getTime() + 30 * 60 * 1000);

      await handleRescheduleBlock(id, newStartTime, newEndTime);

      setToast({
        visible: true,
        message: `✓ Conflict auto-resolved: Block shifted +30 mins`,
        type: 'success'
      });
      setActiveConflict(null);
    } catch (err) {
      console.error('Failed to reschedule block:', err);
      setToast({
        visible: true,
        message: `Failed to reschedule: ${err.response?.data?.error || err.message}`,
        type: 'error'
      });
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    try {
      setActionLoading(true);
      if (status === 'EXECUTED') {
        await handleApproveDefect(id);
        setToast({ visible: true, message: `Defect approved & executed — Block Created`, type: 'success' });
      } else {
        await handleRejectDefect(id);
        setToast({ visible: true, message: `Defect marked as ${status}`, type: 'info' });
      }
    } catch (e) {
      setToast({ visible: true, message: `Failed: ${e.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && defects.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-500 font-mono-rail text-sm">LOADING ENGINE...</div>;
  }

  const oldestPending = defects
    .filter(d => d.status === 'PENDING')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0] || null;
  
  const totalPending = defects.filter(d => d.status === 'PENDING').length;
  const criticalCount = defects.filter(d => d.priority === 'CRITICAL' && d.status === 'PENDING').length;
  const activeBlocks = blocks.filter(b => b.status === 'ACTIVE' || b.status === 'APPROVED').length;
  const conflictsCount = conflicts.length;
  const avgPriorityScore = defects.length ? Math.round(defects.reduce((s, d) => s + d.priorityScore, 0) / defects.length) : 0;
  const availability = defects.length ? Math.round((1 - defects.filter(d => d.status === 'EXECUTED').length / defects.length) * 100) : 100;

  const getSourceCount = (src) => defects.filter(d => d.source === src).length;

  const SOURCES = ['TMS','SMMS','TDMS','BDMS','COA']
  const SOURCE_COLORS = {
    TMS: '#3b82f6', SMMS: '#a855f7', TDMS: '#f59e0b',
    BDMS: '#14b8a6', COA: '#f43f5e'
  }
  const sourceCounts = SOURCES.map(s => ({
    source: s,
    count: defects.filter(d => d.source === s).length,
    color: SOURCE_COLORS[s]
  }))
  const maxSourceCount = Math.max(...sourceCounts.map(s => s.count), 1)

  return (
    <div className="h-full p-3 grid grid-cols-[300px_1fr_300px] gap-3 overflow-hidden">
      
      {/* Column 1 - Left Column */}
      <div className="flex flex-col gap-3 h-full overflow-hidden">
        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          <KPICard label="Total Pending" value={totalPending} accentClass="kpi-accent-em" />
          <KPICard label="Critical Tasks" value={criticalCount} accentClass="kpi-accent-rd" />
          <KPICard label="Active Blocks" value={activeBlocks} accentClass="kpi-accent-bl" />
          <KPICard label="Conflicts" value={conflictsCount} accentClass="kpi-accent-rd" />
        </div>

        {/* ASSET AVAILABILITY: BEFORE VS AFTER */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-1.5 shadow-md kpi-accent-em flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400">
              NETWORK AVAILABILITY
            </span>
            <span className="font-mono-rail text-[8px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              +4.6% GAIN
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="font-mono-rail text-[10px] text-slate-500 block">MANUAL BASELINE</span>
              <span className="font-mono-rail text-sm text-slate-400 line-through">91.8%</span>
            </div>
            <div className="text-right">
              <span className="font-mono-rail text-[10px] text-emerald-400 block font-semibold">AI OPTIMIZED</span>
              <span className="font-mono-rail text-xl font-bold text-emerald-400">96.4%</span>
            </div>
          </div>
        </div>
        
        {/* SOURCE BREAKDOWN */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col flex-shrink-0">
          <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-mono-rail text-xs font-semibold text-slate-300">SOURCE BREAKDOWN</h2>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {sourceCounts.map(({ source, count, color }) => (
              <div key={source}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono-rail text-[9px] text-slate-400">{source}</span>
                  <span className="font-mono-rail text-[9px] text-slate-400">{count}</span>
                </div>
                <div className="bg-slate-700 rounded h-1.5 w-full">
                  <div
                    className="h-1.5 rounded transition-all duration-500"
                    style={{
                      width: `${Math.round((count / maxSourceCount) * 100)}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONFLICT FEED */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
            <span className="font-mono-rail text-xs font-semibold text-slate-300 tracking-wide">
              CONFLICT FEED
            </span>
            <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded-full bg-red-500/15 
                             text-red-400 border border-red-500/30">
              {conflicts.length} ACTIVE
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {conflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-16 gap-1">
                <div className="font-mono-rail text-[10px] text-emerald-500">✓ NO CONFLICTS</div>
              </div>
            ) : (
              conflicts.map((c, i) => (
                <div key={i} className="bg-red-500/8 border border-red-500/20 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="font-mono-rail text-[8px] px-1.5 py-0.5 rounded 
                                     bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {c.severity || 'MEDIUM'}
                    </span>
                    <span className="font-mono-rail text-[8px] px-1.5 py-0.5 rounded 
                                     bg-slate-700 text-slate-300 border border-slate-600">
                      {c.type}
                    </span>
                  </div>
                  <div className="font-mono-rail text-[9px] text-slate-400 leading-relaxed">
                    {c.description}
                  </div>
                  <div className="font-mono-rail text-[8px] text-slate-600 mt-1">
                    Block: {c.blockId}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Column 2 - Center Column */}
      <div className="flex flex-col gap-3 h-full overflow-hidden">
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-full">
          <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="font-mono-rail text-xs font-semibold text-slate-300 tracking-wide">
                TRACK BLOCK SCHEDULE
              </span>
              <span className="font-mono-rail text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                {formattedDateStr}
              </span>
            </div>

            {/* 3-Button Segmented Pill Layout */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 p-1">
              <button
                type="button"
                onClick={() => setSelectedDayOffset(-1)}
                className={`rounded px-3 py-1 text-xs font-mono transition-all cursor-pointer ${
                  selectedDayOffset === -1
                    ? 'bg-emerald-500 font-bold text-slate-900 shadow'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                YESTERDAY
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayOffset(0)}
                className={`rounded px-3 py-1 text-xs font-mono transition-all cursor-pointer ${
                  selectedDayOffset === 0
                    ? 'bg-emerald-500 font-bold text-slate-900 shadow'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                TODAY
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayOffset(1)}
                className={`rounded px-3 py-1 text-xs font-mono transition-all cursor-pointer ${
                  selectedDayOffset === 1
                    ? 'bg-emerald-500 font-bold text-slate-900 shadow'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                TOMORROW
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NativeTimeline 
              blocks={filteredBlocks} 
              targetDate={targetDate}
              selectedDayOffset={selectedDayOffset}
              onBlockClick={setActiveConflict} 
              setActiveConflict={setActiveConflict} 
            />
          </div>
        </div>
      </div>

      {/* Column 3 - Right Column */}
      <div className="flex flex-col gap-3 h-full overflow-hidden">
        <div className="flex-1">
          <ApprovalDrawer 
            defect={oldestPending} 
            pendingCount={totalPending} 
            onApprove={(id) => handleAction(id, 'EXECUTED')}
            onReject={(id) => handleAction(id, 'REJECTED')}
            loading={actionLoading}
          />
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden h-48 flex-shrink-0">
          <div className="px-4 py-2.5 border-b border-slate-700">
            <h2 className="font-mono-rail text-xs font-semibold text-slate-300">ACTIVITY FEED</h2>
          </div>
          <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2">
            {activityFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="text-2xl opacity-20">⊘</div>
                <div className="font-mono-rail text-[10px] text-slate-600">No recent activity</div>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-700/40">
                {activityFeed.map(item => (
                  <div key={item.id} className="flex items-start justify-between px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono-rail text-[9px] font-bold ${
                          item.action === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {item.action === 'APPROVED' ? '▶' : '✕'} {item.defectCode}
                        </span>
                      </div>
                      <span className="font-mono-rail text-[9px] text-slate-500">
                        {item.assetId}
                        {item.blockCode && ` → ${item.blockCode}`}
                      </span>
                    </div>
                    <span className="font-mono-rail text-[8px] text-slate-600 flex-shrink-0">
                      {item.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />

      {/* ── CONFLICT RESOLUTION MODAL ── */}
      {activeConflict && (() => {
        const s = new Date(activeConflict.startTime);
        const e = new Date(activeConflict.endTime);
        const sStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const eStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newStart = new Date(s.getTime() + 30 * 60 * 1000);
        const newEnd = new Date(e.getTime() + 30 * 60 * 1000);
        const newStartStr = newStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newEndStr = newEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 slide-in">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl relative flex flex-col gap-4">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-mono-rail text-sm">
                    ⚠
                  </div>
                  <div>
                    <h3 className="font-mono-rail text-sm font-bold text-red-400 uppercase tracking-wider">
                      Conflict Detected
                    </h3>
                    <div className="font-mono-rail text-[10px] text-slate-400 mt-0.5">
                      Track Schedule Overlap on {activeConflict.corridorId || 'Corridor'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveConflict(null)}
                  className="text-slate-400 hover:text-slate-200 font-mono-rail text-sm p-1 rounded hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Target Details */}
              <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg p-4 flex flex-col gap-2.5 font-mono-rail text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Target Asset ID:</span>
                  <span className="font-bold text-emerald-400">{activeConflict.assetId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-bold text-blue-400">{activeConflict.department}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Block Code:</span>
                  <span className="text-slate-300 font-semibold">{activeConflict.blockCode || activeConflict._id?.substring(0, 8)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Corridor:</span>
                  <span className="text-slate-300">{activeConflict.corridorId}</span>
                </div>

                <div className="border-t border-slate-800 pt-2.5 flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider">
                    Conflicting Time Window:
                  </span>
                  <span className="font-bold text-red-400 text-sm">
                    {sStr} – {eStr}
                  </span>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2.5 flex flex-col gap-1 mt-1">
                  <span className="text-emerald-400 text-[9px] uppercase tracking-wider font-bold">
                    Target Auto-Resolved Window (+30 Mins):
                  </span>
                  <span className="font-bold text-emerald-300 text-xs">
                    {newStartStr} – {newEndStr}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setActiveConflict(null)}
                  className="font-mono-rail text-xs text-slate-400 hover:text-slate-200 px-4 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleReschedule(activeConflict._id)}
                  disabled={rescheduleLoading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-mono-rail font-bold text-xs py-2.5 px-5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {rescheduleLoading ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 text-slate-900" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Rescheduling...
                    </>
                  ) : (
                    'Auto-Resolve: Shift +30 Mins'
                  )}
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRailOps } from '../context/RailOpsContext';
import KPICard from '../components/KPICard';
import NativeTimeline from '../components/NativeTimeline';
import ApprovalDrawer from '../components/ApprovalDrawer';
import Toast from '../components/Toast';
import api from '../api/axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    defects,
    blocks,
    conflicts,
    schedules,
    isLoading: loading,
    activityFeed,
    refreshData,
    handleApproveDefect,
    handleRejectDefect,
    handleRescheduleBlock,
  } = useRailOps();

  const [selectedCorridor, setSelectedCorridor] = useState('COR-01');
  const [selectedDayOffset, setSelectedDayOffset] = useState(0); // -1: Yesterday, 0: Today, 1: Tomorrow
  const [actionLoading, setActionLoading] = useState(false);
  const [aiCommitLoading, setAiCommitLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [activeConflict, setActiveConflict] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Derive active target date object and display string
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDayOffset);
    return d;
  }, [selectedDayOffset]);

  const formattedDateStr = targetDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Filter blocks for target date and corridor
  const filteredBlocks = useMemo(() => {
    return blocks.filter((block) => {
      if (!block.startTime) return false;
      const blockDate = new Date(block.startTime);
      return (
        blockDate.getFullYear() === targetDate.getFullYear() &&
        blockDate.getMonth() === targetDate.getMonth() &&
        blockDate.getDate() === targetDate.getDate()
      );
    });
  }, [blocks, targetDate]);

  // Operational conflict classification for the active view
  const activeOperationalConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      const matchCorridor =
        selectedCorridor === 'ALL' ||
        c.blockA?.corridorId === selectedCorridor ||
        c.blockB?.corridorId === selectedCorridor;
      return matchCorridor && c.isOperationalActive;
    });
  }, [conflicts, selectedCorridor]);

  // KPIs
  const totalPending = defects.filter((d) => d.status === 'PENDING').length;
  const criticalCount = defects.filter((d) => d.priority === 'CRITICAL' && d.status === 'PENDING').length;
  const activeBlocksCount = blocks.filter(
    (b) =>
      (selectedCorridor === 'ALL' || b.corridorId === selectedCorridor) &&
      ['ACTIVE', 'APPROVED'].includes((b.status || '').toUpperCase())
  ).length;
  const conflictsCount = activeOperationalConflicts.length;

  const handleReschedule = async (blockId) => {
    const targetBlock = activeConflict || blocks.find((b) => b._id === blockId);
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
        type: 'success',
      });
      setActiveConflict(null);
    } catch (err) {
      console.error('Failed to reschedule block:', err);
      setToast({
        visible: true,
        message: `Failed to reschedule: ${err.response?.data?.error || err.message}`,
        type: 'error',
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

  // 1-Click Commit of the AI Recommended Golden Block
  const handleCommitAiBlock = async () => {
    try {
      setAiCommitLoading(true);
      const startTime = new Date(targetDate);
      startTime.setHours(2, 0, 0, 0);
      const endTime = new Date(targetDate);
      endTime.setHours(8, 0, 0, 0);

      const targetDefects = defects.filter(
        (d) => ['DEF-0101', 'DEF-0102', 'DEF-0103'].includes(d.defectCode) || d.corridorId === 'COR-01'
      );

      const res = await api.post('/optimization/approve', {
        planId: `PLAN-${new Date().toISOString().slice(0, 10)}-01`,
        corridorId: 'COR-01',
        blockCode: 'BLK-COORD-01',
        startTime,
        endTime,
        department: 'Track + Signalling + Traction',
        defects: targetDefects,
        compositeScore: 78,
      });

      if (res.data?.success) {
        setToast({
          visible: true,
          message: '✓ Coordinated Block BLK-COORD-01 committed to live schedule!',
          type: 'success',
        });
        await refreshData();
      }
    } catch (err) {
      setToast({
        visible: true,
        message: `Commit failed: ${err.response?.data?.error || err.message}`,
        type: 'error',
      });
    } finally {
      setAiCommitLoading(false);
    }
  };

  if (loading && defects.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 font-mono-rail text-sm">
        LOADING ENGINE...
      </div>
    );
  }

  const oldestPending =
    defects
      .filter((d) => d.status === 'PENDING')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0] || null;

  const SOURCES = ['TMS', 'SMMS', 'TDMS', 'BDMS', 'COA'];
  const SOURCE_COLORS = {
    TMS: '#3b82f6',
    SMMS: '#a855f7',
    TDMS: '#f59e0b',
    BDMS: '#14b8a6',
    COA: '#f43f5e',
  };
  const sourceCounts = SOURCES.map((s) => ({
    source: s,
    count: defects.filter((d) => d.source === s).length,
    color: SOURCE_COLORS[s],
  }));
  const maxSourceCount = Math.max(...sourceCounts.map((s) => s.count), 1);

  return (
    <div className="h-full p-3 grid grid-cols-[280px_1fr_310px] gap-3 overflow-hidden">
      
      {/* ── COLUMN 1: METRICS & CONFLICT FEED ── */}
      <div className="flex flex-col gap-3 h-full overflow-hidden">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          <KPICard label="Total Pending" value={totalPending} accentClass="kpi-accent-em" />
          <KPICard label="Critical Tasks" value={criticalCount} accentClass="kpi-accent-rd" />
          <KPICard label="Active Blocks" value={activeBlocksCount} accentClass="kpi-accent-bl" />
          <KPICard label="Active Conflicts" value={conflictsCount} accentClass="kpi-accent-rd" />
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
          <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-mono-rail text-[11px] font-semibold text-slate-300">DATA INTEGRATION SOURCES</h2>
          </div>
          <div className="flex flex-col gap-1.5 p-2.5">
            {sourceCounts.map(({ source, count, color }) => (
              <div key={source}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-mono-rail text-[9px] text-slate-400">{source}</span>
                  <span className="font-mono-rail text-[9px] text-slate-400">{count}</span>
                </div>
                <div className="bg-slate-700 rounded h-1 w-full">
                  <div
                    className="h-1 rounded transition-all duration-500"
                    style={{
                      width: `${Math.round((count / maxSourceCount) * 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONFLICT FEED (GENUINELY ACTIVE OPERATIONAL CONFLICTS ONLY) */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
            <span className="font-mono-rail text-[11px] font-semibold text-slate-300 tracking-wide">
              OPERATIONAL CONFLICTS
            </span>
            <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded font-bold ${
              conflictsCount === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400 border border-red-500/40'
            }`}>
              {conflictsCount} ACTIVE
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2">
            {activeOperationalConflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 gap-1 text-center">
                <div className="text-emerald-400 text-base">✓</div>
                <div className="font-mono-rail text-[9px] text-emerald-400 font-semibold">
                  NO ACTIVE CONFLICTS ON {selectedCorridor}
                </div>
                <div className="font-mono-rail text-[8px] text-slate-500">
                  Headways & possessions are clear
                </div>
              </div>
            ) : (
              activeOperationalConflicts.map((c, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-rail text-[8px] px-1 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold">
                      {c.severity} · {c.type}
                    </span>
                    <span className="font-mono-rail text-[8px] text-slate-400">
                      {c.overlapMinutes} min overlap
                    </span>
                  </div>
                  <div className="font-mono-rail text-[9px] text-slate-300 leading-snug">
                    {c.blockA?.id} ({c.blockA?.department}) vs {c.blockB?.id} ({c.blockB?.department})
                  </div>
                  <button
                    onClick={() => setActiveConflict(c.blockB || c.blockA)}
                    className="self-end mt-1 text-[8px] font-mono-rail font-bold bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    RESOLVE CONFLICT →
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── COLUMN 2: CENTER OPERATIONAL TIMELINE ── */}
      <div className="flex flex-col gap-3 h-full overflow-hidden">
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
          {/* Header with Date Toggle Controls */}
          <div className="px-4 py-2 border-b border-slate-700 bg-slate-900/60 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="font-mono-rail text-xs font-semibold text-slate-200 tracking-wide">
                OPERATIONAL BLOCK & TIMETABLE SCHEDULE
              </span>
              <span className="font-mono-rail text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                {formattedDateStr}
              </span>
            </div>

            {/* 3-Day Window Selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setSelectedDayOffset(-1)}
                className={`rounded px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
                  selectedDayOffset === -1
                    ? 'bg-emerald-500 font-bold text-slate-950 shadow'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                YESTERDAY
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayOffset(0)}
                className={`rounded px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
                  selectedDayOffset === 0
                    ? 'bg-emerald-500 font-bold text-slate-950 shadow'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                TODAY
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayOffset(1)}
                className={`rounded px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
                  selectedDayOffset === 1
                    ? 'bg-emerald-500 font-bold text-slate-950 shadow'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                TOMORROW
              </button>
            </div>
          </div>

          {/* Integrated Multi-Section Native Timeline */}
          <div className="flex-1 overflow-hidden">
            <NativeTimeline
              blocks={filteredBlocks}
              schedules={schedules}
              selectedCorridor={selectedCorridor}
              setSelectedCorridor={setSelectedCorridor}
              targetDate={targetDate}
              selectedDayOffset={selectedDayOffset}
              onBlockClick={setActiveConflict}
              setActiveConflict={setActiveConflict}
            />
          </div>
        </div>
      </div>

      {/* ── COLUMN 3: RIGHT AI RECOMMENDATION & QUICK APPROVAL CARD ── */}
      <div className="flex flex-col gap-3 h-full overflow-hidden">
        
        {/* 🤖 AI RECOMMENDATION / APPROVAL CARD */}
        <div className="bg-slate-800 border-2 border-emerald-500/50 rounded-xl p-3.5 shadow-xl flex flex-col gap-2.5 flex-shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🤖</span>
              <span className="font-mono-rail text-xs font-bold text-emerald-400">
                AI RECOMMENDED BLOCK
              </span>
            </div>
            <span className="font-mono-rail text-[8px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded font-extrabold">
              OPTIMIZED
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 flex flex-col gap-1.5 font-mono-rail text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Target Corridor:</span>
              <span className="text-slate-100 font-bold">COR-01 (Delhi → Mumbai)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Optimal Window:</span>
              <span className="text-emerald-400 font-bold">02:00 – 08:00 (6.0h)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">AI Composite Score:</span>
              <span className="text-emerald-400 font-bold">78 / 100 (FEASIBLE)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Consolidated Depts:</span>
              <span className="text-slate-200 font-bold">Track + Signal + Traction</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Bundled Tasks:</span>
              <span className="text-slate-200 font-bold">DEF-0101, 0102, 0103</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Train Impact:</span>
              <span className="text-emerald-400 font-bold">0 Express Delays</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Downtime Saved:</span>
              <span className="text-amber-400 font-bold">5.0 Hours Saved</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleCommitAiBlock}
              disabled={aiCommitLoading}
              className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono-rail font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {aiCommitLoading ? 'COMMITTING TO SCHEDULE...' : '✓ APPROVE & COMMIT BLOCK'}
            </button>
            <button
              onClick={() => navigate('/optimization')}
              className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono-rail text-[10px] transition-colors cursor-pointer text-center"
            >
              OPEN OPTIMIZATION ENGINE →
            </button>
          </div>
        </div>

        {/* QUICK DEFECT APPROVAL DRAWER */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ApprovalDrawer
            defect={oldestPending}
            pendingCount={totalPending}
            onApprove={(id) => handleAction(id, 'EXECUTED')}
            onReject={(id) => handleAction(id, 'REJECTED')}
            loading={actionLoading}
          />
        </div>

        {/* ACTIVITY FEED */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden h-40 flex-shrink-0">
          <div className="px-3 py-2 border-b border-slate-700">
            <h2 className="font-mono-rail text-[11px] font-semibold text-slate-300">OPERATIONAL ACTIVITY FEED</h2>
          </div>
          <div className="p-2.5 flex-1 overflow-y-auto flex flex-col gap-1.5">
            {activityFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 gap-1">
                <div className="text-slate-600 text-lg">⊘</div>
                <div className="font-mono-rail text-[9px] text-slate-500">No recent activity</div>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-700/40">
                {activityFeed.map((item) => (
                  <div key={item.id} className="flex items-start justify-between px-2 py-1">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-mono-rail text-[8px] font-bold ${
                            item.action === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {item.action === 'APPROVED' ? '▶' : '✕'} {item.defectCode}
                        </span>
                      </div>
                      <span className="font-mono-rail text-[8px] text-slate-500">
                        {item.assetId}
                        {item.blockCode && ` → ${item.blockCode}`}
                      </span>
                    </div>
                    <span className="font-mono-rail text-[7px] text-slate-600 flex-shrink-0">
                      {item.timestamp?.toLocaleTimeString ? item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
                  <span className="text-slate-300 font-semibold">
                    {activeConflict.blockCode || activeConflict._id?.substring(0, 8)}
                  </span>
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

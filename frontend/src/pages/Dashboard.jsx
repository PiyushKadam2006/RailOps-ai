import { useState, useEffect } from 'react';
import api from '../api/axios';
import KPICard from '../components/KPICard';
import NativeTimeline from '../components/NativeTimeline';
import ApprovalDrawer from '../components/ApprovalDrawer';
import Toast from '../components/Toast';

export default function Dashboard() {
  const [data, setData] = useState({
    defects: [],
    blocks: [],
    oldestPending: null,
    conflicts: []
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [activityFeed, setActivityFeed] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [defRes, blockRes, pendRes, confRes] = await Promise.all([
        api.get('/defects'),
        api.get('/blocks/today-tomorrow'),
        api.get('/defects/pending'),
        api.get('/optimization/conflicts')
      ]);
      setData({
        defects: defRes.data,
        blocks: blockRes.data,
        oldestPending: pendRes.data,
        conflicts: confRes.data
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id, status) => {
    try {
      setActionLoading(true);
      const response = await api.put(`/defects/${id}`, { status });
      const data = response.data;
      setToast({ visible: true, message: `Defect marked as ${status}`, type: status === 'EXECUTED' ? 'success' : 'info' });
      
      if (status === 'EXECUTED') {
        setActivityFeed(prev => [{
          id: Date.now(),
          action: 'APPROVED',
          defectCode: data.defect?.defectCode || id.slice(-8).toUpperCase(),
          assetId: data.defect?.assetId,
          blockCode: data.block?.blockCode || 'BLK-AUTO',
          timestamp: new Date()
        }, ...prev].slice(0, 10));
      } else {
        setActivityFeed(prev => [{
          id: Date.now(),
          action: 'REJECTED',
          defectCode: data.defect?.defectCode || data.defectCode || id.slice(-8).toUpperCase(),
          assetId: data.defect?.assetId || data.assetId,
          blockCode: null,
          timestamp: new Date()
        }, ...prev].slice(0, 10));
      }
      await fetchData();
    } catch (e) {
      setToast({ visible: true, message: `Failed: ${e.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && data.defects.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-500 font-mono-rail text-sm">LOADING ENGINE...</div>;
  }

  const { defects, blocks, oldestPending, conflicts } = data;
  
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
          <KPICard label="Critical" value={criticalCount} accentClass="kpi-accent-rd" />
          <KPICard label="Active Blocks" value={activeBlocks} accentClass="kpi-accent-bl" />
          <KPICard label="Conflicts" value={conflictsCount} accentClass="kpi-accent-rd" />
          <KPICard label="Avg Score" value={avgPriorityScore} accentClass="kpi-accent-am" />
          <KPICard label="Availability" value={`${availability}%`} accentClass="kpi-accent-em" />
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
          <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
            <span className="font-mono-rail text-xs font-semibold text-slate-300 tracking-wide">
              TRACK BLOCK SCHEDULE
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NativeTimeline blocks={blocks} />
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
    </div>
  );
}

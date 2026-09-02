import { useState, useEffect } from 'react';
import api from '../api/axios';
import KPICard from '../components/KPICard';
import NativeTimeline from '../components/NativeTimeline';
import ConflictAlert from '../components/ConflictAlert';
import ApprovalDrawer from '../components/ApprovalDrawer';
import Toast from '../components/Toast';

export default function Dashboard() {
  const [data, setData] = useState({
    defects: [],
    weekBlocks: [],
    oldestPending: null,
    corridors: [],
    conflicts: []
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [activityFeed, setActivityFeed] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [defRes, blockRes, pendRes, corrRes, confRes] = await Promise.all([
        api.get('/defects'),
        api.get('/blocks/week'),
        api.get('/defects/pending'),
        api.get('/corridors'),
        api.get('/optimization/conflicts')
      ]);
      setData({
        defects: defRes.data,
        weekBlocks: blockRes.data,
        oldestPending: pendRes.data,
        corridors: corrRes.data,
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

  const { defects, weekBlocks, oldestPending, corridors, conflicts } = data;
  
  const totalPending = defects.filter(d => d.status === 'PENDING').length;
  const criticalCount = defects.filter(d => d.priority === 'CRITICAL' && d.status === 'PENDING').length;
  const activeBlocks = weekBlocks.filter(b => b.status === 'ACTIVE' || b.status === 'APPROVED').length;
  const conflictsCount = conflicts.length;
  const avgPriorityScore = defects.length ? Math.round(defects.reduce((s, d) => s + d.priorityScore, 0) / defects.length) : 0;
  const availability = defects.length ? Math.round((1 - defects.filter(d => d.status === 'EXECUTED').length / defects.length) * 100) : 100;

  const getSourceCount = (src) => defects.filter(d => d.source === src).length;
  const getDeptCount = (dept) => defects.filter(d => d.department === dept && d.status === 'PENDING').length;

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

  const DEPT_COLORS = {
    Traction: '#10b981', Signalling: '#3b82f6', Track: '#10b981',
    'Rolling Stock': '#a855f7', Infrastructure: '#f59e0b', Electrical: '#ef4444'
  }
  const DEPTS = ['Traction','Signalling','Track','Rolling Stock','Infrastructure','Electrical']
  const deptCounts = DEPTS.map(d => ({
    dept: d,
    count: defects.filter(x => x.department === d && x.status === 'PENDING').length
  }))
  const maxDept = Math.max(...deptCounts.map(d => d.count), 1)

  return (
    <div className="h-full p-3 grid grid-cols-[1fr_1fr_1fr_300px] gap-3 overflow-hidden">
      
      {/* Column 1 */}
      <div className="flex flex-col gap-3 h-full overflow-hidden">
        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          <KPICard label="Total Pending" value={totalPending} accentClass="kpi-accent-em" />
          <KPICard label="Critical" value={criticalCount} accentClass="kpi-accent-rd" />
          <KPICard label="Active Blocks" value={activeBlocks} accentClass="kpi-accent-bl" />
          <KPICard label="Conflicts" value={conflictsCount} accentClass="kpi-accent-rd" />
          <KPICard label="Avg Score" value={avgPriorityScore} accentClass="kpi-accent-am" />
          <KPICard label="Availability" value={`${availability}%`} accentClass="kpi-accent-em" />
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden flex-1">
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
      </div>

      {/* Column 2 */}
      <div className="flex flex-col gap-3 h-full overflow-hidden">
        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-mono-rail text-xs font-semibold text-slate-300">TRACK BLOCK SCHEDULE</h2>
          </div>
          <div className="p-3 flex-1 overflow-hidden flex flex-col">
            <NativeTimeline blocks={weekBlocks} days={['MON','TUE','WED','THU','FRI','SAT','SUN']} />
          </div>
        </div>
        {conflictsCount > 0 && (
          <div className="flex-shrink-0">
            <ConflictAlert conflicts={conflicts} />
          </div>
        )}
      </div>

      {/* Column 3 */}
      <div className="flex flex-col gap-3 h-full overflow-hidden">
        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden h-1/2">
          <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
            <h2 className="font-mono-rail text-xs font-semibold text-slate-300">CORRIDOR STATUS</h2>
          </div>
          <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2">
            {corridors.map(c => (
              <div key={c.corridorId} className="bg-slate-700/30 p-2 rounded flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono-rail text-[10px] text-slate-200 font-bold">{c.name}</span>
                  <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded-full ${c.status === 'CLEAR' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : c.status === 'PARTIAL' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex justify-between items-center font-mono-rail text-[9px] text-slate-400">
                  <span>{c.fromStation} → {c.toStation}</span>
                  <span>{c.activeBlocks} active blocks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden h-1/2">
          <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
            <h2 className="font-mono-rail text-xs font-semibold text-slate-300">DEPT PENDING</h2>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {deptCounts.map(({ dept, count }) => (
              <div key={dept} className="flex items-center gap-2">
                <span className="font-mono-rail text-[9px] text-slate-500 w-20 truncate flex-shrink-0">
                  {dept.length > 8 ? dept.slice(0,8)+'.' : dept}
                </span>
                <div className="flex-1 bg-slate-700 rounded h-1.5">
                  <div
                    className="h-1.5 rounded transition-all duration-500"
                    style={{
                      width: `${Math.round((count / maxDept) * 100)}%`,
                      backgroundColor: DEPT_COLORS[dept] || '#10b981'
                    }}
                  />
                </div>
                <span className="font-mono-rail text-[9px] text-slate-400 w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Column 4 */}
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

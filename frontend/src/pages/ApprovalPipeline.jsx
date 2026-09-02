import { useState, useEffect } from 'react';
import { useRailOps } from '../context/RailOpsContext';
import DataSourceBadge from '../components/DataSourceBadge';
import PriorityScoreBar from '../components/PriorityScoreBar';
import Toast from '../components/Toast';

export default function ApprovalPipeline() {
  const {
    defects,
    isLoading: loading,
    handleApproveDefect,
    handleRejectDefect,
    handleBundleDefect
  } = useRailOps();

  const [selectedDefect, setSelectedDefect] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const pending = defects.filter(d => d.status === 'PENDING').sort((a,b) => b.priorityScore - a.priorityScore);
  const executed = defects.filter(d => d.status === 'EXECUTED');
  const bundled = defects.filter(d => d.status === 'BUNDLED');
  const scheduled = defects.filter(d => d.status === 'SCHEDULED');

  useEffect(() => {
    if (pending.length > 0) {
      if (!selectedDefect || !pending.find(d => d._id === selectedDefect._id)) {
        setSelectedDefect(pending[0]);
      }
    } else {
      setSelectedDefect(null);
    }
  }, [pending, selectedDefect]);

  const handleAction = async (status) => {
    if (!selectedDefect) return;
    setActionLoading(true);
    try {
      if (status === 'EXECUTED') {
        await handleApproveDefect(selectedDefect._id);
        setToast({ visible: true, message: `Defect approved & executed — Block Generated`, type: 'success' });
      } else if (status === 'REJECTED') {
        await handleRejectDefect(selectedDefect._id);
        setToast({ visible: true, message: `Defect marked as REJECTED`, type: 'info' });
      } else if (status === 'BUNDLED') {
        await handleBundleDefect(selectedDefect._id);
        setToast({ visible: true, message: `Defect marked as BUNDLED`, type: 'info' });
      }
    } catch (e) {
      setToast({ visible: true, message: `Error: ${e.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityClass = (p) => {
    if (p === 'CRITICAL') return 'bg-red-500/20 text-red-400';
    if (p === 'HIGH') return 'bg-amber-500/20 text-amber-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  return (
    <div className="h-full grid grid-cols-[300px_1fr_300px] gap-4 p-4 overflow-hidden">
      
      {/* Column 1: Queue */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="font-mono-rail text-xs font-semibold text-slate-300">PRIORITY QUEUE</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
          {pending.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <div className="text-2xl opacity-20">⊘</div>
              <div className="font-mono-rail text-[10px] text-slate-600">Queue Empty</div>
            </div>
          )}
          {pending.map(d => (
            <div 
              key={d._id} 
              onClick={() => setSelectedDefect(d)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedDefect?._id === d._id ? 'bg-slate-700 border-emerald-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono-rail text-[10px] text-slate-300">{d.defectCode || d._id.toString().slice(-8).toUpperCase()}</span>
                <DataSourceBadge source={d.source} />
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono-rail text-xs font-bold text-slate-200">{d.assetId}</span>
                <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded ${getPriorityClass(d.priority)}`}>{d.priority}</span>
              </div>
              <PriorityScoreBar score={d.priorityScore} />
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: Detail */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden relative">
        {actionLoading && (
           <div className="absolute inset-0 bg-slate-800/80 z-10 flex items-center justify-center">
             <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
           </div>
        )}
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="font-mono-rail text-xs font-semibold text-slate-300">DEFECT DETAIL & ACTION</h2>
        </div>
        
        {selectedDefect ? (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-mono-rail text-2xl font-bold text-slate-200">{selectedDefect.defectCode || selectedDefect._id.toString().slice(-8).toUpperCase()}</h3>
              <div className="flex flex-col items-end">
                <div className="font-mono-rail text-[10px] text-slate-500 mb-1">AI PRIORITY SCORE</div>
                <div className="font-mono-rail text-4xl font-bold text-emerald-400">{selectedDefect.priorityScore}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-500 mb-1">Asset</div>
                <div className="font-mono-rail text-sm text-slate-200">{selectedDefect.assetId}</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-500 mb-1">Corridor</div>
                <div className="font-mono-rail text-sm text-slate-200">{selectedDefect.corridorId || 'N/A'}</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-500 mb-1">Department</div>
                <div className="font-mono-rail text-sm text-slate-200">{selectedDefect.department}</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-500 mb-1">Est. Duration</div>
                <div className="font-mono-rail text-sm text-slate-200">{selectedDefect.estimatedDurationHrs} hours</div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <DataSourceBadge source={selectedDefect.source} />
              <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded ${getPriorityClass(selectedDefect.priority)}`}>{selectedDefect.priority}</span>
              <span className="font-mono-rail text-[9px] text-slate-500">
                Logged: {new Date(selectedDefect.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="mb-8">
              <div className="font-mono-rail text-[9px] text-slate-500 uppercase mb-2">Fault Description</div>
              <div className="bg-slate-900 p-4 rounded-lg border-l-4 border-slate-600 text-sm text-slate-300 font-inter">
                {selectedDefect.faultDescription}
              </div>
            </div>

            <div className="mt-auto grid grid-cols-3 gap-3">
              <button 
                onClick={() => handleAction('EXECUTED')}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-mono-rail text-xs font-bold py-3 rounded-lg transition-colors col-span-1"
              >
                APPROVE & EXECUTE
              </button>
              <button 
                onClick={() => handleAction('BUNDLED')}
                className="bg-blue-500 hover:bg-blue-400 text-white font-mono-rail text-xs font-bold py-3 rounded-lg transition-colors col-span-1"
              >
                BUNDLE WITH SIMILAR
              </button>
              <button 
                onClick={() => handleAction('REJECTED')}
                className="border border-red-500 text-red-400 hover:bg-red-500/10 font-mono-rail text-xs font-bold py-3 rounded-lg transition-colors col-span-1"
              >
                REJECT DEFECT
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-32 gap-2">
            <div className="text-2xl opacity-20">⊘</div>
            <div className="font-mono-rail text-[10px] text-slate-600">Select a defect from the queue</div>
          </div>
        )}
      </div>

      {/* Column 3: Stats */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="font-mono-rail text-xs font-semibold text-slate-300">PIPELINE STATS</h2>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 flex justify-between items-center">
              <span className="font-mono-rail text-xs text-amber-400">PENDING</span>
              <span className="font-mono-rail text-xl font-bold text-amber-400">{pending.length}</span>
            </div>
            <div className="text-center text-slate-500 text-xs">↓</div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 flex justify-between items-center">
              <span className="font-mono-rail text-xs text-blue-400">BUNDLED</span>
              <span className="font-mono-rail text-xl font-bold text-blue-400">{bundled.length}</span>
            </div>
            <div className="text-center text-slate-500 text-xs">↓</div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 flex justify-between items-center">
              <span className="font-mono-rail text-xs text-emerald-400">EXECUTED</span>
              <span className="font-mono-rail text-xl font-bold text-emerald-400">{executed.length}</span>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-700 pt-4">
            <h3 className="font-mono-rail text-[10px] text-slate-500 mb-2 uppercase">Recent Executions</h3>
            <div className="flex flex-col gap-2 h-40 overflow-y-auto">
              {executed.slice(0,10).map(d => (
                <div key={d._id} className="flex justify-between items-center bg-slate-900/50 p-2 rounded">
                   <div className="flex flex-col">
                     <span className="font-mono-rail text-[10px] text-slate-300">{d.assetId}</span>
                     <span className="font-mono-rail text-[8px] text-emerald-500">Block Created</span>
                   </div>
                   <span className="font-mono-rail text-[8px] text-slate-500">{new Date(d.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />
    </div>
  );
}

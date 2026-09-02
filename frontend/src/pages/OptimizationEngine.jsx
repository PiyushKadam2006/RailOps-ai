import { useState, useEffect } from 'react';
import api from '../api/axios';
import ConflictAlert from '../components/ConflictAlert';
import Toast from '../components/Toast';

export default function OptimizationEngine() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [currentConflicts, setCurrentConflicts] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    api.get('/optimization/conflicts').then(res => setCurrentConflicts(res.data)).catch(console.error);
  }, []);

  const runOptimization = async () => {
    setLoading(true);
    try {
      const res = await api.post('/optimization/run');
      setResults(res.data);
      setToast({ visible: true, message: `✓ Optimization complete — ${res.data.scored} defects scored, ${res.data.bundles.length} bundles created`, type: 'success' });
      // Refresh current conflicts
      const cRes = await api.get('/optimization/conflicts');
      setCurrentConflicts(cRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const PipelineBox = ({ title, desc }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center flex-1 z-10 relative shadow-lg">
      <div className="font-mono-rail text-[10px] text-emerald-400 font-bold mb-1">{title}</div>
      <div className="font-mono-rail text-[8px] text-slate-500 leading-tight">{desc}</div>
    </div>
  );

  const Arrow = () => (
    <div className="flex-1 h-px bg-slate-600 relative border-t border-dashed border-slate-500 min-w-[20px]">
      <div className="absolute -right-2 -top-1.5 text-slate-500 text-[10px] font-mono-rail">▶</div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
        <h2 className="font-mono-rail text-sm font-bold text-slate-200 mb-6 flex justify-between items-center">
          AI/ML OPTIMIZATION ENGINE
          <button 
            onClick={runOptimization}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-mono-rail text-xs font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'OPTIMIZING...' : '▶ RUN OPTIMIZATION'}
          </button>
        </h2>
        
        <div className="flex items-center justify-between mb-8 px-2 relative">
          <PipelineBox title="Input Data" desc="Defects, Trains, Blocks" />
          <Arrow />
          <PipelineBox title="Priority Scoring" desc="Heuristic + ML weighting" />
          <Arrow />
          <PipelineBox title="Bundling" desc="Spatial-temporal grouping" />
          <Arrow />
          <PipelineBox title="Conflict Detection" desc="Schedule overlap checks" />
          <Arrow />
          <PipelineBox title="Generation" desc="Block window scheduling" />
          <Arrow />
          <PipelineBox title="Output" desc="Optimized plan" />
        </div>

        {results && (
          <div className="bg-slate-800/80 border border-emerald-500/30 rounded-lg p-4 slide-in">
            <h3 className="font-mono-rail text-xs text-emerald-400 font-bold mb-3">✓ OPTIMIZATION COMPLETE</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                <div className="font-mono-rail text-[10px] text-slate-500 mb-1">Defects Scored</div>
                <div className="font-mono-rail text-xl text-slate-200">{results.scored}</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                <div className="font-mono-rail text-[10px] text-slate-500 mb-1">Bundles Created</div>
                <div className="font-mono-rail text-xl text-blue-400">{results.bundles.length}</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                <div className="font-mono-rail text-[10px] text-slate-500 mb-1">Conflicts Found</div>
                <div className="font-mono-rail text-xl text-red-400">{results.conflicts.length}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-[300px]">
        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <h2 className="font-mono-rail text-xs font-semibold text-slate-300">INTELLIGENT BLOCK BUNDLING</h2>
            {results && <span className="font-mono-rail text-[9px] bg-blue-500/20 text-blue-400 px-2 rounded-full">{results.bundles.length} NEW</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {(!results || results.bundles.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="text-2xl opacity-20">⊘</div>
                <div className="font-mono-rail text-[10px] text-slate-600">Run optimization to generate bundles</div>
              </div>
            ) : (
              results.bundles.map(b => (
                <div key={b.bundleId} className={`bg-slate-900/50 border-l-4 rounded p-3 ${b.department === 'Signalling' ? 'border-purple-500' : 'border-emerald-500'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono-rail text-xs font-bold text-slate-200">{b.bundleId}</span>
                    <span className="font-mono-rail text-[9px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{b.defects.length} DEFECTS</span>
                  </div>
                  <div className="font-mono-rail text-[10px] text-slate-400 mb-1">Corridor: {b.corridorId} | Dept: {b.department}</div>
                  <div className="font-mono-rail text-[10px] text-slate-400">Est Duration: {b.totalDurationHrs}h</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="font-mono-rail text-xs font-semibold text-slate-300">CURRENT CONFLICT MATRIX</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {currentConflicts.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-32 gap-2">
                 <div className="text-2xl opacity-20">⊘</div>
                 <div className="font-mono-rail text-[10px] text-slate-600">No conflicts detected in current schedule</div>
               </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="p-2 font-mono-rail text-[9px] uppercase text-slate-500">Block ID</th>
                    <th className="p-2 font-mono-rail text-[9px] uppercase text-slate-500">Type</th>
                    <th className="p-2 font-mono-rail text-[9px] uppercase text-slate-500">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {currentConflicts.map((c, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="p-2 font-mono-rail text-[10px] text-slate-300">{c.blockId}</td>
                      <td className="p-2 font-mono-rail text-[10px] text-slate-400">{c.type}</td>
                      <td className="p-2">
                        <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded ${c.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {c.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />
    </div>
  );
}

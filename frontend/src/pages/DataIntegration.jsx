import { useState, useEffect } from 'react';
import api from '../api/axios';
import DataSourceBadge from '../components/DataSourceBadge';

export default function DataIntegration() {
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/defects');
        setDefects(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const sources = [
    { name: 'TMS', desc: 'Train Management', delay: '12ms' },
    { name: 'SMMS', desc: 'Safety & Maintenance', delay: '45ms' },
    { name: 'TDMS', desc: 'Track Data', delay: '8ms' },
    { name: 'BDMS', desc: 'Block Data', delay: '110ms' },
    { name: 'COA', desc: 'Corridor Operations', delay: '22ms' }
  ];

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex-shrink-0">
        <h2 className="font-mono-rail text-xs font-semibold text-slate-300 mb-6">DATA INTEGRATION PIPELINE</h2>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {sources.map(s => (
              <div key={s.name} className="bg-slate-900 border border-slate-700 rounded-lg p-3 w-32 flex flex-col items-center">
                <DataSourceBadge source={s.name} />
                <span className="font-mono-rail text-[8px] text-slate-500 mt-2 text-center h-6">{s.desc}</span>
                <span className="font-mono-rail text-xs font-bold text-slate-300 mt-2">{defects.filter(d=>d.source===s.name).length}</span>
                <span className="font-mono-rail text-[8px] text-slate-500 mt-1">records</span>
              </div>
            ))}
          </div>
          
          <div className="flex-1 flex items-center justify-center relative px-4">
            <div className="h-px bg-slate-600 w-full absolute"></div>
            <div className="text-slate-500 z-10 bg-slate-800 px-2 font-mono-rail text-xs">▶</div>
          </div>

          <div className="bg-slate-700/50 border border-emerald-500/30 rounded-lg p-4 w-40 flex flex-col items-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2 border border-emerald-500/50">
              <span className="text-emerald-400 text-sm">✓</span>
            </div>
            <span className="font-mono-rail text-[10px] text-emerald-400 font-bold text-center">Unified Storage</span>
            <span className="font-mono-rail text-xs text-slate-200 mt-2">{defects.length}</span>
            <span className="font-mono-rail text-[8px] text-slate-500">total records</span>
          </div>

          <div className="flex-1 flex items-center justify-center relative px-4 w-20">
            <div className="h-px bg-slate-600 w-full absolute"></div>
            <div className="text-slate-500 z-10 bg-slate-800 px-2 font-mono-rail text-xs">▶</div>
          </div>

          <div className="bg-slate-700/50 border border-blue-500/30 rounded-lg p-4 w-40 flex flex-col items-center shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mb-2 border border-blue-500/50 pulse-dot">
              <span className="text-blue-400 text-sm font-mono-rail">AI</span>
            </div>
            <span className="font-mono-rail text-[10px] text-blue-400 font-bold text-center">AI Engine</span>
            <span className="font-mono-rail text-[8px] text-slate-500 mt-2 text-center">Real-time processing</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[1fr_300px] gap-4 overflow-hidden">
        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
           <div className="px-4 py-2.5 border-b border-slate-700">
            <h2 className="font-mono-rail text-xs font-semibold text-slate-300">DEFECT INGESTION FEED</h2>
          </div>
          <div className="flex-1 overflow-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/50 sticky top-0">
                <tr>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">ID</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Source</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Asset</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Dept</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Priority</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {defects.slice(0, 50).map(d => (
                  <tr key={d._id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="p-3 font-mono-rail text-[10px] text-slate-300">{d._id.substring(0,8)}</td>
                    <td className="p-3"><DataSourceBadge source={d.source}/></td>
                    <td className="p-3 font-mono-rail text-[10px] text-slate-300">{d.assetId}</td>
                    <td className="p-3 font-mono-rail text-[10px] text-slate-400">{d.department}</td>
                    <td className="p-3 font-mono-rail text-[10px] text-slate-300">{d.priority}</td>
                    <td className="p-3 font-mono-rail text-[10px] text-slate-500">{new Date(d.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-700">
            <h2 className="font-mono-rail text-xs font-semibold text-slate-300">SOURCE HEALTH</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {sources.map(s => (
              <div key={s.name} className="flex flex-col gap-1 border-b border-slate-700/50 pb-3 last:border-0">
                <div className="flex justify-between items-center">
                  <DataSourceBadge source={s.name} />
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="font-mono-rail text-[8px] text-emerald-500">ONLINE</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 mt-2 gap-2">
                  <div>
                    <div className="font-mono-rail text-[8px] text-slate-500">Latency</div>
                    <div className="font-mono-rail text-[10px] text-slate-300">{s.delay}</div>
                  </div>
                  <div>
                    <div className="font-mono-rail text-[8px] text-slate-500">Error Rate</div>
                    <div className="font-mono-rail text-[10px] text-emerald-400">0.0%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

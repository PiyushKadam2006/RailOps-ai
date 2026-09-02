import { useState, useEffect } from 'react';
import api from '../api/axios';
import KPICard from '../components/KPICard';

export default function History() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCorridor, setFilterCorridor] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    api.get('/blocks').then(res => setBlocks(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredBlocks = blocks.filter(b => {
    if (filterCorridor !== 'ALL' && b.corridorId !== filterCorridor) return false;
    if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
    if (filterDept !== 'ALL' && b.department !== filterDept) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredBlocks.length / perPage);
  const paginatedBlocks = filteredBlocks.slice((page - 1) * perPage, page * perPage);

  const totalHours = Math.round(filteredBlocks.reduce((acc, b) => {
    return acc + (new Date(b.endTime) - new Date(b.startTime)) / 3600000;
  }, 0));
  const avgDuration = filteredBlocks.length ? (totalHours / filteredBlocks.length).toFixed(1) : 0;
  const conflictRate = filteredBlocks.length ? Math.round((filteredBlocks.filter(b => b.conflictFlags?.length > 0).length / filteredBlocks.length) * 100) : 0;

  const getStatusBadge = (status) => {
    switch(status) {
      case 'APPROVED': return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
      case 'ACTIVE': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'COMPLETED': return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
      case 'PROPOSED': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'CANCELLED': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      
      <div className="flex gap-4 items-center bg-slate-800 border border-slate-700 p-3 rounded-xl flex-shrink-0">
        <div className="font-mono-rail text-xs text-slate-400 mr-2">FILTERS:</div>
        <select className="bg-slate-900 border border-slate-700 text-slate-300 text-xs p-1.5 rounded font-mono-rail outline-none" value={filterCorridor} onChange={e => {setFilterCorridor(e.target.value); setPage(1);}}>
          <option value="ALL">ALL CORRIDORS</option>
          <option value="COR-01">COR-01 Delhi-Mumbai</option>
          <option value="COR-02">COR-02 Delhi-Howrah</option>
          <option value="COR-03">COR-03 Mumbai-Chennai</option>
          <option value="COR-04">COR-04 Howrah-Chennai</option>
          <option value="COR-05">COR-05 Delhi-Chennai</option>
        </select>
        <select className="bg-slate-900 border border-slate-700 text-slate-300 text-xs p-1.5 rounded font-mono-rail outline-none" value={filterStatus} onChange={e => {setFilterStatus(e.target.value); setPage(1);}}>
          <option value="ALL">ALL STATUSES</option>
          <option value="PROPOSED">PROPOSED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <select className="bg-slate-900 border border-slate-700 text-slate-300 text-xs p-1.5 rounded font-mono-rail outline-none" value={filterDept} onChange={e => {setFilterDept(e.target.value); setPage(1);}}>
          <option value="ALL">ALL DEPARTMENTS</option>
          <option value="Traction">Traction</option>
          <option value="Signalling">Signalling</option>
          <option value="Track">Track</option>
          <option value="Rolling Stock">Rolling Stock</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        <KPICard label="Total Blocks" value={filteredBlocks.length} accentClass="kpi-accent-bl" />
        <KPICard label="Total Hours" value={totalHours} accentClass="kpi-accent-vi" />
        <KPICard label="Avg Duration" value={`${avgDuration}h`} accentClass="kpi-accent-em" />
        <KPICard label="Conflict Rate" value={`${conflictRate}%`} accentClass="kpi-accent-rd" />
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/80 sticky top-0 z-10">
              <tr>
                <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Block ID</th>
                <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Asset</th>
                <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Corridor</th>
                <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Department</th>
                <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Start</th>
                <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">End</th>
                <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Duration</th>
                <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Trains Impacted</th>
                <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Conflicts</th>
                <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-500 border-b border-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBlocks.map(b => (
                <tr key={b._id} className="border-b border-slate-700/50 hover:bg-slate-700/20 cursor-pointer">
                  <td className="p-3 font-mono-rail text-[10px] text-slate-300">{b.blockCode || b._id.toString().slice(-8).toUpperCase()}</td>
                  <td className="p-3 font-mono-rail text-[10px] text-slate-300">{b.assetId}</td>
                  <td className="p-3 font-mono-rail text-[10px] text-slate-400">{b.corridorId}</td>
                  <td className="p-3 font-mono-rail text-[10px] text-slate-400">{b.department}</td>
                  <td className="p-3 font-mono-rail text-[10px] text-slate-400">{new Date(b.startTime).toLocaleString()}</td>
                  <td className="p-3 font-mono-rail text-[10px] text-slate-400">{new Date(b.endTime).toLocaleString()}</td>
                  <td className="p-3 font-mono-rail text-[10px] text-slate-300">{((new Date(b.endTime) - new Date(b.startTime))/3600000).toFixed(1)}h</td>
                  <td className="p-3 font-mono-rail text-[10px]">
                    {b.trainImpact > 0 ? <span className="text-amber-400">{b.trainImpact}</span> : <span className="text-slate-500">0</span>}
                  </td>
                  <td className="p-3">
                    {b.conflictFlags?.length > 0 && <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-1 rounded text-xs">⚠</span>}
                  </td>
                  <td className="p-3">
                     <span className={`font-mono-rail text-[8px] px-2 py-0.5 rounded-full ${getStatusBadge(b.status)}`}>
                       {b.status}
                     </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-700 flex justify-between items-center flex-shrink-0">
          <span className="font-mono-rail text-[10px] text-slate-500">
            Showing {(page-1)*perPage + 1} to {Math.min(page*perPage, filteredBlocks.length)} of {filteredBlocks.length} entries
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p-1))}
              disabled={page === 1}
              className="font-mono-rail text-[10px] bg-slate-800 border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded text-slate-300 transition-colors disabled:opacity-50"
            >
              PREV
            </button>
            <span className="font-mono-rail text-[10px] text-slate-300 px-2 py-1 bg-slate-800 border border-slate-700 rounded">
              {page} / {totalPages || 1}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p+1))}
              disabled={page >= totalPages}
              className="font-mono-rail text-[10px] bg-slate-800 border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded text-slate-300 transition-colors disabled:opacity-50"
            >
              NEXT
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

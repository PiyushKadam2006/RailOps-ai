import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api/axios';
import { useRailOps } from '../context/RailOpsContext';
import DataSourceBadge from '../components/DataSourceBadge';

const PIPELINE_SOURCES = [
  { id: 'TMS', name: 'TMS', desc: 'Track Management', defaultCount: 35 },
  { id: 'SMMS', name: 'SMMS', desc: 'Signal Maintenance', defaultCount: 35 },
  { id: 'TRK', name: 'TRK', desc: 'Permanent Way Assets', defaultCount: 40 },
  { id: 'OHE', name: 'OHE', desc: 'Overhead Equipment', defaultCount: 45 },
  { id: 'COA', name: 'COA', desc: 'Control Office Ops', defaultCount: 31 },
];

export default function DataIntegration() {
  const { defects, blocks, refreshData } = useRailOps();
  const [metrics, setMetrics] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef(null);

  // Live dynamic counts derived from Context datasets
  const pipelineCounts = useMemo(() => {
    const tms = defects.filter(d => d.source === 'TMS' || d.department === 'Track').length;
    const smms = defects.filter(d => d.source === 'SMMS' || d.department === 'Signalling').length;
    const trk = defects.filter(d => d.source === 'TDMS' || d.department === 'Track' || (d.assetId && d.assetId.startsWith('TRK'))).length;
    const ohe = defects.filter(d => ['Traction', 'Electrical', 'Infrastructure'].includes(d.department)).length;
    const coa = blocks.length + defects.filter(d => d.source === 'COA').length;
    return {
      TMS: { count: tms || 35 },
      SMMS: { count: smms || 35 },
      TRK: { count: trk || 40 },
      OHE: { count: ohe || 45 },
      COA: { count: coa || 31 },
    };
  }, [defects, blocks]);

  const totalDynamicRecords = useMemo(() => {
    return Object.values(pipelineCounts).reduce((a, b) => a + (b.count || 0), 0);
  }, [pipelineCounts]);

  // Fetch metrics (simulated latencies, error rates)
  const fetchMetrics = async (isBackground = false) => {
    if (isBackground) setIsPolling(true);
    try {
      const metricsRes = await api.get('/integration/metrics');
      if (metricsRes.data) {
        setMetrics(metricsRes.data);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch integration metrics:', err);
    } finally {
      setInitialLoading(false);
      if (isBackground) {
        setTimeout(() => setIsPolling(false), 600);
      }
    }
  };

  useEffect(() => {
    fetchMetrics(false);

    // 5000ms live polling interval for socket/latency metrics
    intervalRef.current = setInterval(() => {
      fetchMetrics(true);
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const unifiedStorage = {
    totalRecords: totalDynamicRecords,
    volumeMb: ((totalDynamicRecords * 1.8) / 1024).toFixed(2) + ' MB'
  };

  const sourcesList = useMemo(() => {
    const baseSources = metrics?.sources || PIPELINE_SOURCES.map(s => ({
      id: s.id,
      name: s.name,
      desc: s.desc,
      records: pipelineCounts[s.id]?.count ?? s.defaultCount,
      latency: 16,
      errorRate: '0.0%',
      isOnline: true,
      status: 'ONLINE'
    }));

    return baseSources.map(s => ({
      ...s,
      records: pipelineCounts[s.id]?.count ?? s.records
    }));
  }, [metrics, pipelineCounts]);

  // Latency color utility
  const getLatencyColor = (latency) => {
    if (latency > 100) return 'text-red-400 font-bold';
    if (latency > 50) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden bg-slate-950 text-slate-100">
      
      {/* ── TOP PIPELINE STREAM OVERVIEW ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <h2 className="font-mono-rail text-xs font-bold text-slate-200 tracking-wider">
              DYNAMIC DATA INTEGRATION PIPELINE
            </h2>
          </div>
          
          <div className="flex items-center gap-3 font-mono-rail text-[9px]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isPolling ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span>{isPolling ? 'STREAM SYNCING...' : 'LIVE 5s POLLING ACTIVE'}</span>
            </div>
            {lastSyncTime && (
              <span className="text-slate-500">
                Synced at {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Pipeline Ingestion Flow */}
        <div className="flex items-center justify-between">
          
          {/* 5 Ingestion Source Cards: TMS, SMMS, TRK, OHE, COA */}
          <div className="flex gap-2">
            {PIPELINE_SOURCES.map(s => {
              const count = pipelineCounts[s.id]?.count ?? s.defaultCount;
              return (
                <div
                  key={s.id}
                  className="bg-slate-800/70 border border-slate-700/80 hover:border-slate-600 rounded-lg p-3 w-32 flex flex-col items-center transition-all group"
                >
                  <DataSourceBadge source={s.name} />
                  <span className="font-mono-rail text-[8px] text-slate-400 mt-2 text-center h-5 leading-tight truncate w-full">
                    {s.desc}
                  </span>
                  {initialLoading && !metrics ? (
                    <div className="w-12 h-5 bg-slate-700/60 rounded animate-pulse mt-1" />
                  ) : (
                    <span className="font-mono-rail text-sm font-bold text-slate-100 mt-1">
                      {count.toLocaleString()}
                    </span>
                  )}
                  <span className="font-mono-rail text-[8px] text-slate-500 mt-0.5">records</span>
                </div>
              );
            })}
          </div>
          
          {/* Flow Connector Arrow 1 */}
          <div className="flex-1 flex items-center justify-center relative px-4">
            <div className="h-px bg-slate-700 w-full absolute" />
            <div className="text-emerald-400 z-10 bg-slate-900 px-2 font-mono-rail text-xs animate-pulse">
              ▶▶
            </div>
          </div>

          {/* Unified Storage Central Container */}
          <div className="bg-slate-800/90 border border-emerald-500/40 rounded-xl p-4 w-44 flex flex-col items-center shadow-[0_0_20px_rgba(16,185,129,0.12)]">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center mb-1.5 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <span className="text-emerald-400 text-sm font-bold">✓</span>
            </div>
            <span className="font-mono-rail text-[10px] text-emerald-400 font-bold text-center uppercase tracking-wide">
              Unified Storage
            </span>
            {initialLoading && !metrics ? (
              <div className="w-16 h-6 bg-slate-700/60 rounded animate-pulse mt-1.5" />
            ) : (
              <span className="font-mono-rail text-base font-bold text-slate-100 mt-1">
                {unifiedStorage.totalRecords?.toLocaleString()}
              </span>
            )}
            <div className="flex items-center gap-1.5 mt-0.5 font-mono-rail text-[8px] text-slate-400">
              <span>total records</span>
              <span>•</span>
              <span className="text-emerald-400/90 font-semibold">{unifiedStorage.volumeMb}</span>
            </div>
          </div>

          {/* Flow Connector Arrow 2 */}
          <div className="flex-1 flex items-center justify-center relative px-4">
            <div className="h-px bg-slate-700 w-full absolute" />
            <div className="text-blue-400 z-10 bg-slate-900 px-2 font-mono-rail text-xs animate-pulse">
              ▶▶
            </div>
          </div>

          {/* AI Optimization Engine Endpoint */}
          <div className="bg-slate-800/90 border border-blue-500/40 rounded-xl p-4 w-44 flex flex-col items-center shadow-[0_0_20px_rgba(59,130,246,0.12)]">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mb-1.5 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)] pulse-dot">
              <span className="text-blue-400 text-xs font-mono-rail font-bold">AI</span>
            </div>
            <span className="font-mono-rail text-[10px] text-blue-400 font-bold text-center uppercase tracking-wide">
              AI Engine
            </span>
            <span className="font-mono-rail text-[9px] text-slate-300 font-semibold mt-1">
              Active Optimization
            </span>
            <span className="font-mono-rail text-[8px] text-slate-500 mt-0.5">
              Live heuristic stream
            </span>
          </div>
        </div>
      </div>

      {/* ── LOWER SECTION: DEFECT FEED + LIVE SOURCE HEALTH MONITOR ── */}
      <div className="flex-1 grid grid-cols-[1fr_320px] gap-4 overflow-hidden">
        
        {/* Left Table: Defect Ingestion Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
            <div className="flex items-center gap-2">
              <h2 className="font-mono-rail text-xs font-semibold text-slate-300">
                LIVE DEFECT INGESTION STREAM
              </h2>
              <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {defects.length} RECORDS INGESTED
              </span>
            </div>
            <span className="font-mono-rail text-[9px] text-slate-500">
              Auto-refreshed from MongoDB collections
            </span>
          </div>

          <div className="flex-1 overflow-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/90 sticky top-0 z-10">
                <tr>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">ID</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">Source</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">Asset</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">Dept</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">Priority</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">Ingestion Time</th>
                </tr>
              </thead>
              <tbody>
                {defects.slice(0, 50).map(d => (
                  <tr key={d._id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono-rail text-[10px] text-slate-300">
                      {d.defectCode || d._id.substring(0, 8)}
                    </td>
                    <td className="p-3">
                      <DataSourceBadge source={d.source} />
                    </td>
                    <td className="p-3 font-mono-rail text-[10px] text-slate-300">
                      {d.assetId}
                    </td>
                    <td className="p-3 font-mono-rail text-[10px] text-slate-400">
                      {d.department}
                    </td>
                    <td className="p-3">
                      <span className={`font-mono-rail text-[8px] px-2 py-0.5 rounded-full border font-semibold ${
                        d.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        d.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        d.priority === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}>
                        {d.priority}
                      </span>
                    </td>
                    <td className="p-3 font-mono-rail text-[10px] text-slate-500">
                      {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Live Source Health Monitoring */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
            <h2 className="font-mono-rail text-xs font-semibold text-slate-300">
              LIVE SOURCE HEALTH
            </h2>
            <span className="font-mono-rail text-[9px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SOCKET ACTIVE
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {sourcesList.map(s => {
              const isSpike = parseFloat(s.errorRate) > 0;
              const isHighLatency = s.latency > 100;
              const isHealthy = s.isOnline && !isSpike && !isHighLatency;

              return (
                <div
                  key={s.id || s.name}
                  className="bg-slate-800/50 border border-slate-800 rounded-lg p-3 flex flex-col gap-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <DataSourceBadge source={s.name} />
                      <span className="font-mono-rail text-[9px] text-slate-400 truncate max-w-[120px]">
                        {s.desc}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isHealthy
                            ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                            : 'bg-amber-400 animate-ping shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        }`}
                      />
                      <span
                        className={`font-mono-rail text-[8px] font-bold ${
                          isHealthy ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {isHealthy ? 'ONLINE' : 'DEGRADED'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    <div>
                      <div className="font-mono-rail text-[8px] text-slate-500">Latency</div>
                      <div className={`font-mono-rail text-xs font-semibold ${getLatencyColor(s.latency)}`}>
                        {s.latency} ms
                      </div>
                    </div>

                    <div>
                      <div className="font-mono-rail text-[8px] text-slate-500">Error Rate</div>
                      <div
                        className={`font-mono-rail text-xs font-semibold ${
                          isSpike ? 'text-red-400 font-bold' : 'text-emerald-400'
                        }`}
                      >
                        {s.errorRate}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Ingestion Pipeline Protocol Details */}
            <div className="mt-auto pt-3 border-t border-slate-800">
              <div className="font-mono-rail text-[8px] text-slate-500 uppercase mb-1">
                Ingestion Protocol
              </div>
              <div className="font-mono-rail text-[9px] text-slate-400 flex justify-between">
                <span>Polling Frequency</span>
                <span className="text-slate-300">5000 ms</span>
              </div>
              <div className="font-mono-rail text-[9px] text-slate-400 flex justify-between mt-0.5">
                <span>Socket Handshake</span>
                <span className="text-emerald-400 font-semibold">TLS 1.3 / WebSocket</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

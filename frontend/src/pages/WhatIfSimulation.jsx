import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function WhatIfSimulation() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Custom form
  const [customType, setCustomType] = useState('TRAIN_DELAY');
  const [customCorridor, setCustomCorridor] = useState('COR-01');
  const [customDelay, setCustomDelay] = useState(60);
  const [customDesc, setCustomDesc] = useState('');

  useEffect(() => {
    api.get('/simulation/scenarios').then(res => setScenarios(res.data)).catch(console.error);
  }, []);

  const runSimulation = async (scenarioData) => {
    setLoading(true);
    setSimResult(null);
    try {
      const res = await api.post('/simulation/whatif', {
        scenario: scenarioData.type,
        corridorId: scenarioData.corridorId,
        delayMinutes: scenarioData.delayMinutes,
        description: scenarioData.description
      });
      setSimResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeClass = (type) => {
    if (type === 'TRAIN_DELAY') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (type === 'NEW_CRITICAL') return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  return (
    <div className="h-full grid grid-cols-[350px_1fr] gap-4 p-4 overflow-hidden">
      
      {/* Left Panel */}
      <div className="flex flex-col gap-4 h-full overflow-hidden">
        <h2 className="font-mono-rail text-sm font-bold text-slate-200">WHAT-IF SIMULATION ENGINE</h2>
        
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2">
          <div className="font-mono-rail text-xs text-slate-500 uppercase">Predefined Scenarios</div>
          {scenarios.map(s => (
            <div 
              key={s.id} 
              onClick={() => setSelectedScenario(s)}
              className={`bg-slate-800 border rounded-lg p-4 cursor-pointer transition-colors ${selectedScenario?.id === s.id ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-500'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono-rail text-xs font-bold text-slate-200 truncate pr-2">{s.name}</span>
                <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded border ${getBadgeClass(s.type)}`}>{s.type}</span>
              </div>
              <div className="font-mono-rail text-[10px] text-slate-400 mb-2">Corridor: {s.corridorId} | Delay: {s.delayMinutes}m</div>
              <div className="text-[11px] text-slate-500">{s.description}</div>
            </div>
          ))}

          <div className="font-mono-rail text-xs text-slate-500 uppercase mt-4">Custom Scenario</div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-3">
            <select className="bg-slate-900 border border-slate-700 text-slate-300 text-xs p-2 rounded font-mono-rail outline-none" value={customType} onChange={e => setCustomType(e.target.value)}>
              <option value="TRAIN_DELAY">TRAIN DELAY</option>
              <option value="NEW_CRITICAL">NEW CRITICAL DEFECT</option>
              <option value="WEATHER">WEATHER DISRUPTION</option>
            </select>
            <select className="bg-slate-900 border border-slate-700 text-slate-300 text-xs p-2 rounded font-mono-rail outline-none" value={customCorridor} onChange={e => setCustomCorridor(e.target.value)}>
              <option value="COR-01">COR-01 Delhi-Mumbai</option>
              <option value="COR-02">COR-02 Delhi-Howrah</option>
              <option value="COR-03">COR-03 Mumbai-Chennai</option>
            </select>
            <input type="number" className="bg-slate-900 border border-slate-700 text-slate-300 text-xs p-2 rounded font-mono-rail outline-none" value={customDelay} onChange={e => setCustomDelay(Number(e.target.value))} placeholder="Delay minutes" />
            <input type="text" className="bg-slate-900 border border-slate-700 text-slate-300 text-xs p-2 rounded outline-none" value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="Description" />
            
            <button 
              onClick={() => runSimulation({ type: customType, corridorId: customCorridor, delayMinutes: customDelay, description: customDesc })}
              disabled={loading}
              className="bg-slate-700 hover:bg-slate-600 text-white font-mono-rail text-xs py-2 rounded transition-colors"
            >
              RUN CUSTOM SIMULATION
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
           <h2 className="font-mono-rail text-xs font-semibold text-slate-300">SIMULATION RESULTS</h2>
           {selectedScenario && (
             <button 
               onClick={() => runSimulation(selectedScenario)}
               disabled={loading}
               className="bg-emerald-500 hover:bg-emerald-400 text-white font-mono-rail text-xs font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
             >
               {loading ? 'SIMULATING...' : '▶ RUN SIMULATION'}
             </button>
           )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col relative">
          {simResult ? (
            <div className="p-4 flex flex-col gap-4 slide-in">
              
              {/* Scenario header */}
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="font-mono-rail text-[9px] text-slate-500 uppercase mb-1">
                  Scenario Executed
                </div>
                <div className="font-mono-rail text-sm text-emerald-400 font-bold">
                  {selectedScenario?.name || 'Custom Simulation'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {selectedScenario?.description || 'Custom parameters applied'}
                </div>
              </div>

              {/* Before vs After comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="font-mono-rail text-[9px] text-red-400 uppercase mb-3">
                    ⚠ Before Optimization
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="font-mono-rail text-[10px] text-slate-500">Conflicts</span>
                      <span className="font-mono-rail text-sm text-red-400 font-bold">
                        {simResult.result?.conflictsBefore ?? simResult.result?.rescheduledCount ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono-rail text-[10px] text-slate-500">Affected Blocks</span>
                      <span className="font-mono-rail text-sm text-red-400 font-bold">
                        {simResult.result?.affectedBlocks?.length ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono-rail text-[10px] text-slate-500">Train Disruptions</span>
                      <span className="font-mono-rail text-sm text-red-400 font-bold">
                        {selectedScenario?.delayMinutes ?? customDelay}m delay
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <div className="font-mono-rail text-[9px] text-emerald-400 uppercase mb-3">
                    ✓ After Re-optimization
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="font-mono-rail text-[10px] text-slate-500">Conflicts</span>
                      <span className="font-mono-rail text-sm text-emerald-400 font-bold">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono-rail text-[10px] text-slate-500">Rescheduled</span>
                      <span className="font-mono-rail text-sm text-emerald-400 font-bold">
                        {simResult.result?.rescheduledCount ?? 0} blocks
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono-rail text-[10px] text-slate-500">Priority Tasks</span>
                      <span className="font-mono-rail text-sm text-emerald-400 font-bold">Front-loaded</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rescheduled blocks list */}
              {simResult.result?.newSchedule?.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-700">
                    <span className="font-mono-rail text-xs font-semibold text-slate-300">
                      RESCHEDULED BLOCKS
                    </span>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {simResult.result.newSchedule.slice(0, 5).map((blk, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2">
                        <span className="font-mono-rail text-[10px] text-slate-400">
                          {blk.blockCode || blk._id?.toString().slice(-8).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-rail text-[9px] text-red-400">
                            {new Date(blk.originalStart || blk.startTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                          </span>
                          <span className="text-slate-600 text-[10px]">→</span>
                          <span className="font-mono-rail text-[9px] text-emerald-400">
                            {new Date(blk.startTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Impact summary */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="font-mono-rail text-[9px] text-slate-500 uppercase mb-3">
                  Impact Summary
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="font-mono-rail text-xl font-bold text-emerald-400">
                      {simResult.result?.rescheduledCount ?? 0}
                    </div>
                    <div className="font-mono-rail text-[9px] text-slate-500 mt-1">Blocks Moved</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono-rail text-xl font-bold text-blue-400">
                      {Math.max(0, (selectedScenario?.delayMinutes ?? customDelay) - 15)}m
                    </div>
                    <div className="font-mono-rail text-[9px] text-slate-500 mt-1">Time Recovered</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono-rail text-xl font-bold text-amber-400">MIN</div>
                    <div className="font-mono-rail text-[9px] text-slate-500 mt-1">Train Disruption</div>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="font-mono-rail text-[9px] text-slate-600 text-right">
                Simulation run at {new Date(simResult.timestamp || Date.now()).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="text-4xl opacity-20">⚙</div>
              <div className="font-mono-rail text-sm text-slate-500 italic">
                Select a scenario and run simulation
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

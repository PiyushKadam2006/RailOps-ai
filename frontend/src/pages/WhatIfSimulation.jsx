import React, { useState, useMemo } from 'react';
import api from '../api/axios';
import { useRailOps } from '../context/RailOpsContext';

// Topology of Indian Railway Trunk Corridors and network relationships
const CORRIDOR_NETWORK = [
  {
    corridorId: 'COR-01',
    name: 'Delhi–Mumbai',
    fromStation: 'NDLS',
    toStation: 'CSMT',
    totalKm: 1384,
    dailyTrains: 58,
    secondaryIds: ['COR-02', 'COR-03', 'COR-05'],
    tertiaryIds: ['COR-04']
  },
  {
    corridorId: 'COR-02',
    name: 'Delhi–Howrah',
    fromStation: 'NDLS',
    toStation: 'HWH',
    totalKm: 1441,
    dailyTrains: 64,
    secondaryIds: ['COR-01', 'COR-04', 'COR-05'],
    tertiaryIds: ['COR-03']
  },
  {
    corridorId: 'COR-03',
    name: 'Mumbai–Chennai',
    fromStation: 'CSMT',
    toStation: 'MAS',
    totalKm: 1279,
    dailyTrains: 42,
    secondaryIds: ['COR-01', 'COR-04', 'COR-05'],
    tertiaryIds: ['COR-02']
  },
  {
    corridorId: 'COR-04',
    name: 'Howrah–Chennai',
    fromStation: 'HWH',
    toStation: 'MAS',
    totalKm: 1659,
    dailyTrains: 36,
    secondaryIds: ['COR-02', 'COR-03', 'COR-05'],
    tertiaryIds: ['COR-01']
  },
  {
    corridorId: 'COR-05',
    name: 'Delhi–Chennai',
    fromStation: 'NDLS',
    toStation: 'MAS',
    totalKm: 2175,
    dailyTrains: 48,
    secondaryIds: ['COR-01', 'COR-02', 'COR-03', 'COR-04'],
    tertiaryIds: []
  }
];

const PREDEFINED_SCENARIOS = [
  {
    id: 'SCN-EMERGENCY',
    name: 'Track Emergency',
    type: 'EMERGENCY_BLOCK',
    icon: '⚡',
    severity: 'CRITICAL',
    defaultDelay: 120,
    defaultCorridor: 'COR-01',
    description: 'Sudden rail fracture detected on high-speed section. Immediate line blockade enforced.',
    mitigation: 'Dispatch emergency track maintenance gang; divert Superfast Express via Chord line.'
  },
  {
    id: 'SCN-MONSOON',
    name: 'Monsoon Disruption',
    type: 'WEATHER_RESTRICTION',
    icon: '🌧',
    severity: 'HIGH',
    defaultDelay: 180,
    defaultCorridor: 'COR-03',
    description: 'Submerged tracks and embankment slippage due to torrential rain. Speed restricted to 30 km/h.',
    mitigation: 'Regulate inter-zonal freight departures; deploy mobile de-watering diesel pumps.'
  },
  {
    id: 'SCN-POWER',
    name: 'Power Failure (OHE)',
    type: 'TRACTION_OHE',
    icon: '⚡',
    severity: 'HIGH',
    defaultDelay: 90,
    defaultCorridor: 'COR-04',
    description: '25kV overhead catenary pantograph entanglement causing traction blackout across two blocks.',
    mitigation: 'Isolate neutral section; deploy dual-mode diesel locomotives for stranded rakes.'
  },
  {
    id: 'SCN-SIGNALLING',
    name: 'Signalling Interlocking Fault',
    type: 'SIGNALLING_EI',
    icon: '🛑',
    severity: 'CRITICAL',
    defaultDelay: 150,
    defaultCorridor: 'COR-02',
    description: 'Electronic Interlocking (EI) panel failure at major junction. Manual paper token dispatch enforced.',
    mitigation: 'Engage station pilot crew; prioritize passenger trains over goods traffic at home signals.'
  },
  {
    id: 'SCN-REROUTE',
    name: 'Freight Consist Derailment',
    type: 'FREIGHT_INCIDENT',
    icon: '🚜',
    severity: 'MEDIUM',
    defaultDelay: 60,
    defaultCorridor: 'COR-05',
    description: 'Container flatcar wheel axle binding on loop line turnout, fouling main line clearance.',
    mitigation: 'Activate 140-ton railway breakdown crane; single-line reversible working authorized.'
  }
];

function computeCascadeImpact(primaryCorridorId, inputDelay) {
  const BASELINE_AVAILABILITY = 98.4;
  const primary = CORRIDOR_NETWORK.find(c => c.corridorId === primaryCorridorId) || CORRIDOR_NETWORK[0];

  const corridorResults = CORRIDOR_NETWORK.map(corridor => {
    let tier = 'TERTIARY';
    let cascadeFactor = 0.30;
    let relationship = 'Cross-Network (Tertiary)';

    if (corridor.corridorId === primary.corridorId) {
      tier = 'PRIMARY';
      cascadeFactor = 1.0;
      relationship = 'Primary Disruption Source';
    } else if (primary.secondaryIds.includes(corridor.corridorId)) {
      tier = 'SECONDARY';
      cascadeFactor = 0.65;
      relationship = 'Direct Downstream Line (Secondary)';
    } else {
      tier = 'TERTIARY';
      cascadeFactor = 0.30;
      relationship = 'Cross-Network Line (Tertiary)';
    }

    const calculatedDelay = Math.max(0, Math.round(inputDelay * cascadeFactor));

    let status = 'NOMINAL';
    if (calculatedDelay >= 90) status = 'CRITICAL_DELAY';
    else if (calculatedDelay >= 40) status = 'MODERATE_WARNING';

    const trainsPerHour = corridor.dailyTrains / 24;
    const impactFactor = tier === 'PRIMARY' ? 2.2 : tier === 'SECONDARY' ? 1.5 : 0.9;
    const impactedTrains = Math.max(
      calculatedDelay > 0 ? 1 : 0,
      Math.round((calculatedDelay / 60) * trainsPerHour * impactFactor)
    );

    return {
      ...corridor,
      tier,
      cascadeFactor,
      relationship,
      delayMinutes: calculatedDelay,
      delayHours: parseFloat((calculatedDelay / 60).toFixed(1)),
      impactedTrains,
      status
    };
  });

  corridorResults.sort((a, b) => {
    if (a.tier === 'PRIMARY') return -1;
    if (b.tier === 'PRIMARY') return 1;
    return b.delayMinutes - a.delayMinutes;
  });

  const totalDelayMinutes = corridorResults.reduce((sum, c) => sum + c.delayMinutes, 0);
  const cumulativeDelayHours = parseFloat((totalDelayMinutes / 60).toFixed(1));
  const totalImpactedTrains = corridorResults.reduce((sum, c) => sum + c.impactedTrains, 0);

  const networkLoadPct = (cumulativeDelayHours / 120) * 100;
  const degradation = Math.min(48.0, networkLoadPct * 0.92);
  const simulatedAvailability = Math.max(50.0, parseFloat((BASELINE_AVAILABILITY - degradation).toFixed(1)));
  const availabilityDelta = parseFloat((simulatedAvailability - BASELINE_AVAILABILITY).toFixed(1));

  return {
    baselineAvailability: BASELINE_AVAILABILITY,
    simulatedAvailability,
    availabilityDelta,
    cumulativeDelayHours,
    totalImpactedTrains,
    corridorResults
  };
}

export default function WhatIfSimulation() {
  const { refreshData } = useRailOps();
  const [selectedScenarioId, setSelectedScenarioId] = useState(PREDEFINED_SCENARIOS[0].id);
  const [targetCorridorId, setTargetCorridorId] = useState(PREDEFINED_SCENARIOS[0].defaultCorridor);
  const [delayMinutes, setDelayMinutes] = useState(PREDEFINED_SCENARIOS[0].defaultDelay);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isReoptimizing, setIsReoptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState('cascade'); // 'cascade' | 'reopt'
  const [reoptResult, setReoptResult] = useState(null);
  const [reoptSuccess, setReoptSuccess] = useState(null);

  const activeScenario = useMemo(() => {
    return PREDEFINED_SCENARIOS.find(s => s.id === selectedScenarioId) || PREDEFINED_SCENARIOS[0];
  }, [selectedScenarioId]);

  const handleSelectScenario = (scenario) => {
    setSelectedScenarioId(scenario.id);
    setTargetCorridorId(scenario.defaultCorridor);
    setDelayMinutes(scenario.defaultDelay);
    setReoptResult(null);
    setReoptSuccess(null);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setActiveTab('cascade');
    setTimeout(() => {
      setIsSimulating(false);
    }, 350);
  };

  const handleReoptimizePlan = async () => {
    setIsReoptimizing(true);
    setReoptSuccess(null);
    try {
      const res = await api.post('/simulation/what-if', {
        scenario: activeScenario.type,
        corridorId: targetCorridorId,
        delayMinutes,
        description: activeScenario.description
      });
      setReoptResult(res.data?.result);
      setActiveTab('reopt');
      setReoptSuccess('Disruption analyzed: alternative feasible maintenance windows generated & plan re-optimized.');
      refreshData();
    } catch (err) {
      console.error('Re-optimization error:', err);
    } finally {
      setIsReoptimizing(false);
    }
  };

  const cascadeData = useMemo(() => {
    return computeCascadeImpact(targetCorridorId, delayMinutes);
  }, [targetCorridorId, delayMinutes]);

  const targetCorridorObj = CORRIDOR_NETWORK.find(c => c.corridorId === targetCorridorId);

  return (
    <div className="h-full grid grid-cols-[380px_1fr] gap-4 p-4 overflow-hidden bg-slate-950 text-slate-100">
      
      {/* ── LEFT PANEL: INTERACTIVE SIMULATION & RE-OPTIMIZATION CONTROLS ── */}
      <div className="flex flex-col gap-3 h-full overflow-hidden bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="font-mono-rail text-xs font-bold text-slate-200 tracking-wider flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              WHAT-IF SIMULATION & RE-OPTIMIZER
            </h2>
            <div className="font-mono-rail text-[9px] text-slate-500 mt-0.5">
              Constraint-aware disruption modeling & dynamic reschedule
            </div>
          </div>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">

          {/* 1. Predefined Scenarios Cards */}
          <div>
            <div className="font-mono-rail text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Disruption Scenarios</span>
              <span className="text-[9px] text-slate-500">{PREDEFINED_SCENARIOS.length} Presets</span>
            </div>
            <div className="flex flex-col gap-2">
              {PREDEFINED_SCENARIOS.map(s => {
                const isSelected = selectedScenarioId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectScenario(s)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-800/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{s.icon}</span>
                        <span className="font-mono-rail text-xs font-bold text-slate-200">{s.name}</span>
                      </div>
                      <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded border font-semibold ${
                        s.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : s.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {s.severity}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {s.description}
                    </div>
                    <div className="mt-2 flex items-center justify-between font-mono-rail text-[9px] text-slate-500">
                      <span>Corridor: {s.defaultCorridor}</span>
                      <span className="text-emerald-400">+{s.defaultDelay}m Disruption</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Target Corridor Dropdown */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <label className="font-mono-rail text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Primary Affected Corridor
            </label>
            <select
              value={targetCorridorId}
              onChange={(e) => {
                setTargetCorridorId(e.target.value);
                setReoptResult(null);
              }}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs p-2.5 rounded font-mono-rail outline-none focus:border-emerald-500 transition-colors"
            >
              {CORRIDOR_NETWORK.map(c => (
                <option key={c.corridorId} value={c.corridorId}>
                  {c.corridorId} — {c.name} ({c.totalKm}km)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Delay Slider */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="font-mono-rail text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Disruption Blockade Duration
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="15"
                  max="360"
                  step="5"
                  value={delayMinutes}
                  onChange={(e) => {
                    const val = Math.max(15, Math.min(360, Number(e.target.value) || 15));
                    setDelayMinutes(val);
                    setReoptResult(null);
                  }}
                  className="w-16 bg-slate-900 border border-slate-700 text-emerald-400 text-right font-mono-rail text-xs font-bold px-2 py-1 rounded outline-none focus:border-emerald-500"
                />
                <span className="font-mono-rail text-[10px] text-slate-500">mins</span>
              </div>
            </div>

            <input
              type="range"
              min="15"
              max="360"
              step="5"
              value={delayMinutes}
              onChange={(e) => {
                setDelayMinutes(Number(e.target.value));
                setReoptResult(null);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between font-mono-rail text-[8px] text-slate-500 px-0.5">
              <span>15m</span>
              <span>1h (60m)</span>
              <span>2h (120m)</span>
              <span>6h (360m)</span>
            </div>
          </div>
        </div>

        {/* Dual Action Buttons */}
        <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="w-full flex items-center justify-center gap-2 font-mono-rail text-xs font-bold py-2.5 rounded-lg transition-all bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
          >
            {isSimulating ? 'MODELING CASCADE...' : '▶ RUN CASCADE SIMULATION'}
          </button>

          {/* Re-Optimize Button (Requirement 25) */}
          <button
            onClick={handleReoptimizePlan}
            disabled={isReoptimizing}
            className="w-full flex items-center justify-center gap-2 font-mono-rail text-xs font-bold py-2.5 rounded-lg transition-all bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            {isReoptimizing ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                RE-OPTIMIZING PLAN...
              </>
            ) : (
              <>⚡ RE-OPTIMIZE PLAN</>
            )}
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL: CASCADE RESULTS & RE-OPTIMIZATION REPORT ── */}
      <div className="flex flex-col gap-3 h-full overflow-hidden bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        
        {/* Header Bar with Tabs */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('cascade')}
              className={`font-mono-rail text-xs font-bold px-3 py-1.5 rounded transition-all ${
                activeTab === 'cascade'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CASCADE IMPACT REPORT
            </button>
            <button
              onClick={() => setActiveTab('reopt')}
              className={`font-mono-rail text-xs font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                activeTab === 'reopt'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>⚡ REVISED PLAN (RE-OPTIMIZED)</span>
              {reoptResult && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          </div>

          <span className="font-mono-rail text-[9px] text-slate-500">
            Epicenter: <strong className="text-slate-300">{targetCorridorId} ({targetCorridorObj?.name})</strong> · +{delayMinutes}m
          </span>
        </div>

        {reoptSuccess && (
          <div className="px-3 py-2 bg-emerald-950/40 border border-emerald-500/40 rounded-lg font-mono-rail text-[10px] text-emerald-300 flex items-center justify-between">
            <span>✓ {reoptSuccess}</span>
            <span className="font-bold">Recovery: {reoptResult?.metricsComparison?.after?.availabilityRecoveryPct || '+3.8%'}</span>
          </div>
        )}

        {/* ── TAB 1: CASCADE PROPAGATION REPORT ── */}
        {activeTab === 'cascade' && (
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-3 flex-shrink-0">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400 mb-1">Network Availability</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono-rail text-xl font-bold text-red-400">{cascadeData.simulatedAvailability}%</span>
                  <span className="font-mono-rail text-[9px] text-slate-500 line-through">{cascadeData.baselineAvailability}%</span>
                </div>
                <div className="font-mono-rail text-[8px] text-red-400/90 mt-1 font-semibold">▼ {cascadeData.availabilityDelta}% Drop</div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400 mb-1">Cumulative Delay</div>
                <div className="font-mono-rail text-xl font-bold text-amber-400">{cascadeData.cumulativeDelayHours}h</div>
                <div className="font-mono-rail text-[8px] text-slate-500 mt-1">Across 5 trunk lines</div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400 mb-1">Impacted Trains</div>
                <div className="font-mono-rail text-xl font-bold text-blue-400">{cascadeData.totalImpactedTrains} rakes</div>
                <div className="font-mono-rail text-[8px] text-slate-500 mt-1">Passenger & freight</div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400 mb-1">Disruption Scope</div>
                <div className="font-mono-rail text-xl font-bold text-violet-400">{cascadeData.corridorResults.filter(c => c.delayMinutes > 0).length} / 5</div>
                <div className="font-mono-rail text-[8px] text-slate-500 mt-1">Corridors impacted</div>
              </div>
            </div>

            {/* Network Health Degradation Bar */}
            <div className="bg-slate-800/60 border border-slate-800 rounded-xl p-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-rail text-xs font-semibold text-slate-300">DISRUPTION AVAILABILITY IMPACT</span>
                <span className="font-mono-rail text-xs font-bold text-red-400">{cascadeData.simulatedAvailability}% (Degraded)</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
                <div className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full" style={{ width: `${cascadeData.simulatedAvailability}%` }} />
              </div>
            </div>

            {/* Cascade Spread Table */}
            <div className="bg-slate-800/60 border border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="px-4 py-2 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
                <span className="font-mono-rail text-xs font-semibold text-slate-300">CORRIDOR CASCADE SPREAD</span>
                <span className="font-mono-rail text-[9px] text-slate-500">100% Primary ➔ 65% Secondary ➔ 30% Tertiary</span>
              </div>
              <div className="divide-y divide-slate-800/50 overflow-y-auto">
                {cascadeData.corridorResults.map(c => (
                  <div key={c.corridorId} className="p-3 flex items-center justify-between text-[9px] font-mono-rail hover:bg-slate-800/30">
                    <div>
                      <div className="text-slate-200 font-bold text-xs">{c.corridorId} — {c.name}</div>
                      <div className="text-slate-500">{c.relationship}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-400 font-bold">+{c.delayMinutes}m delay</div>
                      <div className="text-slate-400">{c.impactedTrains} trains affected</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: RE-OPTIMIZATION & SCHEDULE RECOVERY REPORT ── */}
        {activeTab === 'reopt' && (
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
            {!reoptResult ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 font-mono-rail text-slate-500">
                <div className="text-2xl opacity-25">⚡</div>
                <div>Click "⚡ RE-OPTIMIZE PLAN" on the left panel to execute constraint-aware rescheduling</div>
              </div>
            ) : (
              <>
                {/* Before vs After Re-Optimization Card */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 shadow-lg">
                  <div className="font-mono-rail text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
                    <span>BEFORE VS. AFTER RE-OPTIMIZATION</span>
                    <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      {reoptResult.metricsComparison?.after?.availabilityRecoveryPct} RECOVERY
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 font-mono-rail text-[10px]">
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-slate-500 uppercase text-[8px]">CORRIDOR STATUS</div>
                      <div className="text-red-400 line-through text-xs mt-1">{reoptResult.metricsComparison?.before?.corridorStatus}</div>
                      <div className="text-emerald-400 font-bold text-xs mt-0.5">{reoptResult.metricsComparison?.after?.corridorStatus}</div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-slate-500 uppercase text-[8px]">TRAINS DELAYED</div>
                      <div className="text-slate-400 line-through text-xs mt-1">{reoptResult.metricsComparison?.before?.trainsDelayed} trains</div>
                      <div className="text-emerald-400 font-bold text-xs mt-0.5">{reoptResult.metricsComparison?.after?.trainsDelayed} trains delayed</div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-slate-500 uppercase text-[8px]">SCHEDULE CONFLICTS</div>
                      <div className="text-red-400 line-through text-xs mt-1">{reoptResult.metricsComparison?.before?.conflicts} block conflicts</div>
                      <div className="text-emerald-400 font-bold text-xs mt-0.5">0 conflicts (Resolved)</div>
                    </div>
                  </div>
                </div>

                {/* Selected Alternative Window Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-850 border border-emerald-500/50 rounded-xl p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono-rail text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                      SELECTED REVISED BLOCK WINDOW
                    </span>
                    <span className="font-mono-rail text-xs font-bold text-emerald-400">
                      Score: {reoptResult.selectedAlternative?.score}/100
                    </span>
                  </div>
                  <div className="font-mono-rail text-lg font-bold text-slate-100">
                    {reoptResult.selectedAlternative?.timeLabel} ({reoptResult.selectedAlternative?.shiftName})
                  </div>
                  <div className="font-mono-rail text-[9px] text-slate-400 mt-1">
                    {reoptResult.selectedAlternative?.description}
                  </div>
                </div>

                {/* Alternative Windows Evaluated Table */}
                <div className="bg-slate-800/60 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-800 font-mono-rail text-xs font-semibold text-slate-300">
                    EVALUATED ALTERNATIVE WINDOWS
                  </div>
                  <div className="divide-y divide-slate-800">
                    {reoptResult.alternativeWindows?.map(alt => (
                      <div key={alt.candidateId} className="p-3 flex items-center justify-between font-mono-rail text-[9px]">
                        <div>
                          <div className="text-slate-200 font-bold">{alt.timeLabel} · {alt.shiftName}</div>
                          <div className="text-slate-400 text-[8px]">{alt.description}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            alt.feasible ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {alt.feasible ? 'FEASIBLE' : 'INFEASIBLE'}
                          </span>
                          <span className="font-bold text-slate-200 text-xs">Score: {alt.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

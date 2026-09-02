import React, { useState, useMemo } from 'react';
import api from '../api/axios';

// Topology of Indian Railway Trunk Corridors and network relationships
const CORRIDOR_NETWORK = [
  {
    corridorId: 'COR-01',
    name: 'Delhi–Mumbai',
    fromStation: 'NDLS',
    toStation: 'CSMT',
    totalKm: 1384,
    dailyTrains: 58,
    // Directly connected via major junction hubs
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
    defaultDelay: 180,
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
    defaultDelay: 120,
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

// Calculation utility computing cascade ripple effect across network corridors
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

    // Status badge determination
    let status = 'NOMINAL';
    if (calculatedDelay >= 90) {
      status = 'CRITICAL_DELAY';
    } else if (calculatedDelay >= 40) {
      status = 'MODERATE_WARNING';
    } else {
      status = 'NOMINAL';
    }

    // Impacted trains calculation based on corridor traffic density and delay hours
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

  // Sort: Primary first, then by delay descending
  corridorResults.sort((a, b) => {
    if (a.tier === 'PRIMARY') return -1;
    if (b.tier === 'PRIMARY') return 1;
    return b.delayMinutes - a.delayMinutes;
  });

  const totalDelayMinutes = corridorResults.reduce((sum, c) => sum + c.delayMinutes, 0);
  const cumulativeDelayHours = parseFloat((totalDelayMinutes / 60).toFixed(1));
  const totalImpactedTrains = corridorResults.reduce((sum, c) => sum + c.impactedTrains, 0);

  // System availability calculation:
  // Baseline is 98.4%. Availability degrades proportionally to total network delay load.
  // 120 corridor-hours = full network 24h capacity (5 corridors * 24h).
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
  const [selectedScenarioId, setSelectedScenarioId] = useState(PREDEFINED_SCENARIOS[0].id);
  const [targetCorridorId, setTargetCorridorId] = useState(PREDEFINED_SCENARIOS[0].defaultCorridor);
  const [delayMinutes, setDelayMinutes] = useState(PREDEFINED_SCENARIOS[0].defaultDelay);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasRun, setHasRun] = useState(true);

  const activeScenario = useMemo(() => {
    return PREDEFINED_SCENARIOS.find(s => s.id === selectedScenarioId) || PREDEFINED_SCENARIOS[0];
  }, [selectedScenarioId]);

  // Handle selecting a scenario card
  const handleSelectScenario = (scenario) => {
    setSelectedScenarioId(scenario.id);
    setTargetCorridorId(scenario.defaultCorridor);
    setDelayMinutes(scenario.defaultDelay);
  };

  // Run simulation handler
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setHasRun(true);

    // Also notify backend if endpoint is responsive
    try {
      await api.post('/simulation/whatif', {
        scenario: activeScenario.type,
        corridorId: targetCorridorId,
        delayMinutes: delayMinutes,
        description: activeScenario.description
      });
    } catch {
      // Graceful fallback to client-side cascade engine
    }

    setTimeout(() => {
      setIsSimulating(false);
    }, 450);
  };

  // Compute cascade metrics live
  const cascadeData = useMemo(() => {
    return computeCascadeImpact(targetCorridorId, delayMinutes);
  }, [targetCorridorId, delayMinutes]);

  const targetCorridorObj = CORRIDOR_NETWORK.find(c => c.corridorId === targetCorridorId);

  return (
    <div className="h-full grid grid-cols-[400px_1fr] gap-4 p-4 overflow-hidden bg-slate-950 text-slate-100">
      
      {/* ── LEFT PANEL: INTERACTIVE SIMULATION CONTROLS ── */}
      <div className="flex flex-col gap-3 h-full overflow-hidden bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="font-mono-rail text-xs font-bold text-slate-200 tracking-wider flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              WHAT-IF SIMULATION ENGINE
            </h2>
            <div className="font-mono-rail text-[9px] text-slate-500 mt-0.5">
              Dynamic network delay cascade & propagation modeling
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
                      <span>Default: {s.defaultCorridor}</span>
                      <span className="text-emerald-400">+{s.defaultDelay}m Base Delay</span>
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
              onChange={(e) => setTargetCorridorId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs p-2.5 rounded font-mono-rail outline-none focus:border-emerald-500 transition-colors"
            >
              {CORRIDOR_NETWORK.map(c => (
                <option key={c.corridorId} value={c.corridorId}>
                  {c.corridorId} — {c.name} ({c.fromStation} ↔ {c.toStation}, {c.totalKm}km)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Delay Slider & Numeric Input */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="font-mono-rail text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Primary Delay Duration
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
                  }}
                  className="w-16 bg-slate-900 border border-slate-700 text-emerald-400 text-right font-mono-rail text-xs font-bold px-2 py-1 rounded outline-none focus:border-emerald-500"
                />
                <span className="font-mono-rail text-[10px] text-slate-500">mins</span>
              </div>
            </div>

            {/* Slider */}
            <div className="flex flex-col gap-1">
              <input
                type="range"
                min="15"
                max="360"
                step="5"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between font-mono-rail text-[8px] text-slate-500 px-0.5">
                <span>15m</span>
                <span>60m (1h)</span>
                <span>180m (3h)</span>
                <span>360m (6h)</span>
              </div>
            </div>

            {/* Quick-select delay preset pills */}
            <div className="flex items-center gap-1.5 pt-1">
              {[30, 60, 120, 180, 240, 360].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDelayMinutes(mins)}
                  className={`flex-1 font-mono-rail text-[9px] py-1 rounded border transition-colors ${
                    delayMinutes === mins
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className={`w-full flex items-center justify-center gap-2 font-mono-rail text-xs font-bold py-3 rounded-lg transition-all shadow-lg ${
              isSimulating
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-emerald-500/20 cursor-pointer'
            }`}
          >
            {isSimulating ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                CALCULATING CASCADE PROPAGATION...
              </>
            ) : (
              <>▶ RUN WHAT-IF CASCADE SIMULATION</>
            )}
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL: SIMULATION RESULTS & CASCADE BREAKDOWN ── */}
      <div className="flex flex-col gap-3 h-full overflow-hidden bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-rail text-xs font-bold text-slate-200">
                CASCADE SIMULATION IMPACT REPORT
              </span>
              <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {activeScenario.name}
              </span>
            </div>
            <div className="font-mono-rail text-[9px] text-slate-500 mt-0.5">
              Primary Epicenter: <span className="text-emerald-400 font-semibold">{targetCorridorId} {targetCorridorObj?.name}</span> (+{delayMinutes}m delay)
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono-rail text-[9px] text-slate-500">
              Rule: 100% Primary → 65% Secondary → 30% Tertiary
            </span>
          </div>
        </div>

        {/* Results Body */}
        {hasRun ? (
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
            
            {/* 1. KPI Summary Cards */}
            <div className="grid grid-cols-4 gap-3 flex-shrink-0">
              
              {/* Card 1: Network Health */}
              <div className="relative bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 overflow-hidden kpi-accent-rd">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                  Network Availability
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono-rail text-xl font-bold text-red-400">
                    {cascadeData.simulatedAvailability}%
                  </span>
                  <span className="font-mono-rail text-[9px] text-slate-500 line-through">
                    {cascadeData.baselineAvailability}%
                  </span>
                </div>
                <div className="font-mono-rail text-[9px] text-red-400/90 mt-1 font-semibold">
                  ▼ {cascadeData.availabilityDelta}% System Drop
                </div>
              </div>

              {/* Card 2: Cumulative Delay Hours */}
              <div className="relative bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 overflow-hidden kpi-accent-am">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                  Cumulative Delay
                </div>
                <div className="font-mono-rail text-xl font-bold text-amber-400">
                  {cascadeData.cumulativeDelayHours} hrs
                </div>
                <div className="font-mono-rail text-[9px] text-slate-500 mt-1">
                  Across 5 network trunks
                </div>
              </div>

              {/* Card 3: Total Impacted Trains */}
              <div className="relative bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 overflow-hidden kpi-accent-bl">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                  Impacted Trains
                </div>
                <div className="font-mono-rail text-xl font-bold text-blue-400">
                  {cascadeData.totalImpactedTrains} services
                </div>
                <div className="font-mono-rail text-[9px] text-slate-500 mt-1">
                  Delayed or regulated
                </div>
              </div>

              {/* Card 4: Propagation Scope */}
              <div className="relative bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 overflow-hidden kpi-accent-vi">
                <div className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                  Propagation Scope
                </div>
                <div className="font-mono-rail text-xl font-bold text-violet-400">
                  {cascadeData.corridorResults.filter(c => c.delayMinutes > 0).length} / 5
                </div>
                <div className="font-mono-rail text-[9px] text-slate-500 mt-1">
                  Corridors impacted
                </div>
              </div>
            </div>

            {/* 2. Network Health Delta Progress Bar */}
            <div className="bg-slate-800/60 border border-slate-800 rounded-xl p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono-rail text-xs font-semibold text-slate-300">
                  NETWORK HEALTH DEGRADATION GAUGE
                </div>
                <div className="font-mono-rail text-xs font-bold text-slate-200">
                  <span className="text-emerald-400">{cascadeData.baselineAvailability}%</span>
                  <span className="text-slate-500 mx-1.5">➔</span>
                  <span className={cascadeData.simulatedAvailability < 80 ? 'text-red-400' : 'text-amber-400'}>
                    {cascadeData.simulatedAvailability}%
                  </span>
                </div>
              </div>

              {/* Dual-bar comparison */}
              <div className="flex flex-col gap-2">
                {/* Simulated bar */}
                <div>
                  <div className="flex justify-between font-mono-rail text-[9px] text-slate-500 mb-1">
                    <span>Simulated State (Under Disruption)</span>
                    <span className={cascadeData.simulatedAvailability < 80 ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>
                      {cascadeData.simulatedAvailability}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        cascadeData.simulatedAvailability < 75
                          ? 'bg-gradient-to-r from-red-600 to-red-400'
                          : cascadeData.simulatedAvailability < 88
                          ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                          : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      }`}
                      style={{ width: `${cascadeData.simulatedAvailability}%` }}
                    />
                  </div>
                </div>

                {/* Baseline bar */}
                <div>
                  <div className="flex justify-between font-mono-rail text-[9px] text-slate-500 mb-1">
                    <span>Baseline Operational Target</span>
                    <span className="text-emerald-500 font-bold">{cascadeData.baselineAvailability}%</span>
                  </div>
                  <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/70 rounded-full"
                      style={{ width: `${cascadeData.baselineAvailability}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Affected Corridors List & Cascade Breakdown */}
            <div className="bg-slate-800/60 border border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-800/80">
                <span className="font-mono-rail text-xs font-semibold text-slate-300">
                  CORRIDOR CASCADE SPREAD & STATUS BREAKDOWN
                </span>
                <span className="font-mono-rail text-[9px] text-slate-500">
                  Mathematical ripple sorted by delay severity
                </span>
              </div>

              {/* Table header */}
              <div
                className="grid gap-2 px-4 py-2 bg-slate-900/80 border-b border-slate-800/80 font-mono-rail text-[8px] text-slate-500 uppercase tracking-wider"
                style={{ gridTemplateColumns: '90px 1fr 140px 100px 90px 130px' }}
              >
                <div>Corridor</div>
                <div>Route & Stations</div>
                <div>Cascade Relationship</div>
                <div className="text-right">Cascaded Delay</div>
                <div className="text-right">Trains Affected</div>
                <div className="text-center">Status</div>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-slate-800/50 overflow-y-auto">
                {cascadeData.corridorResults.map((c) => {
                  const maxDelay = delayMinutes || 1;
                  const delayBarPct = Math.round((c.delayMinutes / maxDelay) * 100);

                  return (
                    <div
                      key={c.corridorId}
                      className={`grid gap-2 px-4 py-3 items-center hover:bg-slate-800/40 transition-colors ${
                        c.tier === 'PRIMARY' ? 'bg-emerald-500/5 border-l-2 border-emerald-500' : ''
                      }`}
                      style={{ gridTemplateColumns: '90px 1fr 140px 100px 90px 130px' }}
                    >
                      {/* Corridor ID */}
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono-rail text-xs font-bold ${
                          c.tier === 'PRIMARY' ? 'text-emerald-400' : 'text-slate-300'
                        }`}>
                          {c.corridorId}
                        </span>
                      </div>

                      {/* Route & Stations */}
                      <div>
                        <div className="font-mono-rail text-[10px] text-slate-200 font-semibold">
                          {c.name}
                        </div>
                        <div className="font-mono-rail text-[8px] text-slate-500">
                          {c.fromStation} ↔ {c.toStation} · {c.totalKm} km · {c.dailyTrains} trains/day
                        </div>
                      </div>

                      {/* Cascade Relationship */}
                      <div>
                        <span className={`font-mono-rail text-[8px] px-2 py-0.5 rounded border font-semibold inline-block ${
                          c.tier === 'PRIMARY'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : c.tier === 'SECONDARY'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-slate-700/40 text-slate-400 border-slate-700'
                        }`}>
                          {c.tier === 'PRIMARY' ? '100% PRIMARY' : c.tier === 'SECONDARY' ? '65% DOWNSTREAM' : '30% TERTIARY'}
                        </span>
                      </div>

                      {/* Cascaded Delay */}
                      <div className="text-right">
                        <div className="font-mono-rail text-xs font-bold text-amber-400">
                          +{c.delayMinutes}m
                        </div>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1 ml-auto" style={{ maxWidth: '70px' }}>
                          <div
                            className={`h-full rounded-full ${
                              c.delayMinutes >= 90 ? 'bg-red-500' : c.delayMinutes >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${delayBarPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Trains Affected */}
                      <div className="text-right font-mono-rail text-xs text-slate-300 font-semibold">
                        {c.impactedTrains} <span className="text-[9px] text-slate-500 font-normal">rakes</span>
                      </div>

                      {/* Status Badge */}
                      <div className="flex justify-center">
                        <span className={`font-mono-rail text-[8px] px-2 py-0.5 rounded-full border font-bold ${
                          c.status === 'CRITICAL_DELAY'
                            ? 'bg-red-500/20 text-red-400 border-red-500/40'
                            : c.status === 'MODERATE_WARNING'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Automated Dispatch Mitigation Plan */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3 flex-shrink-0">
              <div className="text-xl text-emerald-400 mt-0.5">💡</div>
              <div className="flex-1">
                <div className="font-mono-rail text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  AI DISPATCH MITIGATION ADVISORY
                </div>
                <div className="font-mono-rail text-[9px] text-slate-400 leading-relaxed">
                  {activeScenario.mitigation} Secondary corridors ({targetCorridorObj?.secondaryIds.join(', ')}) should immediately institute headway expansion (+4 mins) to absorb cascading arrival delays.
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
            <div className="text-4xl opacity-20">⚙</div>
            <div className="font-mono-rail text-sm text-slate-400 font-semibold">
              Select Disruption Parameters & Run Simulation
            </div>
            <div className="font-mono-rail text-[10px] text-slate-600 max-w-sm">
              Adjust scenario presets, primary corridor, or delay duration on the left to observe cascading network propagation.
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

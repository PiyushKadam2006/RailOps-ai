import React, { useState, useEffect, useRef } from 'react'
import api from '../api/axios'

const LOADING_STEPS = [
  { id: 1, label: 'Fetching defects & blocks from MongoDB...',    pct: 12 },
  { id: 2, label: 'Running priority scoring algorithm...',         pct: 30 },
  { id: 3, label: 'Executing spatial-temporal bundling...',        pct: 58 },
  { id: 4, label: 'Building conflict detection matrix...',         pct: 80 },
  { id: 5, label: 'Compiling optimization report...',              pct: 95 },
  { id: 6, label: 'Complete.',                                     pct: 100 },
]

export default function OptimizationEngine() {
  const [running, setRunning]         = useState(false)
  const [stepIdx, setStepIdx]         = useState(0)
  const [progress, setProgress]       = useState(0)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState(null)
  const [initConflicts, setInitConflicts] = useState([])
  const [activeTab, setActiveTab]     = useState('bundles') // 'bundles' | 'conflicts'
  const [expandedBundle, setExpandedBundle] = useState(null)
  const intervalRef = useRef(null)

  // Load initial conflict data on mount
  useEffect(() => {
    api.get('/optimization/conflicts')
      .then(r => setInitConflicts(r.data ?? []))
      .catch(() => {})
  }, [])

  // Smooth progress interpolation between steps
  function animateToStep(targetStepIdx, onComplete) {
    const step = LOADING_STEPS[targetStepIdx]
    const targetPct = step.pct

    setStepIdx(targetStepIdx)

    // Smooth progress bar animation using requestAnimationFrame
    let current = 0
    if (targetStepIdx > 0) current = LOADING_STEPS[targetStepIdx - 1].pct

    const duration = 300 // ms per step
    const startTime = performance.now()
    const startPct = current

    function tick(now) {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const pct = Math.round(startPct + (targetPct - startPct) * eased)
      setProgress(pct)
      if (t < 1) {
        requestAnimationFrame(tick)
      } else {
        setProgress(targetPct)
        if (onComplete) onComplete()
      }
    }
    requestAnimationFrame(tick)
  }

  async function runOptimization() {
    if (running) return
    setRunning(true)
    setError(null)
    setResult(null)
    setStepIdx(0)
    setProgress(0)
    setActiveTab('bundles')

    // Step 1 & 2: animate locally while API call is in flight
    animateToStep(0, () =>
      animateToStep(1, () =>
        animateToStep(2, null)
      )
    )

    // Fire the real API call
    let apiResult = null
    try {
      const res = await api.post('/optimization/run')
      apiResult = res.data
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Optimization failed')
      setRunning(false)
      setProgress(0)
      setStepIdx(0)
      return
    }

    // Steps 3 → 5: animate to completion
    animateToStep(3, () =>
      animateToStep(4, () =>
        animateToStep(5, () => {
          // Small pause so user sees "Complete." before results render
          setTimeout(() => {
            setResult(apiResult)
            setRunning(false)
          }, 400)
        })
      )
    )
  }

  function PriorityBadge({ value }) {
    const map = {
      CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40',
      HIGH:     'bg-amber-500/20 text-amber-400 border-amber-500/40',
      MEDIUM:   'bg-blue-500/20 text-blue-400 border-blue-500/40',
      LOW:      'bg-slate-500/20 text-slate-400 border-slate-500/40',
    }
    return (
      <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded-full 
                        border font-semibold ${map[value] ?? map.LOW}`}>
        {value}
      </span>
    )
  }

  function SeverityBadge({ value }) {
    const map = {
      HIGH:   'bg-red-500/20 text-red-400 border-red-500/40',
      MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      LOW:    'bg-blue-500/20 text-blue-400 border-blue-500/40',
    }
    return (
      <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded-full 
                        border font-semibold ${map[value] ?? map.LOW}`}>
        {value}
      </span>
    )
  }

  function ScoreBar({ score }) {
    const color = score > 80 ? 'bg-red-500'
                : score > 60 ? 'bg-amber-500'
                : score > 40 ? 'bg-blue-500'
                : 'bg-slate-500'
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-700 rounded-full h-1">
          <div
            className={`h-1 rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`font-mono-rail text-[9px] font-bold w-6 text-right ${
          score > 80 ? 'text-red-400'
          : score > 60 ? 'text-amber-400'
          : score > 40 ? 'text-blue-400'
          : 'text-slate-500'
        }`}>{score}</span>
      </div>
    )
  }

  function formatTime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit'
    })
  }

  function formatDateTime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const PIPELINE_STAGES = [
    {
      id: 'input',
      label: 'Input Data',
      sub: 'Defects, Trains, Blocks',
      icon: '⬇',
      color: 'border-slate-600 text-slate-300',
      activeColor: 'border-emerald-500 text-emerald-400 bg-emerald-500/5',
      stepRange: [0, 1]
    },
    {
      id: 'scoring',
      label: 'Priority Scoring',
      sub: 'Heuristic + ML weighting',
      icon: '◉',
      color: 'border-slate-600 text-slate-300',
      activeColor: 'border-blue-500 text-blue-400 bg-blue-500/5',
      stepRange: [1, 2]
    },
    {
      id: 'bundling',
      label: 'Bundling',
      sub: 'Spatial-temporal grouping',
      icon: '⬡',
      color: 'border-slate-600 text-slate-300',
      activeColor: 'border-violet-500 text-violet-400 bg-violet-500/5',
      stepRange: [2, 3]
    },
    {
      id: 'conflict',
      label: 'Conflict Detection',
      sub: 'Schedule overlap checks',
      icon: '⚠',
      color: 'border-slate-600 text-slate-300',
      activeColor: 'border-red-500 text-red-400 bg-red-500/5',
      stepRange: [3, 4]
    },
    {
      id: 'generation',
      label: 'Generation',
      sub: 'Block window scheduling',
      icon: '◈',
      color: 'border-slate-600 text-slate-300',
      activeColor: 'border-amber-500 text-amber-400 bg-amber-500/5',
      stepRange: [4, 5]
    },
    {
      id: 'output',
      label: 'Output',
      sub: 'Optimized plan',
      icon: '✓',
      color: 'border-slate-600 text-slate-300',
      activeColor: 'border-emerald-500 text-emerald-400 bg-emerald-500/5',
      stepRange: [5, 6]
    },
  ]

  const displayConflicts = result?.conflictMatrix ?? initConflicts
  const bundles          = result?.intelligentBundles ?? []
  const summary          = result?.summary ?? null
  const meta             = result?.meta ?? null
  const scoreDist        = result?.scoreDistribution ?? null

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-4">

      {/* ── PIPELINE HEADER ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">

        {/* Title + Run button */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <div>
            <div className="font-mono-rail text-sm font-bold text-slate-200 tracking-wide">
              AI/ML OPTIMIZATION ENGINE
            </div>
            <div className="font-mono-rail text-[9px] text-slate-500 mt-0.5">
              Heuristic priority scoring · Spatial-temporal bundling · Conflict detection
            </div>
          </div>
          <button
            onClick={runOptimization}
            disabled={running}
            className={`flex items-center gap-2 font-mono-rail text-xs font-bold 
                        px-5 py-2.5 rounded-lg transition-all
                        ${running
                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer'
                        }`}
          >
            {running ? (
              <>
                {/* Spinner */}
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                RUNNING...
              </>
            ) : (
              <>▶ RUN OPTIMIZATION</>
            )}
          </button>
        </div>

        {/* Pipeline stage boxes */}
        <div className="flex items-stretch p-4 gap-0">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isActive  = running && stepIdx >= stage.stepRange[0] && stepIdx < stage.stepRange[1] + 1
            const isDone    = (running && stepIdx > stage.stepRange[1]) || (!running && result && idx < 6)
            const baseStyle = 'flex-1 border rounded-lg p-3 text-center transition-all duration-300'
            const style     = isDone
              ? 'border-emerald-700/60 text-emerald-400 bg-emerald-500/5'
              : isActive
              ? stage.activeColor
              : stage.color

            return (
              <React.Fragment key={stage.id}>
                <div className={`${baseStyle} ${style}`}>
                  <div className="text-lg mb-1 opacity-70">{stage.icon}</div>
                  <div className="font-mono-rail text-[10px] font-semibold leading-tight">
                    {stage.label}
                  </div>
                  <div className="font-mono-rail text-[8px] text-slate-500 mt-0.5 leading-tight">
                    {stage.sub}
                  </div>
                  {isDone && (
                    <div className="font-mono-rail text-[8px] text-emerald-500 mt-1">✓ done</div>
                  )}
                  {isActive && (
                    <div className="font-mono-rail text-[8px] text-current mt-1 animate-pulse">
                      running...
                    </div>
                  )}
                </div>
                {/* Arrow connector — not after last */}
                {idx < PIPELINE_STAGES.length - 1 && (
                  <div className="flex items-center px-1 flex-shrink-0">
                    <div className={`font-mono-rail text-sm transition-colors ${
                      (running && stepIdx > stage.stepRange[1]) || (!running && result)
                        ? 'text-emerald-600'
                        : 'text-slate-700'
                    }`}>▶</div>
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* ── MULTI-STEP LOADING BAR ── only visible while running */}
        {running && (
          <div className="px-5 pb-4 flex flex-col gap-2">
            {/* Step label */}
            <div className="flex items-center justify-between">
              <span className="font-mono-rail text-[10px] text-emerald-400 animate-pulse">
                {LOADING_STEPS[Math.min(stepIdx, LOADING_STEPS.length - 1)].label}
              </span>
              <span className="font-mono-rail text-[10px] text-slate-500">
                {progress}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 
                           rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Step dots */}
            <div className="flex items-center gap-1.5 mt-1">
              {LOADING_STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i < stepIdx
                      ? 'bg-emerald-500 flex-1'
                      : i === stepIdx
                      ? 'bg-emerald-400 flex-1 animate-pulse'
                      : 'bg-slate-700 flex-1'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── POST-RUN META ROW ── */}
        {!running && meta && (
          <div className="px-5 py-2 border-t border-slate-700 flex items-center gap-6">
            <span className="font-mono-rail text-[9px] text-emerald-500">
              ✓ OPTIMIZATION COMPLETE
            </span>
            <span className="font-mono-rail text-[9px] text-slate-500">
              {meta.defectsScored} defects scored
            </span>
            <span className="font-mono-rail text-[9px] text-slate-500">
              {meta.blocksAnalyzed} blocks analyzed
            </span>
            <span className="font-mono-rail text-[9px] text-amber-400">
              {meta.totalTimeSavedHrs}h saved via bundling
            </span>
            <span className="font-mono-rail text-[9px] text-slate-600 ml-auto">
              {meta.processingMs}ms
            </span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="px-5 py-3 border-t border-red-800/40 bg-red-900/10 
                          font-mono-rail text-[10px] text-red-400">
            ✕ Engine error: {error}
          </div>
        )}
      </div>

      {/* ── SUMMARY STAT CARDS — only after run ── */}
      {summary && scoreDist && (
        <div className="grid grid-cols-4 gap-3">
          {[
            {
              label: 'BUNDLES CREATED',
              value: summary.bundlesCreated,
              sub: `${summary.singleItemBlocks} single-item`,
              color: 'text-violet-400',
              accent: 'kpi-accent-vi'
            },
            {
              label: 'CONFLICTS FOUND',
              value: summary.conflictsFound,
              sub: `${summary.highSeverity} HIGH severity`,
              color: 'text-red-400',
              accent: 'kpi-accent-rd'
            },
            {
              label: 'TIME SAVED',
              value: `${meta.totalTimeSavedHrs}h`,
              sub: 'via intelligent bundling',
              color: 'text-emerald-400',
              accent: 'kpi-accent-em'
            },
            {
              label: 'DEFECTS SCORED',
              value: meta.defectsScored,
              sub: `${scoreDist.CRITICAL} CRITICAL · ${scoreDist.HIGH} HIGH`,
              color: 'text-amber-400',
              accent: 'kpi-accent-am'
            },
          ].map(c => (
            <div key={c.label}
              className={`relative bg-slate-800 border border-slate-700 rounded-xl p-4 
                          overflow-hidden ${c.accent}`}>
              <div className="font-mono-rail text-[9px] uppercase tracking-widest 
                              text-slate-500 mb-1">{c.label}</div>
              <div className={`font-mono-rail text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="font-mono-rail text-[9px] text-slate-500 mt-1">{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── SCORE DISTRIBUTION — only after run ── */}
      {scoreDist && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="font-mono-rail text-xs font-semibold text-slate-300 mb-3 tracking-wide">
            PRIORITY SCORE DISTRIBUTION
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label:'CRITICAL', count: scoreDist.CRITICAL, color:'bg-red-500',    textColor:'text-red-400'    },
              { label:'HIGH',     count: scoreDist.HIGH,     color:'bg-amber-500',  textColor:'text-amber-400'  },
              { label:'MEDIUM',   count: scoreDist.MEDIUM,   color:'bg-blue-500',   textColor:'text-blue-400'   },
              { label:'LOW',      count: scoreDist.LOW,      color:'bg-slate-500',  textColor:'text-slate-400'  },
            ].map(({ label, count, color, textColor }) => {
              const total = Object.values(scoreDist).reduce((s, v) => s + v, 0) || 1
              const pct   = Math.round((count / total) * 100)
              return (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-mono-rail text-[9px] text-slate-500">{label}</span>
                    <span className={`font-mono-rail text-[10px] font-bold ${textColor}`}>
                      {count}
                    </span>
                  </div>
                  <div className="bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-700 ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="font-mono-rail text-[8px] text-slate-600 mt-0.5 text-right">
                    {pct}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MAIN RESULTS: TABS ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex-1 min-h-0">

        {/* Tab bar */}
        <div className="flex items-center border-b border-slate-700 px-4 gap-0">
          {[
            {
              id: 'bundles',
              label: 'INTELLIGENT BLOCK BUNDLING',
              count: bundles.filter(b => !b.isSingleItem).length
            },
            {
              id: 'conflicts',
              label: 'CONFLICT MATRIX',
              count: displayConflicts.length
            },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-mono-rail text-[10px] font-semibold px-4 py-3 border-b-2 
                          transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                tab.id === 'conflicts' && tab.count > 0
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── TAB: BUNDLES ── */}
        {activeTab === 'bundles' && (
          <div className="p-4 overflow-y-auto" style={{ maxHeight: '420px' }}>
            {!result ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="text-2xl opacity-20">⊘</div>
                <div className="font-mono-rail text-[10px] text-slate-600">
                  Run optimization to generate bundles
                </div>
              </div>
            ) : bundles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="font-mono-rail text-[10px] text-emerald-500">
                  ✓ No bundling opportunities — all defects are unique
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Multi-item bundles first */}
                {bundles.filter(b => !b.isSingleItem).map(bundle => (
                  <div
                    key={bundle.bundleId}
                    className="border border-violet-500/30 bg-violet-500/5 rounded-xl 
                               overflow-hidden cursor-pointer hover:border-violet-500/50 
                               transition-all"
                    onClick={() => setExpandedBundle(
                      expandedBundle === bundle.bundleId ? null : bundle.bundleId
                    )}
                  >
                    {/* Bundle header */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="font-mono-rail text-[9px] px-2 py-0.5 rounded-full 
                                        bg-violet-500/20 text-violet-400 border border-violet-500/30">
                          BUNDLE
                        </div>
                        <div>
                          <div className="font-mono-rail text-xs font-bold text-slate-200">
                            {bundle.bundleId}
                          </div>
                          <div className="font-mono-rail text-[9px] text-slate-500">
                            {bundle.corridorId} · {bundle.department}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Efficiency badge */}
                        <div className="text-right">
                          <div className="font-mono-rail text-[8px] text-slate-500">
                            EFFICIENCY GAIN
                          </div>
                          <div className="font-mono-rail text-sm font-bold text-emerald-400">
                            +{bundle.efficiencyPct}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono-rail text-[8px] text-slate-500">
                            TIME SAVED
                          </div>
                          <div className="font-mono-rail text-sm font-bold text-amber-400">
                            {bundle.timeSavedHrs}h
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono-rail text-[8px] text-slate-500">
                            TASKS
                          </div>
                          <div className="font-mono-rail text-sm font-bold text-violet-400">
                            {bundle.defectCount}
                          </div>
                        </div>
                        <div className="font-mono-rail text-[10px] text-slate-600">
                          {expandedBundle === bundle.bundleId ? '▲' : '▼'}
                        </div>
                      </div>
                    </div>

                    {/* Suggested window */}
                    <div className="px-4 pb-2 flex items-center gap-4">
                      <div className="font-mono-rail text-[9px] text-slate-500">
                        WINDOW:
                      </div>
                      <div className="font-mono-rail text-[9px] text-cyan-400">
                        {formatDateTime(bundle.suggestedWindowStart)}
                        {' → '}
                        {formatDateTime(bundle.suggestedWindowEnd)}
                      </div>
                      <div className="font-mono-rail text-[9px] text-slate-500">
                        ({bundle.totalDurationHrs}h block vs {bundle.sequentialDurationHrs}h sequential)
                      </div>
                    </div>

                    {/* Expanded: defect list */}
                    {expandedBundle === bundle.bundleId && (
                      <div className="border-t border-violet-500/20 px-4 py-3">
                        <div className="font-mono-rail text-[8px] text-slate-500 mb-2 uppercase">
                          Bundled Defects
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {bundle.defects.map((d, i) => (
                            <div key={i}
                              className="flex items-center gap-3 bg-slate-900/60 
                                         rounded-lg px-3 py-2">
                              <span className="font-mono-rail text-[9px] text-emerald-400 
                                               font-bold w-24 truncate">
                                {d.defectCode}
                              </span>
                              <span className="font-mono-rail text-[9px] text-slate-400 w-20">
                                {d.assetId}
                              </span>
                              <PriorityBadge value={d.priority} />
                              <div className="flex-1">
                                <ScoreBar score={d.score} />
                              </div>
                              <span className="font-mono-rail text-[8px] text-slate-500 
                                               w-10 text-right">
                                {d.estimatedDurationHrs}h
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Single-item blocks — collapsed list */}
                {bundles.filter(b => b.isSingleItem).length > 0 && (
                  <div className="border border-slate-700/50 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-slate-700/20 flex items-center justify-between">
                      <span className="font-mono-rail text-[9px] text-slate-500">
                        STANDALONE DEFECTS (no bundling opportunity)
                      </span>
                      <span className="font-mono-rail text-[9px] text-slate-500">
                        {bundles.filter(b => b.isSingleItem).length} items
                      </span>
                    </div>
                    <div className="divide-y divide-slate-700/30">
                      {bundles.filter(b => b.isSingleItem).map(bundle => (
                        <div key={bundle.bundleId}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-slate-700/20">
                          <span className="font-mono-rail text-[9px] text-slate-500 w-24">
                            {bundle.bundleId}
                          </span>
                          <span className="font-mono-rail text-[9px] text-slate-400 w-16">
                            {bundle.corridorId}
                          </span>
                          <span className="font-mono-rail text-[9px] text-slate-400 flex-1">
                            {bundle.department}
                          </span>
                          <PriorityBadge value={bundle.defects[0]?.priority} />
                          <span className="font-mono-rail text-[9px] text-slate-500 w-16 text-right">
                            {bundle.defects[0]?.assetId}
                          </span>
                          <div className="w-24">
                            <ScoreBar score={bundle.defects[0]?.score ?? 0} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: CONFLICT MATRIX ── */}
        {activeTab === 'conflicts' && (
          <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
            {displayConflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="text-2xl opacity-20">⊘</div>
                <div className="font-mono-rail text-[10px] text-slate-600">
                  {result
                    ? '✓ No scheduling conflicts detected'
                    : 'Run optimization to detect conflicts'}
                </div>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="grid gap-3 px-4 py-2 border-b border-slate-700 sticky top-0 
                                bg-slate-800 z-10"
                  style={{ gridTemplateColumns: '120px 1fr 160px 160px 80px 80px 1fr' }}>
                  {['CONFLICT ID','TYPE','BLOCK A','BLOCK B','OVERLAP','SEVERITY','RECOMMENDATION']
                    .map(h => (
                      <div key={h} className="font-mono-rail text-[8px] text-slate-500 
                                              uppercase tracking-wide">
                        {h}
                      </div>
                    ))
                  }
                </div>
                {/* Table rows */}
                <div className="divide-y divide-slate-700/30">
                  {displayConflicts.map((c, idx) => (
                    <div
                      key={c.conflictId ?? idx}
                      className={`grid gap-3 px-4 py-3 items-center transition-colors
                                  hover:bg-slate-700/30 ${
                        c.severity === 'HIGH' ? 'bg-red-900/5' : ''
                      }`}
                      style={{ gridTemplateColumns: '120px 1fr 160px 160px 80px 80px 1fr' }}
                    >
                      {/* Conflict ID */}
                      <div className="font-mono-rail text-[9px] text-red-400 font-bold">
                        {c.conflictId ?? `CONF-${String(idx+1).padStart(3,'0')}`}
                      </div>

                      {/* Type */}
                      <div className="font-mono-rail text-[9px]">
                        <span className={`px-1.5 py-0.5 rounded border text-[8px] ${
                          c.type === 'ASSET_DEPT_CONFLICT' || c.type === 'ASSET_CONFLICT'
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}>
                          {c.type ?? 'TRAIN_OVERLAP'}
                        </span>
                      </div>

                      {/* Block A */}
                      <div>
                        <div className="font-mono-rail text-[9px] text-slate-300">
                          {c.blockA?.id ?? c.blockId ?? '—'}
                        </div>
                        <div className="font-mono-rail text-[8px] text-slate-600">
                          {c.blockA?.assetId} · {c.blockA?.corridorId}
                        </div>
                        {c.blockA?.startTime && (
                          <div className="font-mono-rail text-[8px] text-slate-600">
                            {formatTime(c.blockA.startTime)}–{formatTime(c.blockA.endTime)}
                          </div>
                        )}
                      </div>

                      {/* Block B */}
                      <div>
                        <div className="font-mono-rail text-[9px] text-slate-300">
                          {c.blockB?.id ?? '—'}
                        </div>
                        <div className="font-mono-rail text-[8px] text-slate-600">
                          {c.blockB?.assetId} · {c.blockB?.corridorId}
                        </div>
                        {c.blockB?.startTime && (
                          <div className="font-mono-rail text-[8px] text-slate-600">
                            {formatTime(c.blockB.startTime)}–{formatTime(c.blockB.endTime)}
                          </div>
                        )}
                      </div>

                      {/* Overlap duration */}
                      <div className="font-mono-rail text-[9px] text-amber-400">
                        {c.overlapMinutes != null
                          ? `${c.overlapMinutes}m`
                          : '—'}
                      </div>

                      {/* Severity badge */}
                      <div>
                        <SeverityBadge value={c.severity ?? 'MEDIUM'} />
                      </div>

                      {/* Recommendation */}
                      <div className="font-mono-rail text-[8px] text-slate-500 leading-relaxed">
                        {c.recommendation ?? c.description ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

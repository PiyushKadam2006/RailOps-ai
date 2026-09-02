# Implementation Plan: AI-Assisted Constraint-Aware Automatic Block Planning for Indian Railways

## Executive Summary
This implementation plan outlines the incremental upgrade of the existing RailOps-ai prototype into an **Explainable, AI-Assisted Constraint-Aware Automatic Block Planning System**.

The upgrade preserves all working functionality, existing styling, and codebase architecture while introducing:
1. Multi-department block consolidation (**Track + Signalling + Traction** coordinated in 1 block).
2. Deterministic synthetic datasets for **Train Timetable**, **Freight Forecast**, and **Corridor Block Windows**.
3. Reusable **Constraint Engine** (`backend/engine/constraintEngine.js`).
4. **Candidate Window Generation & Scoring Engine** (`windowGenerator.js`, `windowScorer.js`).
5. Explainable **Weighted Priority Scoring** with component breakdowns.
6. Transparent **"Why this block?"** backend explainability generator.
7. Calculated **Before vs. After Comparison** (Baseline vs. Optimized Asset Availability, Block Hours, Train Impacts, Conflicts, Utilization).
8. Real **What-If Simulation Re-Optimizer** generating alternative candidate windows upon disruption.
9. Golden Demo Scenario on **COR-01 (Delhi–Mumbai)** demonstrating deterministic 3-department consolidation into a single coordinated block window.

---

## Current Architecture & Analysis

### 1. Existing Data Models (`backend/models/`)
- `Defect.js`: Schema with `defectCode`, `assetId`, `department` (`Traction`, `Signalling`, `Track`, `Rolling Stock`, `Infrastructure`, `Electrical`), `source` (`TMS`, `SMMS`, `TDMS`, `BDMS`, `COA`), `faultDescription`, `priority` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `priorityScore`, `status`, `corridorId`, `estimatedDurationHrs`.
- `Block.js`: Schema with `blockCode`, `assetId`, `corridorId`, `department`, `startTime`, `endTime`, `status`, `bundledDefects`, `conflictFlags`, `trainImpact`, `linkedDefectId`.
- `Corridor.js`: Trunk routes (`COR-01` to `COR-05`) with stations and total km.
- `TrainSchedule.js`: Train numbers, types (`Express`, `Passenger`, `Goods`, `Mail`), departure/arrival times, priority.

### 2. Existing API Endpoints (`backend/routes/` & `backend/controllers/`)
- `GET/POST /api/defects`, `PUT /api/defects/:id`
- `GET/POST /api/blocks`, `PUT /api/blocks/:id`, `GET /api/blocks/today-tomorrow`
- `GET /api/corridors`
- `GET /api/schedules`
- `POST /api/optimization/run`, `GET /api/optimization/conflicts`
- `POST /api/simulation/what-if`, `GET /api/simulation/scenarios`
- `GET /api/integration/metrics`

### 3. Current Strengths
- Working MERN stack with Dark Industrial Velocity operations aesthetic.
- Native 24-hour timeline with visual heatmaps, interactive 1-click modal auto-resolution, and 3-day operational audit window.
- Centralized `RailOpsContext` with real-time cross-page synchronization.
- Working approval pipeline, history audit trail, dynamic data integration page, and department maintenance request portal.

### 4. Current Weaknesses & Gaps
- **Single-department bundling**: Bundling currently groups strictly by `corridorId + department`. It does not coordinate multi-department tasks (e.g. Track + Signalling + Traction).
- **Static timing**: Block proposals start at an arbitrary `now + 2h` rather than evaluating feasible corridor windows.
- **Disconnected constraints**: Train timetable and freight movements are not checked as constraint boundaries before selecting candidate windows.
- **Simplistic priority score**: Priority score lacks weighted component breakdowns (criticality, urgency, asset availability impact, train impact, overdue risk).
- **No candidate window exploration**: The system creates a single schedule rather than evaluating and scoring multiple candidates.
- **Simulation shifting**: What-if simulation shifts blocks by a static `delayMinutes + 30` rather than invalidating conflicting windows and re-optimizing with alternative feasible windows.
- **Lack of explainability**: No backend-generated "Why this block?" rationale.

---

## Proposed Changes

### Component 1: Data Models & Deterministic Synthetic Data

#### [NEW] `backend/models/FreightForecast.js`
- Schema: `corridorId`, `date`, `windowStart`, `windowEnd`, `expectedFreightTrains`, `forecastConfidence`, `trafficLevel` (`LOW`, `MEDIUM`, `HIGH`).

#### [NEW] `backend/models/BlockWindow.js`
- Schema: `corridorId`, `date`, `startTime`, `endTime`, `available`, `safetyBufferMinutes`, `trafficLevel`.

#### [NEW] `backend/data/timetableData.js`
- Deterministic timetable data for all 5 corridors, especially `COR-01` (Delhi–Mumbai), featuring passenger expresses (12951, 12952, 12953, 12954) and goods/freight movements (GDS-401, GDS-402, GDS-403) with precise headway windows.

#### [NEW] `backend/data/freightForecastData.js`
- Deterministic synthetic freight forecast across time slices (e.g., 00:00–04:00 LOW, 04:00–08:00 LOW, 08:00–12:00 HIGH, 12:00–16:00 MEDIUM, 16:00–20:00 HIGH, 20:00–24:00 MEDIUM).

#### [NEW] `backend/data/blockWindowsData.js`
- Corridor maintenance allowances and white-space availability windows (e.g., COR-01 nighttime window 01:30–07:30, midday window 12:30–16:30).

#### [MODIFY] `backend/seed/seed.js`
- Populate deterministic golden demo defects on `COR-01`:
  - `DEF-0101`: Track, Critical, 4 hrs (Ultrasonic rail flaw, KP 142)
  - `DEF-0102`: Signalling, High, 2 hrs (Point machine inspection, KP 142)
  - `DEF-0103`: Traction, High, 2 hrs (OHE contact wire droppers, KP 142)
- Populate deterministic train timetable, freight forecasts, and corridor windows.
- Ensure golden demo data is deterministic and reproducible.

---

### Component 2: Optimization Engines (`backend/engine/`)

#### [MODIFY] `backend/engine/priorityScorer.js`
- Implement explainable weighted scoring:
  $$\text{priorityScore} = 0.35 \times \text{criticality} + 0.25 \times \text{urgency} + 0.20 \times \text{assetAvailabilityImpact} + 0.10 \times \text{trainImpact} + 0.10 \times \text{overdueRisk}$$
- Normalized to 0–100.
- Returns `{ totalScore, breakdown: { criticality, urgency, assetAvailabilityImpact, trainImpact, overdueRisk } }`.

#### [NEW] `backend/engine/constraintEngine.js`
- Reusable constraint validator:
  1. Corridor availability check (matches allowed block windows).
  2. Maintenance duration check (task duration + safety buffer $\le$ window length).
  3. Safety buffer compliance (minimum 20-minute clearance before and after).
  4. Passenger train overlap check (identifies overlapping Express/Passenger services).
  5. Freight train overlap check (evaluates expected freight trains and traffic level).
  6. Existing block overlap check (detects conflicting concurrent maintenance).
  7. Same-asset conflict check (prevents double-booking of rolling stock/locomotives).
  8. Department/resource conflict check.
  9. Maximum block duration cap (e.g., max 8 hours).
- Returns: `{ feasible: boolean, scorePenalty: number, violations: string[], warnings: string[], passengerImpact: number, freightImpact: number, affectedTrains: Array }`.

#### [NEW] `backend/engine/windowGenerator.js`
- Generates 4–6 candidate windows across the planning horizon for a given corridor and bundled duration (e.g. Candidate 1: 01:00–05:00, Candidate 2: 02:00–06:00, Candidate 3: 07:00–11:00, Candidate 4: 12:30–16:30, Candidate 5: 22:00–02:00).

#### [NEW] `backend/engine/windowScorer.js`
- Evaluates candidate windows using explainable composite formula:
  $$\text{candidateScore} = \text{priorityBenefit} + \text{bundlingBenefit} + \text{lowTrafficBenefit} + \text{assetAvailabilityBenefit} - \text{passengerTrainPenalty} - \text{freightPenalty} - \text{conflictPenalty} - \text{fragmentationPenalty}$$
- Selects the highest-scoring feasible candidate window.

#### [MODIFY] `backend/engine/blockBundler.js`
- Upgrade to **Multi-Department Consolidation**:
  - Identifies compatible tasks on the same corridor / spatial proximity (e.g., Track + Signalling + Traction).
  - Bundles them into a single coordinated block.
  - Computes shared protection savings:
    $$\text{Separate Duration} = D_1 + D_2 + D_3 + 3 \times \text{Protection}$$
    $$\text{Bundled Duration} = \max(D_1, D_2, D_3) + \text{Shared Protection}$$
  - Returns consolidated bundle metadata and savings calculations.

#### [NEW] `backend/engine/availabilityCalculator.js`
- Computes baseline vs. optimized asset availability:
  $$\text{Availability} = 1 - \frac{\text{downtimeHours}}{\text{planningHorizonHours}}$$
- Calculates:
  - Baseline Availability % (sequential individual blocks).
  - Optimized Availability % (consolidated coordinated block).
  - Net Percentage Point Gain (e.g., +4.6%).
  - Block utilization: $\frac{\text{maintenanceHoursInsideBlock}}{\text{totalBlockDuration}}$.

#### [MODIFY] `backend/engine/reoptimizer.js`
- Replaces static minute shifting with full constraint-aware re-optimization:
  - In response to disruption: identifies affected corridor, invalidated blocks, and delayed trains.
  - Generates alternative candidate windows outside the disruption window.
  - Re-evaluates constraints and scores alternatives.
  - Produces a revised feasible block plan with comparison metrics.

---

### Component 3: Backend Controller & Routes

#### [MODIFY] `backend/controllers/optimizationController.js`
- Upgrades `runOptimization` to return:
  - `planId`: Unique plan ID (e.g. `PLAN-2026-09-03-01`).
  - `planningHorizon`: `Today`, `7 Days`, or `30 Days`.
  - `baselineMetrics`: Total block hours, downtime, train impact, conflicts, availability (e.g. 91.8%), utilization.
  - `optimizedMetrics`: Total block hours, downtime, train impact, conflicts, availability (e.g. 96.4%), utilization.
  - `availabilityGain`: e.g. `+4.6%`.
  - `bundles`: Multi-department consolidated bundles (`Track + Signalling + Traction`).
  - `candidateWindows`: All generated candidates with evaluation details, penalties, and feasibility.
  - `selectedWindow`: The winning candidate window.
  - `explanations`: "Why this block?" bullet points.
  - `conflictMatrix`: Before vs After conflict comparison.
- Adds endpoint handlers:
  - `GET /api/optimization/plans`
  - `GET /api/optimization/plans/:id`
  - `POST /api/optimization/plans/:id/approve`

#### [MODIFY] `backend/controllers/simulationController.js`
- Upgrades `runWhatIf` to execute the true re-optimization pipeline with revised candidate window selection and before/after impact comparison.

---

### Component 4: Frontend UI Enhancements

#### [MODIFY] `frontend/src/pages/OptimizationEngine.jsx`
- Add Planning Horizon selector (`Today`, `7 Days`, `30 Days`).
- Add **Before vs. After Plan Comparison Card**:
  - Baseline vs. Optimized Block Hours, Train Impacts, Conflicts, Utilization, and Availability (e.g., 91.8% $\rightarrow$ 96.4%, +4.6%).
- Add **Candidate Windows Evaluation Panel**:
  - Interactive table/list of evaluated candidate windows showing: Window Times, Feasibility Badge, Passenger Overlap, Freight Forecast, Composite Score, and "SELECTED" marker.
- Add **Multi-Department Consolidation Badge**:
  - Distinct badge highlighting `Track + Signalling + Traction Coordinated (3 departments consolidated into 1 corridor block)`.
- Add **"Why this block?" Explainability Drawer / Card**:
  - Displays backend-generated bullet points justifying the selection.
- Add "Approve & Commit Plan to Schedule" action button.

#### [MODIFY] `frontend/src/pages/Dashboard.jsx`
- Add an "Asset Availability & Optimization Delta" KPI card:
  - Displays current Baseline vs. Optimized network availability.
- Ensure all KPI numbers derive consistently from the shared context and backend.

#### [MODIFY] `frontend/src/pages/DataIntegration.jsx`
- Ensure data source tabs consistently display all 7 sources:
  1. TMS (Track Management)
  2. SMMS (Signal Maintenance)
  3. TDMS (Traction Distribution)
  4. BDMS (Block Disconnection)
  5. COA (Control Office Operations)
  6. Train Timetable (Passenger & Goods Schedules)
  7. Freight Forecast (COA / Goods Traffic Predictions)
- Display synthetic data label: *"Synthetic / simulated data for prototype demonstration"*.

#### [MODIFY] `frontend/src/pages/WhatIfSimulation.jsx`
- Add **"Re-optimize Plan"** button that invokes the true re-optimization backend route.
- Show Invalidated Window $\rightarrow$ Alternative Candidate Windows $\rightarrow$ Revised Selected Window.
- Display Before vs. After re-optimization delta.

#### [MODIFY] `frontend/src/pages/ApprovalPipeline.jsx`
- Display the consolidated block recommendation with:
  - Multi-department tasks (`DEF-0101`, `DEF-0102`, `DEF-0103`).
  - Candidate window score breakdown.
  - "Why this block?" explainability summary.
  - One-click approval that writes the approved block to the schedule.

#### [MODIFY] `frontend/src/pages/History.jsx`
- Display plan versions with:
  - Plan ID, Corridor, Departments consolidated.
  - Original window vs. Optimized window.
  - Hours saved and Availability improvement.
  - Status and audit state.

---

## Step-by-Step Execution Order

1. **Step 1: Synthetic Datasets & Mongoose Models**
   - Create `backend/data/timetableData.js`, `backend/data/freightForecastData.js`, `backend/data/blockWindowsData.js`.
   - Create `backend/models/FreightForecast.js`, `backend/models/BlockWindow.js`.
   - Update `backend/seed/seed.js` to seed the deterministic Golden Demo defects (`DEF-0101`, `DEF-0102`, `DEF-0103`) and synthetic datasets.
2. **Step 2: Core Optimization Engines**
   - Implement `backend/engine/priorityScorer.js` (weighted breakdown).
   - Implement `backend/engine/constraintEngine.js` (passenger, freight, corridor, safety buffers).
   - Implement `backend/engine/windowGenerator.js` & `backend/engine/windowScorer.js`.
   - Implement `backend/engine/blockBundler.js` (multi-department consolidation).
   - Implement `backend/engine/availabilityCalculator.js`.
   - Implement `backend/engine/reoptimizer.js`.
3. **Step 3: Backend Controller & API Integration**
   - Update `backend/controllers/optimizationController.js` and `backend/routes/optimization.js`.
   - Update `backend/controllers/simulationController.js` and `backend/routes/simulation.js`.
   - Mount new models and routes in `backend/server.js`.
4. **Step 4: Frontend Optimization Engine Page (`OptimizationEngine.jsx`)**
   - Before vs. After comparison card.
   - Candidate windows evaluation table.
   - Multi-department consolidation display.
   - "Why this block?" explainability panel.
   - Planning horizon selector.
5. **Step 5: Frontend What-If Re-Optimization (`WhatIfSimulation.jsx`)**
   - Wire "Re-optimize Plan" button to backend re-optimization API.
   - Display alternative window evaluation and revised plan.
6. **Step 6: Frontend Data Integration, Dashboard, Approval & History Sync**
   - Update `DataIntegration.jsx` (7 data sources, synthetic disclaimer).
   - Update `Dashboard.jsx` (Availability KPI delta).
   - Update `ApprovalPipeline.jsx` (consolidated multi-dept block reasoning).
   - Update `History.jsx` (plan versions and availability gains).
7. **Step 7: Verification & Golden Demo Flow Walkthrough**
   - Execute browser subagent testing across all 8 presentation steps.
   - Confirm 0 console errors and clean build.

---

## Verification Plan

### Automated Verification
- Backend endpoint testing:
  - `node backend/seed/seed.js` (seeds deterministic datasets).
  - `POST /api/optimization/run` (verifies candidate windows, scoring breakdown, availability gain, multi-dept bundle).
  - `POST /api/simulation/what-if` (verifies re-optimization returns alternative window and revised plan).
- Frontend production build:
  - `npm.cmd run build` inside `frontend`.

### Manual Browser Subagent Testing (Golden Demo Flow)
1. **Step 1 — Dashboard**: Verify current workload, asset availability KPI, and traffic context.
2. **Step 2 — Data Integration**: Verify all 7 sources (TMS, SMMS, TDMS, BDMS, COA, Timetable, Freight Forecast) and synthetic data disclaimer.
3. **Step 3 — Optimization Engine**:
   - Click "Run Optimization".
   - Verify animated pipeline execution.
   - Verify Before vs. After metrics (e.g., 91.8% $\rightarrow$ 96.4% availability, 0 conflicts).
   - Verify Candidate Windows table with scores and selected marker.
   - Verify Multi-Department Consolidated Block (`Track + Signalling + Traction`).
   - Verify "Why this block?" explainability reasons.
4. **Step 4 — Approval Pipeline**:
   - Inspect consolidated multi-department block and approve.
5. **Step 5 — What-If Simulation**:
   - Trigger Track Emergency on `COR-01`.
   - Click "Re-optimize Plan".
   - Confirm alternative window generation and revised schedule.
6. **Step 6 — History**:
   - Verify plan version record with time saved and availability improvement.

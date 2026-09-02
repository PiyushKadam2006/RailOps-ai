# RailOps AI — Intelligent Block Planning System

## Architecture
- Frontend: React 18 + Vite 5 + Tailwind CSS v4 (zero-config)
- Backend: Node.js + Express + MongoDB (Mongoose)
- AI Engine: Custom JS modules for priority scoring, bundling, conflict detection

## Prerequisites
- Node.js 18+
- MongoDB 6+ running on localhost:27017

## Quickstart

### Backend
cd backend
npm install
npm run dev
# Seeds 100 defects + 100 blocks + corridors + train schedules on first run

### Frontend
cd frontend
npm install
npm run dev

### Access
Open http://localhost:5173

## Data Sources Simulated
TMS (Train Management), SMMS (Safety & Maintenance), TDMS (Track Data),
BDMS (Block Data), COA (Corridor Operations)

## Key Features
1. Dashboard — Live KPIs, timeline, approval queue
2. Data Integration — Source pipeline visualization, ingestion table
3. Optimization Engine — AI scoring + bundling + conflict detection
4. What-If Simulation — 5 predefined + custom scenario runner
5. Approval Pipeline — Priority queue with execute/bundle/reject
6. Block History — Full history with filters and pagination


# RailOps-ai

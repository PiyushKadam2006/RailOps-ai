import { Routes, Route } from 'react-router-dom';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import DataIntegration from './pages/DataIntegration';
import OptimizationEngine from './pages/OptimizationEngine';
import WhatIfSimulation from './pages/WhatIfSimulation';
import ApprovalPipeline from './pages/ApprovalPipeline';
import History from './pages/History';
import SubmitRequest from './pages/SubmitRequest';
import { RailOpsProvider } from './context/RailOpsContext';

export default function App() {
  return (
    <RailOpsProvider>
      <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/requests" element={<SubmitRequest />} />
            <Route path="/integration" element={<DataIntegration />} />
            <Route path="/optimization" element={<OptimizationEngine />} />
            <Route path="/simulation" element={<WhatIfSimulation />} />
            <Route path="/approval" element={<ApprovalPipeline />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </RailOpsProvider>
  );
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const RailOpsContext = createContext(null);

export function RailOpsProvider({ children }) {
  const [defects, setDefects] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [pipelineStats, setPipelineStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activityFeed, setActivityFeed] = useState([]);

  // Fetch all core datasets
  const refreshData = useCallback(async () => {
    try {
      const [defRes, blockRes, confRes, metricsRes, schedRes] = await Promise.all([
        api.get('/defects'),
        api.get('/blocks'),
        api.get('/optimization/conflicts'),
        api.get('/integration/metrics').catch(() => ({ data: null })),
        api.get('/schedules').catch(() => ({ data: [] }))
      ]);

      if (defRes.data) setDefects(defRes.data);
      if (blockRes.data) setBlocks(blockRes.data);
      if (confRes.data) setConflicts(confRes.data);
      if (metricsRes.data) setPipelineStats(metricsRes.data);
      if (schedRes.data) setSchedules(schedRes.data);
    } catch (err) {
      console.error('RailOpsContext: Error refreshing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Approve a defect: sends PUT /api/defects/:id with status EXECUTED, adds generated block, mutates state instantly
  const handleApproveDefect = useCallback(async (defectId) => {
    try {
      const res = await api.put(`/defects/${defectId}`, { status: 'EXECUTED' });
      const { defect: updatedDefect, block: newBlock } = res.data;

      // Optimistically / immediately mutate local defects array
      setDefects(prev => prev.map(d => (d._id === defectId ? (updatedDefect || { ...d, status: 'EXECUTED' }) : d)));

      // Optimistically / immediately prepend newly generated block into local blocks array
      if (newBlock) {
        setBlocks(prev => [newBlock, ...prev]);
      }

      // Add to shared activity feed
      setActivityFeed(prev => [{
        id: Date.now(),
        action: 'APPROVED',
        defectCode: updatedDefect?.defectCode || defectId.slice(-8).toUpperCase(),
        assetId: updatedDefect?.assetId,
        blockCode: newBlock?.blockCode || 'BLK-AUTO',
        timestamp: new Date()
      }, ...prev].slice(0, 15));

      return { success: true, defect: updatedDefect, block: newBlock };
    } catch (err) {
      console.error('RailOpsContext: handleApproveDefect failed:', err);
      throw err;
    }
  }, []);

  // Reject a defect: sends PUT /api/defects/:id with status REJECTED, mutates state instantly
  const handleRejectDefect = useCallback(async (defectId) => {
    try {
      const res = await api.put(`/defects/${defectId}`, { status: 'REJECTED' });
      const { defect: updatedDefect } = res.data;

      setDefects(prev => prev.map(d => (d._id === defectId ? (updatedDefect || { ...d, status: 'REJECTED' }) : d)));

      setActivityFeed(prev => [{
        id: Date.now(),
        action: 'REJECTED',
        defectCode: updatedDefect?.defectCode || defectId.slice(-8).toUpperCase(),
        assetId: updatedDefect?.assetId,
        blockCode: null,
        timestamp: new Date()
      }, ...prev].slice(0, 15));

      return { success: true, defect: updatedDefect };
    } catch (err) {
      console.error('RailOpsContext: handleRejectDefect failed:', err);
      throw err;
    }
  }, []);

  // Bundle a defect: sends PUT /api/defects/:id with status BUNDLED, mutates state instantly
  const handleBundleDefect = useCallback(async (defectId) => {
    try {
      const res = await api.put(`/defects/${defectId}`, { status: 'BUNDLED' });
      const { defect: updatedDefect } = res.data;

      setDefects(prev => prev.map(d => (d._id === defectId ? (updatedDefect || { ...d, status: 'BUNDLED' }) : d)));

      return { success: true, defect: updatedDefect };
    } catch (err) {
      console.error('RailOpsContext: handleBundleDefect failed:', err);
      throw err;
    }
  }, []);

  // Reschedule a block: updates scheduled window and updates block in place
  const handleRescheduleBlock = useCallback(async (blockId, newStartTime, newEndTime) => {
    try {
      const res = await api.put(`/blocks/${blockId}`, {
        startTime: typeof newStartTime === 'string' ? newStartTime : newStartTime.toISOString(),
        endTime: typeof newEndTime === 'string' ? newEndTime : newEndTime.toISOString()
      });
      const updatedBlock = res.data;

      setBlocks(prev => prev.map(b => (b._id === blockId ? updatedBlock : b)));

      return { success: true, block: updatedBlock };
    } catch (err) {
      console.error('RailOpsContext: handleRescheduleBlock failed:', err);
      throw err;
    }
  }, []);

  const value = {
    defects,
    blocks,
    conflicts,
    schedules,
    pipelineStats,
    isLoading,
    activityFeed,
    setActivityFeed,
    refreshData,
    handleApproveDefect,
    handleRejectDefect,
    handleBundleDefect,
    handleRescheduleBlock,
  };

  return (
    <RailOpsContext.Provider value={value}>
      {children}
    </RailOpsContext.Provider>
  );
}

export function useRailOps() {
  const context = useContext(RailOpsContext);
  if (!context) {
    throw new Error('useRailOps must be used within a RailOpsProvider');
  }
  return context;
}

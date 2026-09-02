import React, { useState } from 'react';
import axios from 'axios';
import { useRailOps } from '../context/RailOpsContext';

export default function SubmitRequest() {
  const { refreshData } = useRailOps();
  const [department, setDepartment] = useState('TMS (Track)');
  const [assetId, setAssetId] = useState('TRK-SEC-402-A');
  const [durationHours, setDurationHours] = useState('4');
  const [locationCoordinates, setLocationCoordinates] = useState('KP 142.550 - 142.600');
  const [faultDescription, setFaultDescription] = useState(
    'Minor rail head defect detected by ultrasonic sweep. Requires localized grinding.'
  );
  const [criticalityPriority, setCriticalityPriority] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Dynamic priority label helper
  const getPriorityLabel = (val) => {
    if (val <= 3) return `Level ${val} - Routine`;
    if (val <= 7) return `Level ${val} - Moderate`;
    return `Level ${val} - CRIT (Emergency Block)`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    // Map department string to code
    const deptCode = department.includes('Track') ? 'TMS' : department.includes('Signal') ? 'SMMS' : 'TDMS';

    const payload = {
      assetId,
      department: deptCode,
      durationHours: Number(durationHours),
      location: locationCoordinates,
      faultDescription,
      priority: Number(criticalityPriority),
      status: 'PENDING',
    };

    try {
      const res = await axios.post('/api/defects', payload).catch(async () => {
        return await axios.post('http://localhost:5000/api/defects', payload);
      });
      if (res.status === 200 || res.status === 201) {
        setFeedback({ type: 'success', text: 'Request dispatched successfully to AI Queue!' });
        if (refreshData) {
          await refreshData();
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', text: 'Failed to submit request. Ensure backend is running.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-slate-950 p-6 flex flex-col items-center justify-center font-sans overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative my-auto">
        
        {/* Top Meta Header */}
        <div className="flex justify-between items-center pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono-rail text-xs text-slate-300 tracking-wider font-semibold">
              SUBMIT MAINTENANCE REQUEST
            </span>
          </div>
          <span className="font-mono-rail text-xs px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded">
            REQ-2026-11-A
          </span>
        </div>

        {/* Status Toast */}
        {feedback && (
          <div
            className={`mb-4 p-3 rounded text-xs font-mono-rail border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Department Selection Tabs */}
          <div className="flex gap-6 border-b border-slate-800 text-xs font-mono-rail">
            {['TMS (Track)', 'SMMS (Signal)', 'TDMS (Traction)'].map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setDepartment(dept)}
                className={`pb-2 transition-colors cursor-pointer ${
                  department === dept
                    ? 'border-b-2 border-emerald-500 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Row: Asset ID & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono-rail text-slate-400 mb-1.5">Asset ID</label>
              <input
                type="text"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="e.g. TRK-SEC-402-A"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono-rail focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono-rail text-slate-400 mb-1.5">
                Estimated Duration (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono-rail focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Location Coordinates / KP */}
          <div>
            <label className="block text-xs font-mono-rail text-slate-400 mb-1.5">
              Location Coordinates / KP
            </label>
            <input
              type="text"
              value={locationCoordinates}
              onChange={(e) => setLocationCoordinates(e.target.value)}
              placeholder="e.g. KP 142.550 - 142.600"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono-rail focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Fault Description */}
          <div>
            <label className="block text-xs font-mono-rail text-slate-400 mb-1.5">
              Fault Description
            </label>
            <textarea
              rows={3}
              value={faultDescription}
              onChange={(e) => setFaultDescription(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 resize-none font-sans"
            />
          </div>

          {/* Criticality Priority Slider */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <div className="flex justify-between items-center text-xs font-mono-rail mb-2">
              <span className="text-slate-400">Criticality Priority</span>
              <span className="text-emerald-400 font-bold">{getPriorityLabel(criticalityPriority)}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={criticalityPriority}
              onChange={(e) => setCriticalityPriority(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] font-mono-rail text-slate-500 mt-1">
              <span>1 (Low)</span>
              <span>5 (Med)</span>
              <span>10 (CRIT)</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAssetId('');
                setFaultDescription('');
                setLocationCoordinates('');
              }}
              className="px-4 py-2 text-xs font-mono-rail text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-mono-rail font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-3 h-3 text-slate-950" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit to AI Queue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

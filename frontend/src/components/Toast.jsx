import { useEffect, useState } from 'react';

export default function Toast({ message, type, visible, onHide }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onHide();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible) return null;

  let colorClass = 'border-slate-500 text-slate-400 bg-slate-800';
  if (type === 'success') colorClass = 'border-emerald-500 text-emerald-400 bg-emerald-500/10';
  if (type === 'error') colorClass = 'border-red-500 text-red-400 bg-red-500/10';
  if (type === 'info') colorClass = 'border-blue-500 text-blue-400 bg-blue-500/10';

  return (
    <div className={`fixed bottom-4 right-4 border ${colorClass} px-4 py-3 rounded-lg shadow-lg z-50 slide-in font-mono-rail text-xs`}>
      {message}
    </div>
  );
}

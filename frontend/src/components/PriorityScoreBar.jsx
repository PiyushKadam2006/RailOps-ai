export default function PriorityScoreBar({ score }) {
  let colorClass = 'bg-slate-400';
  if (score > 80) colorClass = 'bg-red-500';
  else if (score > 60) colorClass = 'bg-amber-500';
  else if (score > 40) colorClass = 'bg-blue-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-600 h-1.5 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} bar-grow rounded-full`} 
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <span className={`font-mono-rail text-xs font-bold ${colorClass.replace('bg-', 'text-')}`}>
        {score}
      </span>
    </div>
  );
}

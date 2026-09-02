export default function DataSourceBadge({ source }) {
  let classes = '';
  switch(source) {
    case 'TMS': classes = 'bg-blue-500/20 text-blue-400 border border-blue-500/30'; break;
    case 'SMMS': classes = 'bg-purple-500/20 text-purple-400 border border-purple-500/30'; break;
    case 'TRK': classes = 'bg-amber-500/20 text-amber-400 border border-amber-500/30'; break;
    case 'OHE': classes = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'; break;
    case 'TDMS': classes = 'bg-amber-500/20 text-amber-400 border border-amber-500/30'; break;
    case 'BDMS': classes = 'bg-teal-500/20 text-teal-400 border border-teal-500/30'; break;
    case 'COA': classes = 'bg-rose-500/20 text-rose-400 border border-rose-500/30'; break;
    default: classes = 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
  }

  return (
    <span className={`font-mono-rail text-[8px] px-2 py-0.5 rounded-full ${classes}`}>
      {source}
    </span>
  );
}

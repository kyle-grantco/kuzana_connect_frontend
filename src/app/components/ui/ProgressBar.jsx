// Progress bar for onboarding. `percent` is cosmetic (40/80/100 milestones).
export default function ProgressBar({ percent = 0 }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-yellow transition-all duration-300"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-500">{percent}%</span>
    </div>
  );
}

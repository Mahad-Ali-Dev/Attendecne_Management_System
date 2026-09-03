export function StatCard({
  label,
  value,
  accent = "text-navy",
  icon,
}: {
  label: string;
  value: number | string;
  accent?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
        {icon}
      </div>
      <div>
        <div className={`text-2xl font-bold ${accent}`}>{value}</div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </div>
      </div>
    </div>
  );
}

import { categoryBadgeClass, categoryLabel } from "@/lib/productivity";
import { formatHours } from "@/lib/format";
import type { SiteActivity } from "@/lib/types";

export function SiteBreakdownList({ sites }: { sites: SiteActivity[] }) {
  const sorted = [...sites].sort(
    (a, b) => b.productive_seconds + b.unproductive_seconds - (a.productive_seconds + a.unproductive_seconds)
  );

  if (sorted.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No site activity recorded.</p>;
  }

  return (
    <div className="max-h-96 space-y-2 overflow-y-auto">
      {sorted.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-sm"
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-navy">{s.hostname}</div>
            <span className={`badge mt-1 ${categoryBadgeClass(s.category)}`}>{categoryLabel(s.category)}</span>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-semibold text-emerald-600">{formatHours(s.productive_seconds / 3600)}</div>
            {s.unproductive_seconds > 0 && (
              <div className="text-xs text-amber-600">+{formatHours(s.unproductive_seconds / 3600)} unproductive</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

import { categoryBadgeClass, categoryLabel } from "@/lib/productivity";
import { formatHours } from "@/lib/format";
import type { SiteActivity } from "@/lib/types";

/**
 * Employee-facing "today's sites" view, distinct from the shared
 * SiteBreakdownList used in admin drill-down modals — this one adds a
 * proportional share bar (of today's total tracked time) per site, split
 * into its own productive/unproductive portions.
 */
export function TodaySites({ sites }: { sites: SiteActivity[] }) {
  if (sites.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No site activity recorded today.</p>;
  }

  const totalSeconds = sites.reduce((sum, s) => sum + s.productive_seconds + s.unproductive_seconds, 0);
  const sorted = [...sites].sort(
    (a, b) => b.productive_seconds + b.unproductive_seconds - (a.productive_seconds + a.unproductive_seconds)
  );

  return (
    <div className="space-y-4">
      {sorted.map((s) => {
        const siteTotal = s.productive_seconds + s.unproductive_seconds;
        const sharePct = totalSeconds > 0 ? (siteTotal / totalSeconds) * 100 : 0;
        const productiveSharePct = siteTotal > 0 ? (s.productive_seconds / siteTotal) * 100 : 0;
        return (
          <div key={s.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-navy">{s.hostname}</span>
                <span className={`badge shrink-0 ${categoryBadgeClass(s.category)}`}>{categoryLabel(s.category)}</span>
              </div>
              <span className="shrink-0 text-sm font-medium text-slate-500">{formatHours(siteTotal / 3600)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="flex h-full" style={{ width: `${Math.max(sharePct, 2)}%` }}>
                <div style={{ width: `${productiveSharePct}%`, background: "#059669" }} />
                <div style={{ width: `${100 - productiveSharePct}%`, background: "#f59e0b" }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

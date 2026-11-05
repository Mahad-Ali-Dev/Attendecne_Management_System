import { REPORT_COLUMNS, type ReportRow } from "@/lib/report";

// The monthly-report figures, grouped so the card reads top to bottom: the day
// counts a by-the-day payroll needs first, then the hours view, then the
// tracker view. Labels and values come straight from REPORT_COLUMNS, so this
// card always shows exactly what the Reports tab does.
const REPORT_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Days",
    keys: ["requiredDays", "presentDays", "absentDays", "leaves", "extraDays", "daysWorked", "paidWorkingDays"],
  },
  { title: "Hours", keys: ["requiredHours", "completedHours", "attendancePct"] },
  { title: "Tracking", keys: ["requiredTracking", "completedTracking", "trackingPct"] },
];

/**
 * One month's report figures for a single person, shown as readable labelled
 * tiles grouped Days / Hours / Tracking. Used on the admin employee page and a
 * team lead's member-review page so both match the Reports tab exactly.
 */
export function MonthlyReportCard({ row }: { row: ReportRow }) {
  const columnsByKey = new Map(REPORT_COLUMNS.map((c) => [c.key, c] as const));

  return (
    <div className="card space-y-5 p-6">
      <div>
        <h3 className="font-semibold text-navy">This month at a glance</h3>
        <p className="text-xs text-slate-400">
          The same figures as the Reports tab. Highlighted tiles are the headline payroll numbers.
        </p>
      </div>
      {REPORT_GROUPS.map((group) => (
        <div key={group.title}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.title}</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.keys.map((key) => {
              const col = columnsByKey.get(key);
              if (!col) return null;
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-3 ${
                    col.strong ? "border-brand-100 bg-brand-50/60" : "border-slate-100 bg-slate-50/60"
                  }`}
                >
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{col.label}</div>
                  <div className={`mt-1 text-lg font-bold ${col.strong ? "text-brand-700" : "text-navy"}`}>
                    {col.value(row)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

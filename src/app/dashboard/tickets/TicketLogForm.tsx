import { formatDate } from "@/lib/format";
import type { TicketReport } from "@/lib/types";

/**
 * Read-only ticket history for the Tickets tab. Logging the daily count now
 * happens on the dashboard (before checkout), so this screen only reviews what
 * was recorded.
 */
export function TicketLogForm({ entries }: { entries: TicketReport[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="font-semibold text-navy">Your ticket history</h2>
        <p className="text-xs text-slate-400">
          {entries.length} {entries.length === 1 ? "day" : "days"} logged · record today&apos;s from your dashboard.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-400">
          No tickets logged yet. Log today&apos;s from your dashboard.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 text-right font-medium">Tickets solved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {entries.map((e) => (
              <tr key={e.id} className="text-slate-600">
                <td className="px-6 py-3 font-medium text-navy">{formatDate(e.work_date)}</td>
                <td className="px-6 py-3 text-right">
                  <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-brand-700">
                    {e.tickets_solved}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

import { productivityPercent } from "@/lib/productivity";
import { formatDate, formatHours } from "@/lib/format";
import type { ProductivitySession } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

export function ProductivityTrendTable({ sessions }: { sessions: ProductivitySession[] }) {
  if (sessions.length === 0) {
    return <div className="card px-6 py-12 text-center text-sm text-slate-400">No activity tracked yet.</div>;
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-6 py-3 font-medium">Date</th>
            <th className="px-6 py-3 font-medium">Productive</th>
            <th className="px-6 py-3 font-medium">Unproductive</th>
            <th className="px-6 py-3 font-medium">Productivity</th>
            <th className="px-6 py-3 font-medium">Tab switches</th>
            <th className="px-6 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sessions.map((s) => {
            const pct = productivityPercent(s.total_productive_seconds, s.total_unproductive_seconds);
            return (
              <tr key={s.id} className="text-slate-600">
                <td className="px-6 py-3 font-medium text-navy">{formatDate(s.work_date)}</td>
                <td className="px-6 py-3 text-emerald-600">{formatHours(s.total_productive_seconds / 3600)}</td>
                <td className="px-6 py-3 text-amber-600">{formatHours(s.total_unproductive_seconds / 3600)}</td>
                <td className="px-6 py-3 font-medium text-navy">{pct === null ? "—" : `${pct}%`}</td>
                <td className="px-6 py-3">{s.tab_switch_count}</td>
                <td className="px-6 py-3">
                  {s.flagged_suspicious ? (
                    <span className="badge bg-red-50 text-red-700">
                      <AlertTriangle className="h-3 w-3" /> Flagged
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

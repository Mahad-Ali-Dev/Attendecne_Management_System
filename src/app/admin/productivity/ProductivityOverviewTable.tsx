"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SiteBreakdownModal } from "@/components/SiteBreakdownModal";
import { productivityPercent } from "@/lib/productivity";
import { formatHours } from "@/lib/format";
import type { Profile, ProductivitySession, SiteActivity } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

export function ProductivityOverviewTable({
  employees,
  sessions,
  sites,
}: {
  employees: Profile[];
  sessions: ProductivitySession[];
  sites: SiteActivity[];
}) {
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const sessionByUser = useMemo(() => new Map(sessions.map((s) => [s.user_id, s])), [sessions]);
  const sitesByUser = useMemo(() => {
    const map = new Map<string, SiteActivity[]>();
    for (const s of sites) {
      const list = map.get(s.user_id);
      if (list) list.push(s);
      else map.set(s.user_id, [s]);
    }
    return map;
  }, [sites]);

  // Flagged first, then tracked, then not-tracked — each group keeps the
  // incoming alphabetical order since Array.sort is stable.
  const sorted = useMemo(() => {
    function rank(emp: Profile) {
      const s = sessionByUser.get(emp.id);
      if (s?.flagged_suspicious) return 0;
      if (s) return 1;
      return 2;
    }
    return [...employees].sort((a, b) => rank(a) - rank(b));
  }, [employees, sessionByUser]);

  if (employees.length === 0) {
    return <div className="card px-6 py-12 text-center text-sm text-slate-400">No employees registered yet.</div>;
  }

  const viewingEmployee = viewingUserId ? (employees.find((e) => e.id === viewingUserId) ?? null) : null;
  const viewingSites = viewingUserId ? (sitesByUser.get(viewingUserId) ?? []) : [];

  return (
    <>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Employee</th>
              <th className="px-6 py-3 font-medium">Department</th>
              <th className="px-6 py-3 font-medium">Total tracked</th>
              <th className="px-6 py-3 font-medium">Productive</th>
              <th className="px-6 py-3 font-medium">Unproductive</th>
              <th className="px-6 py-3 font-medium">Productivity</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((emp) => {
              const s = sessionByUser.get(emp.id);
              const pct = s ? productivityPercent(s.total_productive_seconds, s.total_unproductive_seconds) : null;
              return (
                <tr
                  key={emp.id}
                  onClick={() => s && setViewingUserId(emp.id)}
                  className={`text-slate-600 ${s ? "cursor-pointer hover:bg-slate-50" : ""}`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.full_name} src={emp.avatar_url} size={32} />
                      <div>
                        <div className="font-medium text-navy">{emp.full_name}</div>
                        <div className="text-xs text-slate-400">{emp.position || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">{emp.department || "—"}</td>
                  <td className="px-6 py-3 font-medium text-navy">
                    {s ? formatHours((s.total_productive_seconds + s.total_unproductive_seconds) / 3600) : "—"}
                  </td>
                  <td className="px-6 py-3 text-emerald-600">
                    {s ? formatHours(s.total_productive_seconds / 3600) : "—"}
                  </td>
                  <td className="px-6 py-3 text-amber-600">
                    {s ? formatHours(s.total_unproductive_seconds / 3600) : "—"}
                  </td>
                  <td className="px-6 py-3 font-medium text-navy">{pct === null ? "—" : `${pct}%`}</td>
                  <td className="px-6 py-3">
                    {s?.flagged_suspicious ? (
                      <span className="badge bg-red-50 text-red-700">
                        <AlertTriangle className="h-3 w-3" /> Flagged
                      </span>
                    ) : s ? (
                      <span className="badge bg-emerald-50 text-emerald-700">Tracked</span>
                    ) : (
                      <span className="text-slate-400">Not tracked</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewingEmployee && (
        <SiteBreakdownModal
          title={`Sites — ${viewingEmployee.full_name}`}
          sites={viewingSites}
          onClose={() => setViewingUserId(null)}
        />
      )}
    </>
  );
}

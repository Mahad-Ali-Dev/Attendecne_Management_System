"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewLeaveAsLead } from "./actions";
import { Avatar } from "@/components/Avatar";
import { LEAVE_STATUS_STYLE, leaveDayCount, titleCase } from "@/lib/leave";
import { formatDate } from "@/lib/format";
import type { LeaveRequest, Profile } from "@/lib/types";
import { Check, X, Loader2, CalendarClock } from "lucide-react";

/**
 * First-step leave review for a team lead: their own members' pending requests,
 * with Approve / Reject that records the lead's decision. The admin still makes
 * the final call, so a request the lead has approved stays listed (as "You
 * approved") until the admin finalises it and it drops off.
 */
export function TeamLeaveReview({ requests, members }: { requests: LeaveRequest[]; members: Profile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const sorted = useMemo(() => {
    // Still-to-review first, then the ones the lead has already acted on.
    const rank = (r: LeaveRequest) => (r.lead_status === null || r.lead_status === "PENDING" ? 0 : 1);
    return [...requests].sort((a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at));
  }, [requests]);

  function act(id: string, approve: boolean) {
    setActingId(id);
    setError(null);
    startTransition(async () => {
      const res = await reviewLeaveAsLead(id, approve);
      if (res?.error) setError(res.error);
      setActingId(null);
      router.refresh();
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
        <CalendarClock className="h-5 w-5 shrink-0 text-brand-600" />
        <div>
          <h3 className="font-semibold text-navy">Team leave to review</h3>
          <p className="text-xs text-slate-400">Your first-step approval — the admin makes the final call.</p>
        </div>
      </div>
      {error && <p className="px-6 pt-3 text-xs text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Member</th>
              <th className="px-6 py-3 font-medium">Dates</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Reason</th>
              <th className="px-6 py-3 font-medium">Your review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((r) => {
              const m = byId.get(r.user_id);
              const busy = pending && actingId === r.id;
              const canAct = r.lead_status === null || r.lead_status === "PENDING";
              const days = leaveDayCount(r.start_date, r.end_date);
              return (
                <tr key={r.id} className="text-slate-600">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m?.full_name ?? "?"} src={m?.avatar_url ?? null} size={30} />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-navy">{m?.full_name ?? "Member"}</div>
                        <div className="truncate text-xs text-slate-400">{m?.position || "Employee"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3">
                    {formatDate(r.start_date)}
                    {r.start_date !== r.end_date ? ` – ${formatDate(r.end_date)}` : ""}
                    <span className="ml-1 text-slate-400">
                      · {days} {days === 1 ? "day" : "days"}
                    </span>
                  </td>
                  <td className="px-6 py-3">{titleCase(r.leave_type)}</td>
                  <td className="max-w-xs truncate px-6 py-3 text-slate-500" title={r.reason || ""}>
                    {r.reason || "—"}
                  </td>
                  <td className="px-6 py-3">
                    {canAct ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => act(r.id, true)}
                          disabled={busy}
                          aria-label="Approve"
                          className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => act(r.id, false)}
                          disabled={busy}
                          aria-label="Reject"
                          className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : r.lead_status === "APPROVED" ? (
                      <span className={`badge ${LEAVE_STATUS_STYLE.APPROVED}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        You approved
                      </span>
                    ) : (
                      <span className={`badge ${LEAVE_STATUS_STYLE.REJECTED}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        You rejected
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

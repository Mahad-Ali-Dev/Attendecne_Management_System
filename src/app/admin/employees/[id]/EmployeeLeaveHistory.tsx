"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewLeaveRequest } from "../../actions";
import { LeaveDetailModal } from "@/components/LeaveDetailModal";
import { LEAVE_STATUS_STYLE, titleCase } from "@/lib/leave";
import { formatDate } from "@/lib/format";
import type { LeaveRequest } from "@/lib/types";
import { Check, X, Loader2 } from "lucide-react";

export function EmployeeLeaveHistory({ requests }: { requests: LeaveRequest[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<LeaveRequest | null>(null);

  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;

  function act(id: string, approve: boolean) {
    setActingId(id);
    startTransition(async () => {
      await reviewLeaveRequest(id, approve);
      setActingId(null);
      setViewing(null);
      router.refresh();
    });
  }

  return (
    <div className="card overflow-hidden lg:col-span-3">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="font-semibold text-navy">Leave</h2>
        <p className="text-xs text-slate-400">
          {approvedCount > 0
            ? `${approvedCount} approved leave ${approvedCount === 1 ? "day" : "days"} on record.`
            : "No approved leave yet."}
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-400">No leave requests from this employee yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Dates</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Reason</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {requests.map((r) => {
              const busy = pending && actingId === r.id;
              return (
                <tr
                  key={r.id}
                  onClick={() => setViewing(r)}
                  className="cursor-pointer text-slate-600 hover:bg-slate-50"
                >
                  <td className="px-6 py-3 font-medium text-navy">
                    {formatDate(r.start_date)}
                    {r.start_date !== r.end_date ? ` – ${formatDate(r.end_date)}` : ""}
                  </td>
                  <td className="px-6 py-3">{titleCase(r.leave_type)}</td>
                  <td className="max-w-xs truncate px-6 py-3 text-slate-500">{r.reason || "—"}</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${LEAVE_STATUS_STYLE[r.status]}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                      {titleCase(r.status)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {r.status === "PENDING" && (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            act(r.id, true);
                          }}
                          disabled={busy}
                          aria-label="Approve"
                          className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            act(r.id, false);
                          }}
                          disabled={busy}
                          aria-label="Reject"
                          className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {viewing && (
        <LeaveDetailModal
          request={viewing}
          onClose={() => setViewing(null)}
          onReview={(approve) => act(viewing.id, approve)}
          busy={pending && actingId === viewing.id}
        />
      )}
    </div>
  );
}

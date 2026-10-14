"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Avatar } from "@/components/Avatar";
import { LEAVE_STATUS_STYLE, leaveDayCount, titleCase } from "@/lib/leave";
import { formatDate } from "@/lib/format";
import type { LeaveRequest, Profile } from "@/lib/types";
import { Loader2 } from "lucide-react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

/**
 * Full view of one leave request — the tables truncate the reason to a single
 * line, so this is where it's read in full. Pass `employee` when the list
 * spans several people; pass `onReview` to offer Approve/Reject on a pending one.
 */
export function LeaveDetailModal({
  request: r,
  employee,
  onClose,
  onReview,
  busy = false,
}: {
  request: LeaveRequest;
  employee?: Profile | null;
  onClose: () => void;
  onReview?: (approve: boolean) => void;
  busy?: boolean;
}) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const days = leaveDayCount(r.start_date, r.end_date);
  const reason = r.reason?.trim();

  function review(approve: boolean) {
    setChoice(approve);
    onReview?.(approve);
  }

  return (
    <Modal title="Leave request" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          {employee && (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={employee.full_name} src={employee.avatar_url} size={40} />
              <div className="min-w-0">
                <div className="truncate font-semibold text-navy">{employee.full_name}</div>
                <div className="truncate text-xs text-slate-400">
                  {[employee.position, employee.department].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
            </div>
          )}
          <span className={`badge ml-auto shrink-0 ${LEAVE_STATUS_STYLE[r.status]}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {titleCase(r.status)}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div className="col-span-2">
            <Field label="Dates">
              <span className="font-medium text-navy">
                {formatDate(r.start_date)}
                {r.start_date !== r.end_date ? ` – ${formatDate(r.end_date)}` : ""}
              </span>
              <span className="text-slate-400">
                {" "}
                · {days} {days === 1 ? "day" : "days"}
              </span>
            </Field>
          </div>
          <Field label="Type">
            <span className="text-slate-700">{titleCase(r.leave_type)}</span>
          </Field>
          <Field label="Requested">
            <span className="text-slate-700">{formatDate(r.created_at)}</span>
          </Field>
        </dl>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Reason</div>
          <p className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-3.5 py-3 text-sm text-slate-700">
            {reason || <span className="text-slate-400">No reason given.</span>}
          </p>
        </div>

        {r.status !== "PENDING" && r.reviewed_at && (
          <p className="text-xs text-slate-400">
            {titleCase(r.status)} on {formatDate(r.reviewed_at)}
          </p>
        )}

        {r.status === "PENDING" && onReview && (
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => review(false)}
              disabled={busy}
              className="btn border border-red-200 bg-white text-red-600 hover:bg-red-50 focus:ring-red-300"
            >
              {busy && choice === false ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
            </button>
            <button
              type="button"
              onClick={() => review(true)}
              disabled={busy}
              className="btn bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600"
            >
              {busy && choice === true ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

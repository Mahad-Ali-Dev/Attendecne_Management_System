"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertSalarySlip } from "./actions";
import { formatCurrency, pktNow } from "@/lib/format";
import { summarizeMonth, autoDeduction, autoBonus, dailyRate, leaveDatesSet } from "@/lib/payroll";
import type { Attendance, LeaveRequest, SalarySlip } from "@/lib/types";
import { Loader2, UserCheck, UserX, TrendingUp, CalendarCheck, CalendarOff, Wallet, RefreshCw } from "lucide-react";

/**
 * The actual salary editing UI: attendance-vs-target breakdown, an
 * auto-calculated deduction suggestion, and the basic/allowances/deductions
 * inputs. Shared by the per-employee profile page and the company-wide
 * Salary page so editing behaves identically from either place.
 */
export function SalaryForm({
  employeeId,
  month,
  shiftStart,
  shiftEnd,
  offDays,
  attendance,
  leaveRequests = [],
  existingSlip,
  previousSlip,
  onSaved,
}: {
  employeeId: string;
  month: string;
  shiftStart: string;
  shiftEnd: string;
  offDays?: number[];
  attendance: Attendance[];
  leaveRequests?: LeaveRequest[];
  existingSlip?: SalarySlip;
  previousSlip?: SalarySlip;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const todayKey = useMemo(() => pktNow().toISOString().slice(0, 10), []);
  const seed = existingSlip ?? previousSlip;

  const [basicSalary, setBasicSalary] = useState(seed ? String(seed.basic_salary) : "");
  const [allowances, setAllowances] = useState(seed ? String(seed.allowances) : "");
  // Deductions never carry forward — last month's shortfall has nothing to do with this one.
  const [deductions, setDeductions] = useState(existingSlip ? String(existingSlip.deductions) : "");
  const [note, setNote] = useState(existingSlip?.note ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const leaveDates = useMemo(() => leaveDatesSet(leaveRequests), [leaveRequests]);
  const summary = useMemo(
    () => summarizeMonth(attendance, month, shiftStart, shiftEnd, todayKey, leaveDates, offDays),
    [attendance, month, shiftStart, shiftEnd, todayKey, leaveDates, offDays]
  );

  const basicSalaryNum = Number(basicSalary) || 0;
  const suggestedDeduction = autoDeduction(basicSalaryNum, summary.absentDays);
  const suggestedBonus = autoBonus(basicSalaryNum, summary.extraDays);
  const perDay = dailyRate(basicSalaryNum);
  const netPay = basicSalaryNum + (Number(allowances) || 0) - (Number(deductions) || 0);
  // Paid days (present + approved leave) as a share of the month's working days.
  const paidDays = summary.presentDays + summary.leaveDays;
  const workedRatio = summary.workingDays > 0 ? Math.min(100, (paidDays / summary.workingDays) * 100) : 100;
  // The same "Paid working days" the Reports tab shows (present + extra + leave).
  const paidWorkingDays = summary.presentDays + summary.leaveDays + summary.extraDays;
  // Full basic for the month, less a day's pay (basic ÷ 30) per absent day, plus
  // a day's pay per extra rest-day worked.
  const suggestedNet = Math.round(basicSalaryNum - suggestedDeduction + suggestedBonus);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await upsertSalarySlip(
        employeeId,
        month,
        basicSalaryNum,
        Number(allowances) || 0,
        Number(deductions) || 0,
        note
      );
      if (res?.error) {
        setError(res.error);
      } else {
        setSaved(true);
        router.refresh();
        onSaved?.();
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Attendance this month</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MiniStat icon={<CalendarCheck className="h-4 w-4" />} label="Working days" value={summary.workingDays} />
          <MiniStat icon={<UserCheck className="h-4 w-4" />} label="Present" value={summary.presentDays} />
          <MiniStat
            icon={<CalendarOff className="h-4 w-4" />}
            label="On leave"
            value={summary.leaveDays}
            accent={summary.leaveDays > 0 ? "text-brand-600" : "text-navy"}
          />
          <MiniStat
            icon={<UserX className="h-4 w-4" />}
            label="Absent"
            value={summary.absentDays}
            accent={summary.absentDays > 0 ? "text-red-600" : "text-navy"}
          />
          <MiniStat
            icon={<TrendingUp className="h-4 w-4" />}
            label="Extra days"
            value={summary.extraDays}
            accent={summary.extraDays > 0 ? "text-emerald-600" : "text-navy"}
          />
          <MiniStat
            icon={<Wallet className="h-4 w-4" />}
            label="Paid working days"
            value={paidWorkingDays}
            accent="text-brand-600"
          />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${summary.absentDays > 0 ? "bg-amber-400" : "bg-emerald-500"}`}
            style={{ width: `${workedRatio}%` }}
          />
        </div>

        {basicSalaryNum > 0 && (
          <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2.5 text-xs text-brand-700">
            Day rate <span className="font-semibold">{formatCurrency(perDay)}</span> (salary ÷ 30 days). Suggested
            net ≈ <span className="font-semibold">{formatCurrency(suggestedNet)}</span>
            {summary.absentDays > 0 || summary.extraDays > 0 ? (
              <>
                {" "}
                (basic{summary.absentDays > 0 ? ` − ${summary.absentDays} absent` : ""}
                {summary.extraDays > 0 ? ` + ${summary.extraDays} extra` : ""})
              </>
            ) : null}
          </div>
        )}

        {summary.leaveDays > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
            <CalendarOff className="h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-semibold">
                {summary.leaveDays} approved leave {summary.leaveDays === 1 ? "day" : "days"}
              </span>{" "}
              paid this month — not counted as absent, so not deducted below.
            </span>
          </div>
        )}

        {summary.absentDays > 0 && basicSalaryNum > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <span>
              Suggested deduction: <span className="font-semibold">{formatCurrency(suggestedDeduction)}</span>{" "}
              ({summary.absentDays} absent {summary.absentDays === 1 ? "day" : "days"} × {formatCurrency(perDay)}/day)
            </span>
            <button
              type="button"
              onClick={() => setDeductions(String(suggestedDeduction))}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
            >
              <RefreshCw className="h-3 w-3" /> Use this
            </button>
          </div>
        )}

        {summary.extraDays > 0 && basicSalaryNum > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
            <span>
              Suggested bonus: <span className="font-semibold">{formatCurrency(suggestedBonus)}</span>{" "}
              ({summary.extraDays} extra {summary.extraDays === 1 ? "day" : "days"} × {formatCurrency(perDay)}/day)
            </span>
            <button
              type="button"
              onClick={() => setAllowances(String(suggestedBonus))}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
            >
              <RefreshCw className="h-3 w-3" /> Use this
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Basic salary</label>
          <input
            type="number"
            min={0}
            step="1"
            required
            value={basicSalary}
            onChange={(e) => setBasicSalary(e.target.value)}
            className="input w-32"
          />
        </div>
        <div>
          <label className="label">Allowances</label>
          <input
            type="number"
            min={0}
            step="1"
            value={allowances}
            onChange={(e) => setAllowances(e.target.value)}
            className="input w-32"
          />
        </div>
        <div>
          <label className="label">Deductions</label>
          <input
            type="number"
            min={0}
            step="1"
            value={deductions}
            onChange={(e) => setDeductions(e.target.value)}
            className="input w-32"
          />
        </div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
      </div>

      <div className="mt-2">
        <input
          type="text"
          placeholder="Note (optional) — e.g. reason for a deduction or bonus"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input"
        />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2.5">
        <span className="text-sm font-medium text-emerald-700">Net pay</span>
        <span className="text-lg font-bold text-emerald-700">{formatCurrency(netPay)}</span>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {saved && !error && <p className="mt-2 text-xs text-emerald-600">Saved.</p>}
    </form>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accent = "text-navy",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        {icon}
      </span>
      <div className="min-w-0">
        <div className={`truncate text-sm font-bold ${accent}`}>{value}</div>
        <div className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      </div>
    </div>
  );
}

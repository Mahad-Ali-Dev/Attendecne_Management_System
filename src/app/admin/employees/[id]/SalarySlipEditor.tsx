"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertSalarySlip } from "../actions";
import { formatCurrency, formatHours, formatMonthLabel, pktNow } from "@/lib/format";
import { summarizeMonth, autoDeduction } from "@/lib/payroll";
import type { Attendance, SalarySlip } from "@/lib/types";
import { Loader2, Pencil, Clock, Target, TrendingDown, CalendarCheck, RefreshCw } from "lucide-react";

function netPay(s: { basic_salary: number; allowances: number; deductions: number }) {
  return s.basic_salary + s.allowances - s.deductions;
}

export function SalarySlipEditor({
  employeeId,
  slips,
  attendance,
  shiftStart,
  shiftEnd,
}: {
  employeeId: string;
  slips: SalarySlip[];
  attendance: Attendance[];
  shiftStart: string;
  shiftEnd: string;
}) {
  const router = useRouter();
  const todayKey = useMemo(() => pktNow().toISOString().slice(0, 10), []);
  const [month, setMonth] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [allowances, setAllowances] = useState("");
  const [deductions, setDeductions] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const summary = useMemo(
    () => (month ? summarizeMonth(attendance, month, shiftStart, shiftEnd, todayKey) : null),
    [attendance, month, shiftStart, shiftEnd, todayKey]
  );

  const basicSalaryNum = Number(basicSalary) || 0;
  const suggestedDeduction = summary
    ? autoDeduction(basicSalaryNum, summary.expectedHours, summary.hoursShort)
    : 0;
  const hourlyRate = summary && summary.expectedHours > 0 ? basicSalaryNum / summary.expectedHours : 0;

  function fillFrom(s: SalarySlip | undefined) {
    setBasicSalary(s ? String(s.basic_salary) : "");
    setAllowances(s ? String(s.allowances) : "");
    setDeductions(s ? String(s.deductions) : "");
    setNote(s?.note ?? "");
  }

  function onMonthChange(value: string) {
    setMonth(value);
    setError(null);
    setSaved(false);
    const existing = slips.find((s) => s.month.slice(0, 7) === value);
    fillFrom(existing ?? slips[0]);
    if (!existing) {
      setNote("");
      // Suggest a deduction for this month right away, based on the carried-forward salary.
      const carriedSalary = slips[0]?.basic_salary ?? 0;
      const s = summarizeMonth(attendance, value, shiftStart, shiftEnd, todayKey);
      setDeductions(String(autoDeduction(carriedSalary, s.expectedHours, s.hoursShort)));
    }
  }

  function edit(s: SalarySlip) {
    setMonth(s.month.slice(0, 7));
    fillFrom(s);
    setError(null);
    setSaved(false);
  }

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
      }
    });
  }

  const preview = netPay({ basic_salary: basicSalaryNum, allowances: Number(allowances) || 0, deductions: Number(deductions) || 0 });
  const workedRatio = summary && summary.expectedHours > 0 ? Math.min(100, (summary.actualHours / summary.expectedHours) * 100) : 100;

  return (
    <div className="card overflow-hidden lg:col-span-3">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="font-semibold text-navy">Salary</h2>
        <p className="text-xs text-slate-400">
          Deductions can be calculated from attendance — short one full shift&apos;s worth of hours costs one
          day&apos;s pay, proportionally.
        </p>
      </div>

      <form onSubmit={onSubmit} className="border-b border-slate-100 bg-slate-50 px-6 py-5">
        <div>
          <label className="label">Month</label>
          <input
            type="month"
            required
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="input w-48"
          />
        </div>

        {summary && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Attendance this month</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat icon={<CalendarCheck className="h-4 w-4" />} label="Working days" value={summary.workingDays} />
              <MiniStat icon={<Clock className="h-4 w-4" />} label="Hours worked" value={formatHours(summary.actualHours)} />
              <MiniStat icon={<Target className="h-4 w-4" />} label="Expected" value={formatHours(summary.expectedHours)} />
              <MiniStat
                icon={<TrendingDown className="h-4 w-4" />}
                label="Short"
                value={formatHours(summary.hoursShort)}
                accent={summary.hoursShort > 0 ? "text-red-600" : "text-emerald-600"}
              />
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${summary.hoursShort > 0 ? "bg-amber-400" : "bg-emerald-500"}`}
                style={{ width: `${workedRatio}%` }}
              />
            </div>

            {summary.hoursShort > 0 && basicSalaryNum > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                <span>
                  Suggested deduction: <span className="font-semibold">{formatCurrency(suggestedDeduction)}</span>{" "}
                  ({formatHours(summary.hoursShort)} short × {formatCurrency(hourlyRate)}/hour)
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
          </div>
        )}

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

        {month && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2.5">
            <span className="text-sm font-medium text-emerald-700">Net pay</span>
            <span className="text-lg font-bold text-emerald-700">{formatCurrency(preview)}</span>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {saved && !error && <p className="mt-2 text-xs text-emerald-600">Saved.</p>}
      </form>

      {slips.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-400">No salary slips yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Month</th>
              <th className="px-6 py-3 font-medium">Basic</th>
              <th className="px-6 py-3 font-medium">Allowances</th>
              <th className="px-6 py-3 font-medium">Deductions</th>
              <th className="px-6 py-3 font-medium">Hours short</th>
              <th className="px-6 py-3 font-medium">Net pay</th>
              <th className="px-6 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {slips.map((s) => {
              const slipMonthKey = s.month.slice(0, 7);
              const hist = summarizeMonth(attendance, slipMonthKey, shiftStart, shiftEnd, todayKey);
              return (
                <tr key={s.id} className="text-slate-600">
                  <td className="px-6 py-3 font-medium text-navy">{formatMonthLabel(slipMonthKey)}</td>
                  <td className="px-6 py-3">{formatCurrency(s.basic_salary)}</td>
                  <td className="px-6 py-3">{formatCurrency(s.allowances)}</td>
                  <td className="px-6 py-3">{formatCurrency(s.deductions)}</td>
                  <td className="px-6 py-3">
                    {hist.hoursShort > 0 ? (
                      <span className="text-amber-600">{formatHours(hist.hoursShort)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 font-semibold text-navy">{formatCurrency(netPay(s))}</td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => edit(s)}
                      aria-label={`Edit ${slipMonthKey}`}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
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

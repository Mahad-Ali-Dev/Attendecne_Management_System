"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEmployeeRelaxMinutes } from "../actions";
import { shiftLengthHours, formatHours } from "@/lib/format";
import { Coffee, Loader2 } from "lucide-react";

/**
 * Admin control for an employee's daily tracker relaxation (break) allowance.
 * The daily productive-hours target is the shift length minus this, so the form
 * previews the resulting target as the admin types. 90 minutes is the standard.
 */
export function RelaxationEditForm({
  employeeId,
  initialMinutes,
  shiftStart,
  shiftEnd,
}: {
  employeeId: string;
  initialMinutes: number;
  shiftStart: string;
  shiftEnd: string;
}) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(String(initialMinutes));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const shiftHours = shiftLengthHours(shiftStart, shiftEnd);
  const n = Number(minutes);
  const valid = minutes.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= 480;
  const targetHours = valid ? Math.max(0, shiftHours - n / 60) : null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (!valid) {
      setError("Enter a whole number of minutes between 0 and 480.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateEmployeeRelaxMinutes(employeeId, n);
      if (res?.error) setError(res.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 border-t border-slate-50 pt-4">
      <label className="label flex items-center gap-1.5">
        <Coffee className="h-3.5 w-3.5" /> Tracker relaxation
      </label>
      <p className="mb-2 text-xs text-slate-400">
        Paid break time allowed per working day before the tracker target applies. The daily target is the
        shift length minus this — 90 minutes is the standard.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0}
          max={480}
          step={1}
          inputMode="numeric"
          value={minutes}
          onChange={(e) => {
            setMinutes(e.target.value);
            setSaved(false);
            setError(null);
          }}
          className="input w-28"
        />
        <span className="shrink-0 text-xs text-slate-400">minutes / day</span>
        <button type="submit" disabled={pending} className="btn-ghost shrink-0">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
      </div>
      {targetHours !== null && (
        <p className="mt-1.5 text-xs text-slate-500">
          Daily tracking target:{" "}
          <span className="font-semibold text-navy">{formatHours(targetHours)}</span> on a{" "}
          {formatHours(shiftHours)} shift.
        </p>
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {saved && !error && <p className="mt-1.5 text-xs text-emerald-600">Saved.</p>}
    </form>
  );
}

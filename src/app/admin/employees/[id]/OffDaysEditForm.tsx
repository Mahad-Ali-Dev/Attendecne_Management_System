"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEmployeeOffDays } from "../actions";
import { CalendarOff, Loader2 } from "lucide-react";

const DAY_LABELS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function OffDaysEditForm({
  employeeId,
  initialOffDays,
}: {
  employeeId: string;
  initialOffDays: number[];
}) {
  const router = useRouter();
  const [offDays, setOffDays] = useState<number[]>(initialOffDays);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle(day: number) {
    setSaved(false);
    setError(null);
    setOffDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (offDays.length === 7) {
      setError("At least one day has to be a working day.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateEmployeeOffDays(employeeId, offDays);
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
        <CalendarOff className="h-3.5 w-3.5" /> Rest days
      </label>
      <p className="mb-2 text-xs text-slate-400">
        For employees who work weekends instead of weekdays — select whichever days this employee
        is normally off, so hours worked on other days count correctly.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {DAY_LABELS.map((d) => {
          const active = offDays.includes(d.value);
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => toggle(d.value)}
              className={`flex h-9 w-11 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                active
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {d.label}
            </button>
          );
        })}
        <button type="submit" disabled={pending} className="btn-ghost shrink-0">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {saved && !error && <p className="mt-1.5 text-xs text-emerald-600">Saved.</p>}
    </form>
  );
}

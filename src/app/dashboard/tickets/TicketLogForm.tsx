"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logTickets } from "./actions";
import { formatDate } from "@/lib/format";
import type { TicketReport } from "@/lib/types";
import { CheckCircle2, Loader2, Lock, Ticket } from "lucide-react";

export function TicketLogForm({
  todayKey,
  entries,
}: {
  todayKey: string;
  entries: TicketReport[];
}) {
  const router = useRouter();
  // Lookup so a picked date can show whether it's already been logged (and locked).
  const byDate = useMemo(() => new Map(entries.map((e) => [e.work_date, e.tickets_solved])), [entries]);

  const [date, setDate] = useState(todayKey);
  const [count, setCount] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedDate, setSavedDate] = useState<string | null>(null);

  const loggedCount = byDate.get(date);
  const isLocked = loggedCount !== undefined; // already logged → final, no editing

  function onDateChange(next: string) {
    setDate(next);
    setCount("");
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(count);
    if (count.trim() === "" || !Number.isInteger(n) || n < 0) {
      setError("Enter a whole number of tickets (0 or more).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await logTickets(date, n);
      if (res?.error) setError(res.error);
      else {
        setSavedDate(date);
        setCount("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-navy">Log tickets solved</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Record each day once. A logged count is final — contact an admin if it needs correcting.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={date}
                max={todayKey}
                onChange={(e) => onDateChange(e.target.value)}
              />
            </div>
            {!isLocked && (
              <div>
                <label className="label">Tickets solved</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  className="input"
                  placeholder="e.g. 12"
                  value={count}
                  onChange={(e) => {
                    setCount(e.target.value);
                    setError(null);
                  }}
                />
              </div>
            )}
          </div>

          {isLocked ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <Lock className="h-4 w-4 shrink-0 text-slate-400" />
              <span>
                <span className="font-semibold text-navy">{loggedCount}</span>{" "}
                {loggedCount === 1 ? "ticket" : "tickets"} already logged for {formatDate(date)}. This can&apos;t be
                changed — pick another day to log.
              </span>
            </div>
          ) : (
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              Log tickets
            </button>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {savedDate && !error && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Logged for {formatDate(savedDate)}.
            </p>
          )}
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-navy">Your ticket history</h2>
          <p className="text-xs text-slate-400">
            {entries.length} {entries.length === 1 ? "day" : "days"} logged.
          </p>
        </div>
        {entries.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">
            No tickets logged yet. Record today&apos;s above.
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
    </div>
  );
}

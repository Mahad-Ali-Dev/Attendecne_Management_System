"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logTickets } from "./actions";
import { formatDate } from "@/lib/format";
import type { TicketReport } from "@/lib/types";
import { Loader2, Ticket } from "lucide-react";

export function TicketLogForm({
  todayKey,
  entries,
}: {
  todayKey: string;
  entries: TicketReport[];
}) {
  const router = useRouter();
  // Quick lookup so picking a date pre-fills whatever was already logged for it.
  const byDate = useMemo(() => new Map(entries.map((e) => [e.work_date, e.tickets_solved])), [entries]);

  const [date, setDate] = useState(todayKey);
  const [count, setCount] = useState<string>(byDate.get(todayKey)?.toString() ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const existing = byDate.has(date);

  function onDateChange(next: string) {
    setDate(next);
    setCount(byDate.get(next)?.toString() ?? "");
    setError(null);
    setSaved(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
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
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-navy">Log tickets solved</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
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
                setSaved(false);
                setError(null);
              }}
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary h-[42px] shrink-0">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {existing ? "Update" : "Save"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && (
          <p className="text-sm text-emerald-600">Saved {formatDate(date)}.</p>
        )}
      </form>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-navy">Your ticket history</h2>
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
                  <td className="px-6 py-3">{formatDate(e.work_date)}</td>
                  <td className="px-6 py-3 text-right font-semibold tabular-nums text-navy">
                    {e.tickets_solved}
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

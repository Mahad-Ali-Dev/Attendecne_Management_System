"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logTickets } from "./tickets/actions";
import { CheckCircle2, Clock, Loader2, Ticket } from "lucide-react";

/**
 * Compact ticket logger on a support agent's dashboard. Logging the day's
 * tickets is required before they can check out (enforced in the checkout
 * action too), so this sits right under the attendance widget. A day is logged
 * once — after that it shows a confirmation instead of the input.
 */
export function DashboardTicketLog({
  workDate,
  loggedCount,
  hasCheckedIn,
}: {
  /** The date to log tickets for — the open shift's work day. */
  workDate: string;
  /** Tickets already logged for that day, or null if none yet. */
  loggedCount: number | null;
  /** Whether the agent has checked in — tickets can't be logged otherwise. */
  hasCheckedIn: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (loggedCount !== null) {
    return (
      <div className="card flex items-center gap-2.5 p-4 text-sm">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
        <span className="text-slate-600">
          <span className="font-semibold text-navy">{loggedCount}</span>{" "}
          {loggedCount === 1 ? "ticket" : "tickets"} logged for today — you&apos;re clear to check out.
        </span>
      </div>
    );
  }

  if (!hasCheckedIn) {
    return (
      <div className="card flex items-center gap-2.5 p-4 text-sm">
        <Clock className="h-5 w-5 shrink-0 text-slate-400" />
        <span className="text-slate-600">Check in above before you can log today&apos;s tickets.</span>
      </div>
    );
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
      const res = await logTickets(workDate, n);
      if (res?.error) setError(res.error);
      else {
        setCount("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card p-5">
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4 text-brand-600" />
        <h2 className="font-semibold text-navy">Today&apos;s tickets</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Log how many support tickets you solved today. Required before you can check out — and it can&apos;t be
        changed once saved.
      </p>
      <div className="mt-4 flex gap-2">
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
        <button type="submit" disabled={pending} className="btn-primary shrink-0">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
          Log
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}

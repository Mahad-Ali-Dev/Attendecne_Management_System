"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkIn, checkOut } from "./actions";
import { LogIn, LogOut, Loader2, Clock } from "lucide-react";
import { formatTime } from "@/lib/format";
import type { Attendance } from "@/lib/types";

export function AttendanceWidget({ today }: { today: Attendance | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"in" | "out" | null>(null);

  const hasCheckedIn = !!today?.check_in;
  const hasCheckedOut = !!today?.check_out;

  function run(action: "in" | "out") {
    setBusy(action);
    startTransition(async () => {
      const res = action === "in" ? await checkIn() : await checkOut();
      setBusy(null);
      if (!("error" in res)) router.refresh();
    });
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 text-slate-500">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">Today&apos;s attendance</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Check-in
          </div>
          <div className="mt-1 text-2xl font-bold text-navy">
            {formatTime(today?.check_in ?? null)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Check-out
          </div>
          <div className="mt-1 text-2xl font-bold text-navy">
            {formatTime(today?.check_out ?? null)}
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={() => run("in")}
          disabled={hasCheckedIn || pending}
          className="btn-primary flex-1"
        >
          {busy === "in" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {hasCheckedIn ? "Checked in" : "Check in"}
        </button>
        <button
          onClick={() => run("out")}
          disabled={!hasCheckedIn || hasCheckedOut || pending}
          className="btn-dark flex-1"
        >
          {busy === "out" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          {hasCheckedOut ? "Checked out" : "Check out"}
        </button>
      </div>

      {hasCheckedOut && (
        <p className="mt-3 text-center text-sm text-emerald-600">
          ✓ Your attendance for today is complete. Have a great evening!
        </p>
      )}
    </div>
  );
}

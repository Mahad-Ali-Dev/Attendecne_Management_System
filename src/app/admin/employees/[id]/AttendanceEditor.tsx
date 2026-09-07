"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertAttendance } from "../actions";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatTime, hoursBetween, isoToPktTimeInput, todayISO } from "@/lib/format";
import type { Attendance } from "@/lib/types";
import { Loader2, Pencil } from "lucide-react";

export function AttendanceEditor({ employeeId, history }: { employeeId: string; history: Attendance[] }) {
  const router = useRouter();
  const [editDate, setEditDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function edit(r: Attendance) {
    setEditDate(r.work_date);
    setCheckIn(isoToPktTimeInput(r.check_in));
    setCheckOut(isoToPktTimeInput(r.check_out));
    setError(null);
    setSaved(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await upsertAttendance(employeeId, editDate, checkIn, checkOut);
      if (res?.error) {
        setError(res.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="card overflow-hidden lg:col-span-2">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="font-semibold text-navy">Attendance history</h2>
        <p className="text-xs text-slate-400">Last 30 records</p>
      </div>

      <form onSubmit={onSubmit} className="border-b border-slate-100 bg-slate-50 px-6 py-4">
        <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-slate-400">
          Add or correct a record
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              required
              max={todayISO()}
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Check-in</label>
            <input
              type="time"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Check-out</label>
            <input
              type="time"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="input"
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {saved && !error && <p className="mt-2 text-xs text-emerald-600">Saved.</p>}
      </form>

      {history.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-400">No attendance recorded yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">In</th>
              <th className="px-6 py-3 font-medium">Out</th>
              <th className="px-6 py-3 font-medium">Hours</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {history.map((r) => (
              <tr key={r.id} className="text-slate-600">
                <td className="px-6 py-3 font-medium text-navy">{formatDate(r.work_date)}</td>
                <td className="px-6 py-3">{formatTime(r.check_in)}</td>
                <td className="px-6 py-3">{formatTime(r.check_out)}</td>
                <td className="px-6 py-3">{hoursBetween(r.check_in, r.check_out)}</td>
                <td className="px-6 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => edit(r)}
                    aria-label={`Edit ${r.work_date}`}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

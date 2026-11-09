"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertTicketReport, deleteTicketReport } from "../actions";
import { Modal } from "@/components/Modal";
import { StatCard } from "@/components/StatCard";
import { TicketsChart, type TicketChartRow } from "@/components/TicketsChart";
import { formatDate, pktNow } from "@/lib/format";
import type { TicketReport } from "@/lib/types";
import { Ticket, CalendarDays, Gauge, Sigma, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface TicketEdit {
  mode: "add" | "edit";
  workDate: string;
  count: string;
}

/**
 * Support-ticket summary for one employee: month and all-time stat cards, then
 * a graph of tickets solved per day with a tab to swap in the day-by-day table.
 * With `editable` (admin only), an admin can add a missed day, correct a count,
 * or delete an entry — agents log once and can't edit, so this is the fix path.
 */
export function EmployeeTickets({
  monthLabel,
  monthStart,
  monthEnd,
  monthEntries,
  ticketsThisMonth,
  ticketsAllTime,
  employeeId,
  editable = false,
}: {
  monthLabel: string;
  /** First and last day (YYYY-MM-DD) of the selected month to chart, capped to today. */
  monthStart: string;
  monthEnd: string;
  /** This month's ticket rows, most recent first. */
  monthEntries: TicketReport[];
  ticketsThisMonth: number;
  ticketsAllTime: number;
  employeeId?: string;
  /** Show the admin add / edit / delete controls. */
  editable?: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<"chart" | "table">("chart");
  const [modal, setModal] = useState<TicketEdit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TicketReport | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canEdit = editable && !!employeeId;
  const todayKey = pktNow().toISOString().slice(0, 10);
  const daysLogged = monthEntries.length;
  const avgPerDay = daysLogged > 0 ? ticketsThisMonth / daysLogged : 0;

  // One bar per calendar day in the month (zero-filled), so the daily shape
  // reads at a glance — the table still lists only days with a real entry.
  const chartData = useMemo<TicketChartRow[]>(() => {
    const byDate = new Map(monthEntries.map((e) => [e.work_date, e.tickets_solved]));
    const rows: TicketChartRow[] = [];
    const start = Date.parse(`${monthStart}T00:00:00Z`);
    const end = Date.parse(`${monthEnd}T00:00:00Z`);
    for (let t = start; t <= end; t += 86_400_000) {
      const date = new Date(t).toISOString().slice(0, 10);
      rows.push({
        date,
        label: new Date(t).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", timeZone: "UTC" }),
        tickets: byDate.get(date) ?? 0,
      });
    }
    return rows;
  }, [monthEntries, monthStart, monthEnd]);

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold transition ${
      active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:text-navy"
    }`;

  function openAdd() {
    const defaultDate = monthEnd < todayKey ? monthEnd : todayKey;
    setModal({ mode: "add", workDate: defaultDate, count: "" });
    setError(null);
  }

  function openEdit(e: TicketReport) {
    setModal({ mode: "edit", workDate: e.work_date, count: String(e.tickets_solved) });
    setError(null);
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!modal || !employeeId) return;
    const n = Number(modal.count);
    if (modal.count.trim() === "" || !Number.isInteger(n) || n < 0) {
      setError("Enter a whole number of tickets (0 or more).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await upsertTicketReport(employeeId, modal.workDate, n);
      if (res?.error) setError(res.error);
      else {
        setModal(null);
        router.refresh();
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget || !employeeId) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const res = await deleteTicketReport(employeeId, deleteTarget.work_date);
      if (res?.error) setDeleteError(res.error);
      else {
        setDeleteTarget(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">Support tickets</h2>
        <p className="mt-1 text-sm text-slate-500">Tickets solved in {monthLabel}, and all time.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Ticket className="h-5 w-5" />}
          label={`Solved · ${monthLabel.split(" ")[0]}`}
          value={ticketsThisMonth}
          accent="text-brand-600"
        />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Days logged" value={daysLogged} />
        <StatCard
          icon={<Gauge className="h-5 w-5" />}
          label="Avg / logged day"
          value={daysLogged > 0 ? avgPerDay.toFixed(1) : "—"}
        />
        <StatCard icon={<Sigma className="h-5 w-5" />} label="All time" value={ticketsAllTime} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-semibold text-navy">Daily tickets</h3>
            <p className="text-xs text-slate-400">Tickets solved each day in {monthLabel}.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              <button type="button" onClick={() => setView("chart")} className={tabClass(view === "chart")}>
                Graph
              </button>
              <button type="button" onClick={() => setView("table")} className={tabClass(view === "table")}>
                Table
              </button>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
              >
                <Plus className="h-3.5 w-3.5" /> Add / correct
              </button>
            )}
          </div>
        </div>

        {daysLogged === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">No tickets logged in {monthLabel}.</p>
        ) : view === "chart" ? (
          <div className="p-6">
            <TicketsChart data={chartData} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 text-right font-medium">Tickets solved</th>
                {canEdit && <th className="px-6 py-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthEntries.map((e) => (
                <tr key={e.id} className="text-slate-600">
                  <td className="px-6 py-3">{formatDate(e.work_date)}</td>
                  <td className="px-6 py-3 text-right font-semibold tabular-nums text-navy">{e.tickets_solved}</td>
                  {canEdit && (
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          aria-label={`Edit ${e.work_date}`}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(e);
                            setDeleteError(null);
                          }}
                          aria-label={`Delete ${e.work_date}`}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === "add" ? "Add ticket count" : `Edit tickets — ${formatDate(modal.workDate)}`}
          onClose={() => setModal(null)}
        >
          <form onSubmit={onSubmit} className="space-y-4">
            {modal.mode === "add" && (
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  required
                  max={todayKey}
                  value={modal.workDate}
                  onChange={(ev) => setModal({ ...modal, workDate: ev.target.value })}
                  className="input"
                />
              </div>
            )}
            <div>
              <label className="label">Tickets solved</label>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                required
                value={modal.count}
                onChange={(ev) => {
                  setModal({ ...modal, count: ev.target.value });
                  setError(null);
                }}
                className="input"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={pending} className="btn-primary">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete ticket entry" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600">
            Delete the ticket entry for{" "}
            <strong className="text-navy">{formatDate(deleteTarget.work_date)}</strong> (
            {deleteTarget.tickets_solved} {deleteTarget.tickets_solved === 1 ? "ticket" : "tickets"})? This can&apos;t
            be undone.
          </p>
          {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
          <div className="flex justify-end gap-2 pt-5">
            <button type="button" onClick={() => setDeleteTarget(null)} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="btn bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

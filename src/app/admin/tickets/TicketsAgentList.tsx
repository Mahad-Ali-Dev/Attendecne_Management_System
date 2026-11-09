"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Modal } from "@/components/Modal";
import { formatDate } from "@/lib/format";
import { upsertTicketReport, deleteTicketReport } from "@/app/admin/employees/actions";
import { ChevronDown, ExternalLink, Pencil, Trash2, Plus, Loader2 } from "lucide-react";

export interface AgentTicketRow {
  id: string;
  name: string;
  position: string | null;
  avatarUrl: string | null;
  monthTotal: number;
  allTime: number;
  /** Every day of the selected month (up to today for the current month), zero-filled. */
  days: { date: string; count: number }[];
}

interface CountEdit {
  agentId: string;
  agentName: string;
  date: string;
  /** "" when adding a day that had no entry yet. */
  count: string;
}

interface DeleteTarget {
  agentId: string;
  agentName: string;
  date: string;
  count: number;
}

/**
 * One collapsed row per support agent — name, this month's total and the
 * all-time total — that expands on click to reveal a day-by-day table of that
 * agent's tickets for the selected month. Admins can add, correct or delete any
 * day's count inline from the expanded table.
 */
export function TicketsAgentList({
  rows,
  monthLabel,
  monthKey,
}: {
  rows: AgentTicketRow[];
  monthLabel: string;
  monthKey: string;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState<CountEdit | null>(null);
  const [del, setDel] = useState<DeleteTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const monthShort = monthLabel.split(" ")[0];

  function openEdit(agent: AgentTicketRow, date: string, count: number) {
    setEdit({ agentId: agent.id, agentName: agent.name, date, count: count ? String(count) : "" });
    setError(null);
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!edit) return;
    const n = Number(edit.count);
    if (edit.count.trim() === "" || !Number.isInteger(n) || n < 0) {
      setError("Enter a whole number of tickets (0 or more).");
      return;
    }
    setError(null);
    startSave(async () => {
      const res = await upsertTicketReport(edit.agentId, edit.date, n);
      if (res?.error) setError(res.error);
      else {
        setEdit(null);
        router.refresh();
      }
    });
  }

  function confirmDelete() {
    if (!del) return;
    setDelError(null);
    startDelete(async () => {
      const res = await deleteTicketReport(del.agentId, del.date);
      if (res?.error) setDelError(res.error);
      else {
        setDel(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="card divide-y divide-slate-100 overflow-hidden">
      {/* Column labels (wide screens only) */}
      <div className="hidden items-center gap-4 bg-slate-50 px-6 py-3 text-xs font-medium uppercase tracking-wide text-slate-400 sm:flex">
        <span className="flex-1">Agent</span>
        <span className="w-28 text-right">{monthShort} total</span>
        <span className="w-24 text-right">All time</span>
        <span className="w-5" />
      </div>

      {rows.map((row) => {
        const isOpen = openId === row.id;
        return (
          <div key={row.id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : row.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-4 px-6 py-4 text-left text-sm transition hover:bg-slate-50"
            >
              <Avatar name={row.name} src={row.avatarUrl} size={30} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-navy">{row.name}</div>
                <div className="truncate text-xs text-slate-400">{row.position || "Support"}</div>
              </div>
              <div className="w-28 text-right">
                <div className="font-semibold tabular-nums text-brand-600">{row.monthTotal}</div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:hidden">
                  {monthShort} total
                </div>
              </div>
              <div className="w-24 text-right">
                <div className="font-semibold tabular-nums text-navy">{row.allTime}</div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:hidden">
                  All time
                </div>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-5 sm:px-6">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-navy">Daily tickets · {monthLabel}</h4>
                  <Link
                    href={`/admin/employees/${row.id}?month=${monthKey}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                  >
                    Open full profile <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {row.days.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">No days to show for {monthLabel}.</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Date</th>
                          <th className="px-4 py-2.5 text-right font-medium">Tickets solved</th>
                          <th className="px-4 py-2.5 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {row.days.map((d) => (
                          <tr key={d.date} className={d.count ? "text-slate-700" : "text-slate-400"}>
                            <td className="px-4 py-2.5">{formatDate(d.date)}</td>
                            <td
                              className={`px-4 py-2.5 text-right tabular-nums ${
                                d.count ? "font-semibold text-navy" : ""
                              }`}
                            >
                              {d.count || "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                {d.count ? (
                                  <>
                                    <button
                                      onClick={() => openEdit(row, d.date, d.count)}
                                      aria-label={`Edit ${d.date}`}
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDel({
                                          agentId: row.id,
                                          agentName: row.name,
                                          date: d.date,
                                          count: d.count,
                                        });
                                        setDelError(null);
                                      }}
                                      aria-label={`Delete ${d.date}`}
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => openEdit(row, d.date, 0)}
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50"
                                  >
                                    <Plus className="h-3 w-3" /> Add
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-slate-100 bg-slate-50 font-semibold text-navy">
                        <tr>
                          <td className="px-4 py-2.5">{monthShort} total</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-brand-600">{row.monthTotal}</td>
                          <td className="px-4 py-2.5"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {edit && (
        <Modal
          title={`${edit.count === "" ? "Add" : "Edit"} tickets — ${formatDate(edit.date)}`}
          onClose={() => setEdit(null)}
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-slate-500">
              {edit.agentName} · {formatDate(edit.date)}
            </p>
            <div>
              <label className="label">Tickets solved</label>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                required
                autoFocus
                value={edit.count}
                onChange={(ev) => {
                  setEdit({ ...edit, count: ev.target.value });
                  setError(null);
                }}
                className="input"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEdit(null)} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {del && (
        <Modal title="Delete ticket entry" onClose={() => setDel(null)}>
          <p className="text-sm text-slate-600">
            Delete {del.agentName}&apos;s entry for{" "}
            <strong className="text-navy">{formatDate(del.date)}</strong> ({del.count}{" "}
            {del.count === 1 ? "ticket" : "tickets"})? This can&apos;t be undone.
          </p>
          {delError && <p className="mt-2 text-xs text-red-600">{delError}</p>}
          <div className="flex justify-end gap-2 pt-5">
            <button type="button" onClick={() => setDel(null)} className="btn-ghost">
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

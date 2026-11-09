import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/StatCard";
import { TicketsAgentList, type AgentTicketRow } from "./TicketsAgentList";
import { fetchAll } from "@/lib/fetchAll";
import {
  formatMonthLabel,
  isActiveInMonth,
  monthKeyOf,
  pktNow,
  shiftMonthKey,
} from "@/lib/format";
import type { Profile, TicketReport } from "@/lib/types";
import { Ticket, Users, Sigma, ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  await requireAdmin();
  const supabase = createClient();

  const todayKey = pktNow().toISOString().slice(0, 10);
  const currentMonthKey = monthKeyOf(pktNow());
  const requested =
    searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month) ? searchParams.month : currentMonthKey;
  const monthKey = requested > currentMonthKey ? currentMonthKey : requested; // no browsing into the future

  const [profilesData, allReports] = await Promise.all([
    supabase.from("profiles").select("*").neq("role", "ADMIN").eq("is_support", true).order("full_name"),
    // Every ticket row, so we can show the selected month AND an all-time total
    // per agent in one pass. A unique order keeps the paging stable.
    fetchAll<TicketReport>((from, to) =>
      supabase.from("ticket_reports").select("*").order("id").range(from, to)
    ),
  ]);

  // Disabled agents follow the same month boundary as every other stat: they
  // stay in the month they left and earlier, and drop out afterwards.
  const agents = ((profilesData.data ?? []) as Profile[]).filter((e) =>
    isActiveInMonth(e.disabled_at, monthKey)
  );

  // Per agent: a date→count map for the month, plus a running all-time total.
  const monthCounts = new Map<string, Map<string, number>>();
  const allTimeByUser = new Map<string, number>();
  for (const r of allReports) {
    allTimeByUser.set(r.user_id, (allTimeByUser.get(r.user_id) ?? 0) + r.tickets_solved);
    if (r.work_date.slice(0, 7) === monthKey) {
      let m = monthCounts.get(r.user_id);
      if (!m) monthCounts.set(r.user_id, (m = new Map()));
      m.set(r.work_date, (m.get(r.work_date) ?? 0) + r.tickets_solved);
    }
  }

  // The day columns: 1..today for the current month, else the whole month.
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDay = monthKey === currentMonthKey ? Number(todayKey.slice(8, 10)) : daysInMonth;
  const dayKeys = Array.from({ length: lastDay }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`);

  const rows: AgentTicketRow[] = agents.map((agent) => {
    const m = monthCounts.get(agent.id);
    const monthTotal = m ? Array.from(m.values()).reduce((s, n) => s + n, 0) : 0;
    return {
      id: agent.id,
      name: agent.full_name,
      position: agent.position,
      avatarUrl: agent.avatar_url,
      monthTotal,
      allTime: allTimeByUser.get(agent.id) ?? 0,
      // One entry per day of the month (zero-filled) for the expandable table.
      days: dayKeys.map((d) => ({ date: d, count: m?.get(d) ?? 0 })),
    };
  });

  const monthGrandTotal = rows.reduce((s, r) => s + r.monthTotal, 0);
  const allTimeGrandTotal = rows.reduce((s, r) => s + r.allTime, 0);

  const monthLabel = formatMonthLabel(monthKey);
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  const nextMonthKey = shiftMonthKey(monthKey, 1);
  const nextDisabled = nextMonthKey > currentMonthKey;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Tickets</h1>
          <p className="mt-1 text-sm text-slate-500">
            Support tickets each agent solved per day, with monthly and all-time totals.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <Link
            href={`/admin/tickets?month=${prevMonthKey}`}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-navy">{monthLabel}</span>
          {nextDisabled ? (
            <span className="flex h-8 w-8 items-center justify-center text-slate-200">
              <ChevronRight className="h-4 w-4" />
            </span>
          ) : (
            <Link
              href={`/admin/tickets?month=${nextMonthKey}`}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={<Users className="h-5 w-5" />} label="Support agents" value={agents.length} />
        <StatCard
          icon={<Ticket className="h-5 w-5" />}
          label={`Tickets · ${monthLabel}`}
          value={monthGrandTotal}
          accent="text-brand-600"
        />
        <StatCard icon={<Sigma className="h-5 w-5" />} label="Tickets all time" value={allTimeGrandTotal} />
      </div>

      {rows.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-slate-400">
          No customer-support agents yet. Open an employee and turn on{" "}
          <span className="font-medium text-slate-500">Customer support agent</span> to start tracking tickets.
        </div>
      ) : (
        <TicketsAgentList rows={rows} monthLabel={monthLabel} monthKey={monthKey} />
      )}

      <p className="text-center text-xs text-slate-400">
        Click an agent to see their day-by-day tickets for {monthLabel}. Agents record their own counts from
        their Tickets tab.
      </p>
    </div>
  );
}

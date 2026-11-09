import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/StatCard";
import { type ExtendedStatus } from "@/components/StatusBadge";
import { TeamMembersTable, type TeamRow } from "./TeamMembersTable";
import { fetchAll } from "@/lib/fetchAll";
import { leaveDatesSet } from "@/lib/payroll";
import { buildReportRow } from "@/lib/report";
import { productivityPercent } from "@/lib/productivity";
import {
  formatMonthLabel,
  isShiftActive,
  isWorkingDay,
  monthKeyOf,
  pktNow,
  shiftMonthKey,
} from "@/lib/format";
import type { Attendance, LeaveRequest, Profile, ProductivitySession, TicketReport } from "@/lib/types";
import { Users, UserCheck, UserX, CalendarOff, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

// A tracked day under this productivity percentage is flagged low.
const LOW_PRODUCTIVITY_PCT = 50;

export const dynamic = "force-dynamic";

function groupByUser<T extends { user_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const list = map.get(r.user_id);
    if (list) list.push(r);
    else map.set(r.user_id, [r]);
  }
  return map;
}

export default async function TeamPage({ searchParams }: { searchParams: { month?: string } }) {
  const lead = await getCurrentProfile();
  if (lead.role !== "TEAM_LEAD") redirect("/dashboard");
  const supabase = createClient();

  const todayKey = pktNow().toISOString().slice(0, 10);
  const currentMonthKey = monthKeyOf(pktNow());
  const requested =
    searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month) ? searchParams.month : currentMonthKey;
  const monthKey = requested > currentMonthKey ? currentMonthKey : requested; // no browsing into the future
  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;

  // RLS scopes attendance/leave/productivity/tickets to this lead's own team,
  // so these "whole month" reads only ever return team members' rows.
  const [members, monthAtt, todayAtt, leaves, sessions, tickets] = await Promise.all([
    fetchAll<Profile>((f, t) =>
      supabase.from("profiles").select("*").eq("team_lead_id", lead.id).order("full_name").order("id").range(f, t)
    ),
    fetchAll<Attendance>((f, t) =>
      supabase.from("attendance").select("*").gte("work_date", monthStart).lte("work_date", monthEnd).order("id").range(f, t)
    ),
    fetchAll<Attendance>((f, t) =>
      supabase.from("attendance").select("*").eq("work_date", todayKey).order("id").range(f, t)
    ),
    fetchAll<LeaveRequest>((f, t) =>
      supabase.from("leave_requests").select("*").eq("status", "APPROVED").order("id").range(f, t)
    ),
    fetchAll<ProductivitySession>((f, t) =>
      supabase
        .from("productivity_sessions")
        .select("*")
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd)
        .order("id")
        .range(f, t)
    ),
    fetchAll<TicketReport>((f, t) =>
      supabase.from("ticket_reports").select("*").gte("work_date", monthStart).lte("work_date", monthEnd).order("id").range(f, t)
    ),
  ]);

  const attByUser = groupByUser(monthAtt);
  const leaveByUser = groupByUser(leaves);
  const sessByUser = groupByUser(sessions);
  const ticketByUser = groupByUser(tickets);
  const todayByUser = new Map(todayAtt.map((a) => [a.user_id, a]));

  const nowPkt = pktNow();
  const nowMinutes = nowPkt.getUTCHours() * 60 + nowPkt.getUTCMinutes();
  const isCurrentMonth = monthKey === currentMonthKey;

  const rows: TeamRow[] = members.map((m) => {
    const leaveDates = leaveDatesSet(leaveByUser.get(m.id) ?? []);
    const memberSessions = sessByUser.get(m.id) ?? [];
    const report = buildReportRow(m, monthKey, todayKey, attByUser.get(m.id) ?? [], leaveDates, memberSessions);
    const memberTickets = ticketByUser.get(m.id) ?? [];
    const ticketsThisMonth = memberTickets.reduce((sum, r) => sum + r.tickets_solved, 0);
    const todayTickets = memberTickets
      .filter((r) => r.work_date === todayKey)
      .reduce((sum, r) => sum + r.tickets_solved, 0);
    const todayRec = todayByUser.get(m.id);
    const onLeaveToday = leaveDates.has(todayKey);
    const restToday = !isWorkingDay(new Date(`${todayKey}T00:00:00Z`), m.off_days);
    const todayStatus: ExtendedStatus = onLeaveToday
      ? "ON_LEAVE"
      : todayRec?.check_in
        ? todayRec.status
        : restToday
          ? "REST_DAY"
          : "ABSENT";
    // Today's tracked time, split productive / unproductive.
    const todaySession = memberSessions.find((s) => s.work_date === todayKey);
    const todayProdSec = todaySession?.total_productive_seconds ?? 0;
    const todayUnprodSec = todaySession?.total_unproductive_seconds ?? 0;
    // Tracker off: today, the member should be working — they've checked in, or
    // their shift is currently running — but nothing has been tracked yet, and
    // it's not a rest day or approved leave.
    const trackerOff =
      isCurrentMonth &&
      !restToday &&
      !onLeaveToday &&
      !todaySession &&
      (!!todayRec?.check_in || isShiftActive(m.shift_start, m.shift_end, nowMinutes));
    // Month's tracked time, split productive / unproductive.
    const prodSec = memberSessions.reduce((sum, x) => sum + x.total_productive_seconds, 0);
    const unprodSec = memberSessions.reduce((sum, x) => sum + x.total_unproductive_seconds, 0);
    const prodPct = productivityPercent(prodSec, unprodSec);
    const lowProductivity = prodPct !== null && prodPct < LOW_PRODUCTIVITY_PCT;
    return {
      id: m.id,
      name: m.full_name,
      avatarUrl: m.avatar_url,
      position: m.position,
      isSupport: m.is_support,
      trackerOff,
      lowProductivity,
      todayStatus,
      todayCheckIn: todayRec?.check_in ?? null,
      todayCheckOut: todayRec?.check_out ?? null,
      todayTrackedHours: (todayProdSec + todayUnprodSec) / 3600,
      todayProductiveHours: todayProdSec / 3600,
      todayUnproductiveHours: todayUnprodSec / 3600,
      todayTickets,
      presentDays: report.presentDays,
      absentDays: report.absentDays,
      leaveDays: report.leaveDays,
      completedHours: report.completedHours,
      requiredHours: report.requiredHours,
      monthTrackedHours: (prodSec + unprodSec) / 3600,
      monthProductiveHours: prodSec / 3600,
      monthUnproductiveHours: unprodSec / 3600,
      monthTickets: ticketsThisMonth,
    };
  });

  const presentToday = members.filter((m) => todayByUser.get(m.id)?.check_in).length;
  const onLeaveTodayCount = rows.filter((r) => r.todayStatus === "ON_LEAVE").length;
  const absentTodayCount = rows.filter((r) => r.todayStatus === "ABSENT").length;
  const anySupport = members.some((m) => m.is_support);
  const trackerOffMembers = rows.filter((r) => r.trackerOff);
  const lowProductivityMembers = rows.filter((r) => r.lowProductivity);

  const monthLabel = formatMonthLabel(monthKey);
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  const nextMonthKey = shiftMonthKey(monthKey, 1);
  const nextDisabled = nextMonthKey > currentMonthKey;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">My Team</h1>
          <p className="mt-1 text-sm text-slate-500">
            {members.length} {members.length === 1 ? "member" : "members"} · attendance, hours, leave and tracking.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <Link
            href={`/dashboard/team?month=${prevMonthKey}`}
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
              href={`/dashboard/team?month=${nextMonthKey}`}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {(trackerOffMembers.length > 0 || lowProductivityMembers.length > 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="space-y-0.5">
            <span className="font-semibold">Needs attention</span>
            {trackerOffMembers.length > 0 && (
              <p>
                <span className="font-medium text-red-600">Tracker off now</span> ({trackerOffMembers.length}):{" "}
                {trackerOffMembers.map((r) => r.name).join(", ")}
              </p>
            )}
            {lowProductivityMembers.length > 0 && (
              <p>
                <span className="font-medium text-amber-700">Low productivity</span> ({lowProductivityMembers.length}):{" "}
                {lowProductivityMembers.map((r) => r.name).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Team members" value={members.length} />
        <StatCard icon={<UserCheck className="h-5 w-5" />} label="Present today" value={presentToday} accent="text-emerald-600" />
        <StatCard icon={<CalendarOff className="h-5 w-5" />} label="On leave today" value={onLeaveTodayCount} accent="text-brand-600" />
        <StatCard icon={<UserX className="h-5 w-5" />} label="Absent today" value={absentTodayCount} accent="text-red-500" />
      </div>

      {members.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-slate-400">
          No one is on your team yet. An admin assigns your members.
        </div>
      ) : (
        <TeamMembersTable
          rows={rows}
          monthLabel={monthLabel}
          monthKey={monthKey}
          anySupport={anySupport}
          lowProductivityPct={LOW_PRODUCTIVITY_PCT}
        />
      )}
    </div>
  );
}

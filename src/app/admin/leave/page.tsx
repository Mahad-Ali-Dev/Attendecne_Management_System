import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/StatCard";
import { LeaveReviewTable } from "./LeaveReviewTable";
import { formatMonthLabel, monthKeyOf, pktNow, shiftMonthKey } from "@/lib/format";
import type { LeaveRequest, Profile } from "@/lib/types";
import { Clock3, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

/** A leave belongs to every month its dates touch — one running Sep 29 – Oct 2 shows under both. */
function overlapsMonth(r: LeaveRequest, monthKey: string): boolean {
  return r.start_date.slice(0, 7) <= monthKey && r.end_date.slice(0, 7) >= monthKey;
}

export default async function AdminLeavePage({ searchParams }: { searchParams: { month?: string } }) {
  await requireAdmin();
  const supabase = createClient();

  const [{ data: requestsData }, { data: profilesData }] = await Promise.all([
    supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("role", "EMPLOYEE"),
  ]);

  const requests = (requestsData ?? []) as LeaveRequest[];
  const employees = (profilesData ?? []) as Profile[];

  // Leave is requested in advance, so unlike the hours/salary pages this can
  // browse forward — but only as far as the latest leave on file, rather than
  // paging through empty future months.
  const currentMonthKey = monthKeyOf(pktNow());
  const firstMonth = requests.reduce(
    (min, r) => (r.start_date.slice(0, 7) < min ? r.start_date.slice(0, 7) : min),
    currentMonthKey
  );
  const lastMonth = requests.reduce(
    (max, r) => (r.end_date.slice(0, 7) > max ? r.end_date.slice(0, 7) : max),
    currentMonthKey
  );
  const requested = searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month) ? searchParams.month : currentMonthKey;
  const monthKey = requested < firstMonth ? firstMonth : requested > lastMonth ? lastMonth : requested;

  const monthRequests = requests.filter((r) => overlapsMonth(r, monthKey));
  const pendingCount = monthRequests.filter((r) => r.status === "PENDING").length;
  const approvedCount = monthRequests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = monthRequests.filter((r) => r.status === "REJECTED").length;

  // Pending requests are the actionable ones, so don't let the month filter
  // hide them: point at any waiting in other months (keyed by the month each starts in).
  const pendingElsewhere = new Map<string, number>();
  for (const r of requests) {
    if (r.status !== "PENDING" || overlapsMonth(r, monthKey)) continue;
    const key = r.start_date.slice(0, 7);
    pendingElsewhere.set(key, (pendingElsewhere.get(key) ?? 0) + 1);
  }
  const pendingElsewhereMonths = Array.from(pendingElsewhere.entries()).sort(([a], [b]) => a.localeCompare(b));

  const monthLabel = formatMonthLabel(monthKey);
  const prevDisabled = monthKey <= firstMonth;
  const nextDisabled = monthKey >= lastMonth;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Leave</h1>
          <p className="mt-1 text-sm text-slate-500">Review time-off requests from your team.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {prevDisabled ? (
            <span className="flex h-8 w-8 items-center justify-center text-slate-200">
              <ChevronLeft className="h-4 w-4" />
            </span>
          ) : (
            <Link
              href={`/admin/leave?month=${shiftMonthKey(monthKey, -1)}`}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          )}
          <span className="min-w-[9rem] text-center text-sm font-semibold text-navy">{monthLabel}</span>
          {nextDisabled ? (
            <span className="flex h-8 w-8 items-center justify-center text-slate-200">
              <ChevronRight className="h-4 w-4" />
            </span>
          ) : (
            <Link
              href={`/admin/leave?month=${shiftMonthKey(monthKey, 1)}`}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {pendingElsewhereMonths.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
          <Clock3 className="h-4 w-4 shrink-0" />
          <span className="font-medium">Waiting for review in other months:</span>
          {pendingElsewhereMonths.map(([key, count]) => (
            <Link
              key={key}
              href={`/admin/leave?month=${key}`}
              className="rounded-md bg-white px-2 py-0.5 font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
            >
              {formatMonthLabel(key)} ({count})
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<Clock3 className="h-5 w-5" />} label="Pending" value={pendingCount} accent="text-amber-600" />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Approved"
          value={approvedCount}
          accent="text-emerald-600"
        />
        <StatCard icon={<XCircle className="h-5 w-5" />} label="Rejected" value={rejectedCount} accent="text-red-500" />
      </div>

      <LeaveReviewTable
        requests={monthRequests}
        employees={employees}
        emptyMessage={`No leave requests in ${monthLabel}.`}
      />
    </div>
  );
}

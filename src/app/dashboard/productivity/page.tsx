import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/StatCard";
import { ProductivityTrendSection } from "./ProductivityTrendSection";
import { TodaySites } from "./TodaySites";
import { formatHours, formatMonthLabel, pktNow } from "@/lib/format";
import { productivityPercent } from "@/lib/productivity";
import type { ProductivitySession, SiteActivity } from "@/lib/types";
import { Clock, Percent, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductivityPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const todayKey = pktNow().toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7);
  const monthStart = `${monthKey}-01`;
  const sevenDayStart = new Date(Date.parse(`${todayKey}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
  // One fetch wide enough for both the "last 7 days" and "month to date"
  // views — the 7-day window can spill into the previous month early in a
  // new month, so this covers whichever start is earlier.
  const fetchStart = monthStart < sevenDayStart ? monthStart : sevenDayStart;

  const [{ data: sessionsData }, { data: sitesData }] = await Promise.all([
    supabase
      .from("productivity_sessions")
      .select("*")
      .eq("user_id", profile.id)
      .gte("work_date", fetchStart)
      .lte("work_date", todayKey)
      .order("work_date", { ascending: false }),
    supabase.from("site_activity").select("*").eq("user_id", profile.id).eq("work_date", todayKey),
  ]);

  const sessions = (sessionsData ?? []) as ProductivitySession[];
  const todaySites = (sitesData ?? []) as SiteActivity[];
  const today = sessions.find((s) => s.work_date === todayKey) ?? null;

  const todayTotalSeconds = (today?.total_productive_seconds ?? 0) + (today?.total_unproductive_seconds ?? 0);
  const todayPct = today ? productivityPercent(today.total_productive_seconds, today.total_unproductive_seconds) : null;

  const monthSessions = sessions.filter((s) => s.work_date >= monthStart);
  const monthProductiveSeconds = monthSessions.reduce((sum, s) => sum + s.total_productive_seconds, 0);
  const monthUnproductiveSeconds = monthSessions.reduce((sum, s) => sum + s.total_unproductive_seconds, 0);
  const monthTotalSeconds = monthProductiveSeconds + monthUnproductiveSeconds;
  const monthPct = productivityPercent(monthProductiveSeconds, monthUnproductiveSeconds);
  const monthLabel = formatMonthLabel(monthKey);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Productivity</h1>
        <p className="mt-1 text-sm text-slate-500">Your browser activity while working, tracked automatically.</p>
      </div>

      {today?.flagged_suspicious && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Today&apos;s session was flagged for review{today.flag_reason ? `: ${today.flag_reason}` : "."}</p>
            <p className="mt-1 text-amber-700">
              These are statistical anomalies (uniform input timing, minimal mouse movement, key-only activity, or
              rapid tab switching) for a human to review — not proof of misconduct. False positives happen.
            </p>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Today</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Total tracked today"
            value={formatHours(todayTotalSeconds / 3600)}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Productive today"
            value={formatHours((today?.total_productive_seconds ?? 0) / 3600)}
            accent="text-emerald-600"
          />
          <StatCard
            icon={<TrendingDown className="h-5 w-5" />}
            label="Unproductive today"
            value={formatHours((today?.total_unproductive_seconds ?? 0) / 3600)}
            accent="text-amber-600"
          />
          <StatCard
            icon={<Percent className="h-5 w-5" />}
            label="Productivity today"
            value={todayPct === null ? "—" : `${todayPct}%`}
            accent="text-brand-600"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{monthLabel}</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={<Clock className="h-5 w-5" />} label="Total tracked this month" value={formatHours(monthTotalSeconds / 3600)} />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Productive this month"
            value={formatHours(monthProductiveSeconds / 3600)}
            accent="text-emerald-600"
          />
          <StatCard
            icon={<TrendingDown className="h-5 w-5" />}
            label="Unproductive this month"
            value={formatHours(monthUnproductiveSeconds / 3600)}
            accent="text-amber-600"
          />
          <StatCard
            icon={<Percent className="h-5 w-5" />}
            label="Productivity this month"
            value={monthPct === null ? "—" : `${monthPct}%`}
            accent="text-brand-600"
          />
        </div>
      </div>

      <ProductivityTrendSection sessions={sessions} todayKey={todayKey} monthLabel={monthLabel} />

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-navy">Today&apos;s sites</h2>
        </div>
        <div className="p-4">
          <TodaySites sites={todaySites} />
        </div>
      </div>
    </div>
  );
}

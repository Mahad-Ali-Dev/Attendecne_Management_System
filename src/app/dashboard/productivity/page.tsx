import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/StatCard";
import { SiteBreakdownList } from "@/components/SiteBreakdownList";
import { ProductivityTrendTable } from "./ProductivityTrendTable";
import { formatHours, pktNow } from "@/lib/format";
import type { ProductivitySession, SiteActivity } from "@/lib/types";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const TREND_WINDOW_DAYS = 7;

export default async function ProductivityPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const todayKey = pktNow().toISOString().slice(0, 10);
  const windowStart = new Date(Date.parse(`${todayKey}T00:00:00Z`) - (TREND_WINDOW_DAYS - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [{ data: sessionsData }, { data: sitesData }] = await Promise.all([
    supabase
      .from("productivity_sessions")
      .select("*")
      .eq("user_id", profile.id)
      .gte("work_date", windowStart)
      .lte("work_date", todayKey)
      .order("work_date", { ascending: false }),
    supabase.from("site_activity").select("*").eq("user_id", profile.id).eq("work_date", todayKey),
  ]);

  const sessions = (sessionsData ?? []) as ProductivitySession[];
  const todaySites = (sitesData ?? []) as SiteActivity[];
  const today = sessions.find((s) => s.work_date === todayKey) ?? null;

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy">Last 7 days</h2>
        <ProductivityTrendTable sessions={sessions} />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-navy">Today&apos;s sites</h2>
        </div>
        <div className="p-4">
          <SiteBreakdownList sites={todaySites} />
        </div>
      </div>
    </div>
  );
}

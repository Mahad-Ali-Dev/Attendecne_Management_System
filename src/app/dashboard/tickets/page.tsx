import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetchAll";
import { StatCard } from "@/components/StatCard";
import { TicketLogForm } from "./TicketLogForm";
import { pktNow } from "@/lib/format";
import type { TicketReport } from "@/lib/types";
import { Ticket, CalendarDays, Sigma } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const profile = await getCurrentProfile();
  // Only customer-support agents log tickets; anyone else lands back on their
  // dashboard (the nav link is hidden from them too).
  if (!profile.is_support) redirect("/dashboard");

  const supabase = createClient();
  const entries = await fetchAll<TicketReport>((from, to) =>
    supabase
      .from("ticket_reports")
      .select("*")
      .eq("user_id", profile.id)
      .order("work_date", { ascending: false })
      .order("id")
      .range(from, to)
  );

  const todayKey = pktNow().toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7);
  const monthTotal = entries
    .filter((e) => e.work_date.slice(0, 7) === monthKey)
    .reduce((sum, e) => sum + e.tickets_solved, 0);
  const allTimeTotal = entries.reduce((sum, e) => sum + e.tickets_solved, 0);
  const todayCount = entries.find((e) => e.work_date === todayKey)?.tickets_solved ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Tickets</h1>
        <p className="mt-1 text-sm text-slate-500">
          Log how many support tickets you solve each day — once per day, and it&apos;s final.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={<Ticket className="h-5 w-5" />} label="Today" value={todayCount} accent="text-brand-600" />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="This month" value={monthTotal} />
        <StatCard icon={<Sigma className="h-5 w-5" />} label="All time" value={allTimeTotal} />
      </div>

      <TicketLogForm todayKey={todayKey} entries={entries} />
    </div>
  );
}

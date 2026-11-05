import { StatCard } from "@/components/StatCard";
import { formatDate } from "@/lib/format";
import type { TicketReport } from "@/lib/types";
import { Ticket, CalendarDays, Gauge, Sigma } from "lucide-react";

/**
 * Support-ticket summary for one employee on their admin detail page. The
 * month cards and the day-by-day table follow the month selected above;
 * all-time is the running total across their whole history. Only rendered for
 * employees flagged as support agents.
 */
export function EmployeeTickets({
  monthLabel,
  monthEntries,
  ticketsThisMonth,
  ticketsAllTime,
}: {
  monthLabel: string;
  /** This month's ticket rows, most recent first. */
  monthEntries: TicketReport[];
  ticketsThisMonth: number;
  ticketsAllTime: number;
}) {
  const daysLogged = monthEntries.length;
  const avgPerDay = daysLogged > 0 ? ticketsThisMonth / daysLogged : 0;

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
        {daysLogged === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">
            No tickets logged in {monthLabel}.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 text-right font-medium">Tickets solved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthEntries.map((e) => (
                <tr key={e.id} className="text-slate-600">
                  <td className="px-6 py-3">{formatDate(e.work_date)}</td>
                  <td className="px-6 py-3 text-right font-semibold tabular-nums text-navy">
                    {e.tickets_solved}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

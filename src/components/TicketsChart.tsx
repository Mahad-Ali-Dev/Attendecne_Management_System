"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatDate } from "@/lib/format";

// brand-600 — the same accent the ticket stat cards use.
const TICKET_COLOR = "#2563EB";

export interface TicketChartRow {
  date: string;
  label: string;
  tickets: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: TicketChartRow }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-soft">
      <div className="font-semibold text-navy">{formatDate(d.date)}</div>
      <div className="mt-1 text-slate-500">
        {d.tickets} {d.tickets === 1 ? "ticket" : "tickets"} solved
      </div>
    </div>
  );
}

/** One bar per day of the month (zero-filled) showing tickets solved that day. */
export function TicketsChart({ data }: { data: TicketChartRow[] }) {
  const dense = data.length > 10;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={dense ? "15%" : "30%"}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          interval={data.length > 15 ? 1 : 0}
        />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="tickets" fill={TICKET_COLOR} radius={[4, 4, 0, 0]} barSize={dense ? 12 : 24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

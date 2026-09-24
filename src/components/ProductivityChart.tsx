"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatDate, formatHours } from "@/lib/format";

// Same hex values as STATUS_COLOR.MET/PARTIAL in @/lib/hours, and the
// emerald-600/amber-600 classes used everywhere else productive/unproductive
// time is shown — one consistent pairing across the whole app.
const PRODUCTIVE_COLOR = "#059669";
const UNPRODUCTIVE_COLOR = "#f59e0b";

export interface ChartRow {
  date: string;
  label: string;
  productiveHours: number;
  unproductiveHours: number;
  pct: number | null;
  flagged: boolean;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartRow }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-soft">
      <div className="font-semibold text-navy">{formatDate(d.date)}</div>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: PRODUCTIVE_COLOR }} />
          <span className="text-slate-500">Productive</span>
          <span className="ml-auto font-medium text-navy">{formatHours(d.productiveHours)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: UNPRODUCTIVE_COLOR }} />
          <span className="text-slate-500">Unproductive</span>
          <span className="ml-auto font-medium text-navy">{formatHours(d.unproductiveHours)}</span>
        </div>
      </div>
      <div className="mt-1.5 border-t border-slate-100 pt-1.5 text-slate-500">
        {d.pct === null ? "No activity tracked" : `${d.pct}% productive`}
        {d.flagged && <span className="ml-1 font-medium text-red-600">· Flagged</span>}
      </div>
    </div>
  );
}

export function ProductivityChart({ data }: { data: ChartRow[] }) {
  const dense = data.length > 10;

  return (
    <div>
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
          <Bar dataKey="productiveHours" stackId="hours" fill={PRODUCTIVE_COLOR} barSize={dense ? 12 : 24} />
          <Bar
            dataKey="unproductiveHours"
            stackId="hours"
            fill={UNPRODUCTIVE_COLOR}
            radius={[4, 4, 0, 0]}
            barSize={dense ? 12 : 24}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PRODUCTIVE_COLOR }} />
          Productive
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: UNPRODUCTIVE_COLOR }} />
          Unproductive
        </div>
      </div>
    </div>
  );
}

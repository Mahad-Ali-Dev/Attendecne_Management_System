import { formatHours, shiftLengthHours } from "@/lib/format";
import { buildMonthDayHours, type DayHours } from "@/lib/hours";
import { requiredProductiveHours } from "@/lib/productivity";
import type { Attendance, Profile, ProductivitySession } from "@/lib/types";

/** One employee's month as shown in the report. */
export interface ReportRow {
  id: string;
  name: string;
  department: string | null;
  position: string | null;
  /** Required days: the month's working days (rest days excluded, approved leave NOT subtracted). */
  workingDays: number;
  /** Required days they checked in on — a day counts once they check in, whatever the hours. */
  presentDays: number;
  absentDays: number;
  /** Approved leave days that fall on working days. */
  leaveDays: number;
  /** Rest days (the employee's weekly off days) they worked anyway. */
  extraDays: number;
  requiredHours: number;
  completedHours: number;
  requiredTrackingHours: number;
  /** Productive hours tracked. */
  trackedHours: number;
  /** Unproductive hours tracked. */
  trackedUnproductiveHours: number;
  /** Support tickets solved this month; null for employees who aren't support agents. */
  ticketsSolved: number | null;
}

/** Whole-number percent of `done` against `required`; null when nothing was required. */
export function percentOf(done: number, required: number): number | null {
  return required > 0 ? Math.round((done / required) * 100) : null;
}

const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

// Hours are shown to the minute, so round to the minute once up front — the
// percentages then agree with the figures printed beside them.
const toWholeMinutes = (hours: number) => Math.round(hours * 60) / 60;

export interface ReportColumn {
  key: string;
  label: string;
  /** Drawn bold so it stands out. */
  strong?: boolean;
  value: (r: ReportRow) => string;
}

/**
 * The columns after "Employee", in display order. Both the on-screen table
 * and the PDF render from this list, so they always show the same thing.
 */
export const REPORT_COLUMNS: ReportColumn[] = [
  { key: "requiredHours", label: "Required hours", value: (r) => formatHours(r.requiredHours) },
  { key: "completedHours", label: "Completed hours", value: (r) => formatHours(r.completedHours) },
  { key: "requiredTracking", label: "Required tracking", value: (r) => formatHours(r.requiredTrackingHours) },
  { key: "totalTracking", label: "Total tracked", value: (r) => formatHours(r.trackedHours + r.trackedUnproductiveHours) },
  { key: "completedTracking", label: "Productive", value: (r) => formatHours(r.trackedHours) },
  { key: "unproductiveTracking", label: "Unproductive", value: (r) => formatHours(r.trackedUnproductiveHours) },
  // The day columns, in payroll reading order: required days first, then how
  // that split out (present, absent, leave, extra), then the two bold totals a
  // by-the-day payroll needs — days actually worked, and days actually paid.
  { key: "requiredDays", label: "Required days", strong: true, value: (r) => String(r.workingDays) },
  { key: "presentDays", label: "Present days", value: (r) => String(r.presentDays) },
  { key: "absentDays", label: "Absent days", value: (r) => String(r.absentDays) },
  { key: "leaves", label: "Leaves", value: (r) => String(r.leaveDays) },
  { key: "extraDays", label: "Extra days", value: (r) => String(r.extraDays) },
  { key: "daysWorked", label: "Total days worked", strong: true, value: (r) => String(r.presentDays + r.extraDays) },
  // Every day the employee is paid for: days worked (present + extra) plus
  // approved paid leave.
  {
    key: "paidWorkingDays",
    label: "Paid working days",
    strong: true,
    value: (r) => String(r.presentDays + r.extraDays + r.leaveDays),
  },
  // Tickets a support agent logged this month. "—" for everyone else, so the
  // column reads clean on a roster that's mostly non-support staff.
  {
    key: "ticketsSolved",
    label: "Tickets solved",
    value: (r) => (r.ticketsSolved === null ? "—" : String(r.ticketsSolved)),
  },
  { key: "attendancePct", label: "Attendance", value: (r) => pct(percentOf(r.completedHours, r.requiredHours)) },
  { key: "trackingPct", label: "Tracking", value: (r) => pct(percentOf(r.trackedHours, r.requiredTrackingHours)) },
];

/**
 * One employee's month. Follows the same day-by-day rules as the Monthly
 * Hours and Productivity pages (buildMonthDayHours), with two deliberate
 * differences:
 *  - Leave counts only days that are working days for this employee, so a
 *    leave running Friday–Monday excuses two shifts, not four.
 *  - Approved leave still to come this month is excused too, so the
 *    requirement is already right for a month in progress.
 */
export function buildReportRow(
  employee: Profile,
  monthKey: string,
  todayKey: string,
  attendance: Attendance[],
  leaveDates: Set<string>,
  sessions: ProductivitySession[],
  /** Support tickets this employee solved in the month (0 if none / not a support agent). */
  monthTickets = 0
): ReportRow {
  const shiftHours = shiftLengthHours(employee.shift_start, employee.shift_end);
  const days = buildMonthDayHours(attendance, monthKey, shiftHours, todayKey, leaveDates, employee.off_days ?? [0, 6]);

  const attended = (d: DayHours) => d.status === "MET" || d.status === "PARTIAL";
  const leaveDays = days.filter((d) => !d.isRestDay && leaveDates.has(d.date)).length;
  // Required days is the month's full working-day count — approved leave is NOT
  // subtracted, since an approved leave day was still a day the employee was
  // rostered for. (This matches the employee detail page's "Working days".)
  const workingDays = days.filter((d) => !d.isRestDay).length;
  // The HOURS requirement still excuses approved leave, so time off never drags
  // down completed-vs-required hours or the attendance %.
  const netWorkingDays = workingDays - leaveDays;

  return {
    id: employee.id,
    name: employee.full_name,
    department: employee.department,
    position: employee.position,
    workingDays,
    presentDays: days.filter((d) => !d.isRestDay && attended(d)).length,
    // Today doesn't count: they may simply not have arrived yet.
    absentDays: days.filter((d) => d.status === "ABSENT" && d.date !== todayKey).length,
    leaveDays,
    extraDays: days.filter((d) => d.isRestDay && attended(d)).length,
    requiredHours: netWorkingDays * shiftHours,
    completedHours: toWholeMinutes(days.reduce((sum, d) => sum + d.hours, 0)),
    requiredTrackingHours: netWorkingDays * requiredProductiveHours(shiftHours),
    trackedHours: toWholeMinutes(sessions.reduce((sum, s) => sum + s.total_productive_seconds, 0) / 3600),
    trackedUnproductiveHours: toWholeMinutes(
      sessions.reduce((sum, s) => sum + s.total_unproductive_seconds, 0) / 3600
    ),
    // Show a figure for support agents (even 0) and for anyone who logged
    // tickets this month; "—" for the rest so the column isn't a wall of zeros.
    ticketsSolved: (employee.is_support ?? false) || monthTickets > 0 ? monthTickets : null,
  };
}

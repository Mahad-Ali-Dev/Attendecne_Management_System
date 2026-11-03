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
  /** Days they were required to work: the month's working days, less approved leave. */
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
  trackedHours: number;
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
  { key: "completedTracking", label: "Completed tracking", value: (r) => formatHours(r.trackedHours) },
  // The day columns: days required first and total days worked last, both bold
  // because a payroll by the day needs those two, with the breakdown between.
  { key: "requiredDays", label: "Required days", strong: true, value: (r) => String(r.workingDays) },
  { key: "presentDays", label: "Present days", value: (r) => String(r.presentDays) },
  { key: "extraDays", label: "Extra days", value: (r) => String(r.extraDays) },
  { key: "absentDays", label: "Absent days", value: (r) => String(r.absentDays) },
  { key: "leaves", label: "Leaves", value: (r) => String(r.leaveDays) },
  { key: "daysWorked", label: "Total days worked", strong: true, value: (r) => String(r.presentDays + r.extraDays) },
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
  sessions: ProductivitySession[]
): ReportRow {
  const shiftHours = shiftLengthHours(employee.shift_start, employee.shift_end);
  const days = buildMonthDayHours(attendance, monthKey, shiftHours, todayKey, leaveDates, employee.off_days ?? [0, 6]);

  const attended = (d: DayHours) => d.status === "MET" || d.status === "PARTIAL";
  const leaveDays = days.filter((d) => !d.isRestDay && leaveDates.has(d.date)).length;
  const workingDays = days.filter((d) => !d.isRestDay).length - leaveDays;

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
    requiredHours: workingDays * shiftHours,
    completedHours: toWholeMinutes(days.reduce((sum, d) => sum + d.hours, 0)),
    requiredTrackingHours: workingDays * requiredProductiveHours(shiftHours),
    trackedHours: toWholeMinutes(sessions.reduce((sum, s) => sum + s.total_productive_seconds, 0) / 3600),
  };
}

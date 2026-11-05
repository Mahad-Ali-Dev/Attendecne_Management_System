import { hoursDecimal, isWorkingDay, shiftLengthHours } from "./format";
import type { Attendance, LeaveRequest } from "./types";

export interface MonthAttendanceSummary {
  /** Non-rest days in the month so far — basic pay is spread evenly across these. */
  workingDays: number;
  /** Approved leave on working days — paid, so never deducted. */
  leaveDays: number;
  /** Working days the employee attended (checked in). */
  presentDays: number;
  /** Working days missed (not attended, not on leave) — these drive the deduction. */
  absentDays: number;
  /** Rest days the employee worked anyway — these drive the bonus. */
  extraDays: number;
  expectedHours: number;
  actualHours: number;
  hoursShort: number;
  /** Hours worked beyond expectedHours — the mirror of hoursShort, never both positive at once. */
  hoursExtra: number;
}

/** Expands approved leave requests into a set of "YYYY-MM-DD" dates they cover. */
export function leaveDatesSet(leaveRequests: LeaveRequest[]): Set<string> {
  const dates = new Set<string>();
  for (const lr of leaveRequests) {
    if (lr.status !== "APPROVED") continue;
    for (let t = Date.parse(`${lr.start_date}T00:00:00Z`); t <= Date.parse(`${lr.end_date}T00:00:00Z`); t += 86_400_000) {
      dates.add(new Date(t).toISOString().slice(0, 10));
    }
  }
  return dates;
}

/**
 * Working days, expected vs. actual hours, and the shortfall for one
 * employee in one month. Days after `todayKey` don't count — an
 * in-progress month shouldn't be penalized for days that haven't happened.
 * Days covered by an approved leave request are excused entirely: they
 * don't add to expected hours, so they can never create a shortfall.
 *
 * A rest day (the employee's weekly off day) never adds to `workingDays` —
 * expected hours stay anchored to the normal roster — but if they worked it
 * anyway, those hours ARE credited to `actualHours`, as bonus hours that can
 * only reduce a shortfall, never inflate the target.
 */
export function summarizeMonth(
  attendance: Attendance[],
  monthKey: string,
  shiftStart: string,
  shiftEnd: string,
  todayKey: string,
  leaveDates: Set<string> = new Set(),
  offDays: number[] = [0, 6]
): MonthAttendanceSummary {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const shiftHours = shiftLengthHours(shiftStart, shiftEnd);
  const byDate = new Map(attendance.map((a) => [a.work_date, a]));

  let workingDays = 0;
  let leaveDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let extraDays = 0;
  let actualHours = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(Date.UTC(year, month - 1, d));
    const dateStr = `${monthKey}-${String(d).padStart(2, "0")}`;
    if (dateStr > todayKey) continue;

    const rec = byDate.get(dateStr);
    if (isWorkingDay(dateObj, offDays)) {
      workingDays++;
      if (leaveDates.has(dateStr)) {
        leaveDays++;
        continue;
      }
      // Checked in → present and credited; otherwise a missed working day.
      if (rec?.check_in) {
        presentDays++;
        actualHours += hoursDecimal(rec.check_in, rec.check_out);
      } else {
        absentDays++;
      }
    } else if (rec?.check_in) {
      // Worked a rest day: counts as an extra day (and bonus hours), without
      // counting toward working days so the normal roster is unchanged.
      extraDays++;
      actualHours += hoursDecimal(rec.check_in, rec.check_out);
    }
  }

  const expectedHours = (workingDays - leaveDays) * shiftHours;
  const hoursShort = Math.max(0, expectedHours - actualHours);
  const hoursExtra = Math.max(0, actualHours - expectedHours);
  return { workingDays, leaveDays, presentDays, absentDays, extraDays, expectedHours, actualHours, hoursShort, hoursExtra };
}

/** A single day's pay: basic salary spread evenly across the month's working days. */
export function dailyRate(basicSalary: number, workingDays: number): number {
  return workingDays > 0 ? basicSalary / workingDays : 0;
}

/**
 * Deducts a full day's pay for each working day the employee missed. Basic
 * salary is spread evenly across the month's working days, so one absent day
 * costs one day's pay. Approved leave is paid and never counted as absent.
 */
export function autoDeduction(basicSalary: number, workingDays: number, absentDays: number): number {
  if (workingDays <= 0 || absentDays <= 0) return 0;
  return Math.round(absentDays * dailyRate(basicSalary, workingDays));
}

/**
 * Bonus of one day's pay for each rest day worked — the mirror of
 * autoDeduction, using the same per-day rate.
 */
export function autoBonus(basicSalary: number, workingDays: number, extraDays: number): number {
  if (workingDays <= 0 || extraDays <= 0) return 0;
  return Math.round(extraDays * dailyRate(basicSalary, workingDays));
}

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

/**
 * Company payroll convention: a month's basic salary is always divided by a
 * flat 30 days to get the day rate, regardless of how many working days the
 * month actually has. So a full month pays the full basic, and each absent day
 * costs basic / 30 (not basic / working-days).
 */
export const PAYROLL_DAYS_PER_MONTH = 30;

/** A single day's pay: basic salary divided by the flat 30-day month. */
export function dailyRate(basicSalary: number): number {
  return basicSalary / PAYROLL_DAYS_PER_MONTH;
}

/**
 * Deducts a day's pay (basic / 30) for each working day the employee missed.
 * Approved leave is paid and never counted as absent.
 */
export function autoDeduction(basicSalary: number, absentDays: number): number {
  if (absentDays <= 0) return 0;
  return Math.round(absentDays * dailyRate(basicSalary));
}

/**
 * Bonus of a day's pay (basic / 30) for each rest day worked — the mirror of
 * autoDeduction, using the same per-day rate.
 */
export function autoBonus(basicSalary: number, extraDays: number): number {
  if (extraDays <= 0) return 0;
  return Math.round(extraDays * dailyRate(basicSalary));
}

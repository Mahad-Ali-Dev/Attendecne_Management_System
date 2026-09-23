import { hoursDecimal, isWorkingDay } from "@/lib/format";
import type { Attendance } from "@/lib/types";

export type DayStatus = "MET" | "PARTIAL" | "ABSENT" | "ON_LEAVE" | "REST_DAY" | "UPCOMING";

export const STATUS_COLOR: Record<DayStatus, string> = {
  MET: "#059669",
  PARTIAL: "#f59e0b",
  ABSENT: "#ef4444",
  ON_LEAVE: "#2563eb",
  REST_DAY: "#8b5cf6",
  UPCOMING: "#e2e8f0",
};

export const STATUS_LABEL: Record<DayStatus, string> = {
  MET: "Met target",
  PARTIAL: "Partial",
  ABSENT: "Absent",
  ON_LEAVE: "On leave",
  REST_DAY: "Day off",
  UPCOMING: "Upcoming",
};

export interface DayHours {
  date: string;
  label: string;
  hours: number;
  status: DayStatus;
  /** Checked in but not out yet (today) — hours aren't final, don't call it "Absent". */
  inProgress: boolean;
  /** Falls on the employee's weekly rest day — see buildMonthDayHours for how this affects totals. */
  isRestDay: boolean;
}

/**
 * Builds one DayHours entry per day in the given month, classifying each
 * day's status from attendance + approved-leave data. Shared by the
 * employee's own Monthly Hours page and the admin's per-employee view so
 * both classify days identically.
 *
 * Rest days (the employee's weekly off days) are included rather than
 * skipped: a rest day with no check-in is "REST_DAY" (not "ABSENT" — they
 * weren't expected in) and contributes nothing, but a rest day they DID
 * work still gets a normal MET/PARTIAL status so those hours show up and
 * get credited — see isRestDay's doc comment on how callers should use it
 * to keep "expected hours" anchored to the normal roster.
 */
export function buildMonthDayHours(
  attendance: Attendance[],
  monthKey: string,
  shiftHours: number,
  todayKey: string,
  leaveDates: Set<string>,
  offDays: number[] = [0, 6]
): DayHours[] {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const byDate = new Map(attendance.map((r) => [r.work_date, r]));

  const days: DayHours[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(Date.UTC(year, month - 1, d));
    const dateStr = `${monthKey}-${String(d).padStart(2, "0")}`;
    const isRestDay = !isWorkingDay(dateObj, offDays);

    const rec = byDate.get(dateStr);
    const hasCheckedIn = !!rec?.check_in;
    const hasCheckedOut = !!rec?.check_out;
    const inProgress = hasCheckedIn && !hasCheckedOut;
    const hours = hasCheckedOut ? hoursDecimal(rec!.check_in, rec!.check_out) : 0;

    let status: DayStatus;
    if (dateStr > todayKey) status = "UPCOMING";
    else if (leaveDates.has(dateStr)) status = "ON_LEAVE"; // excused — takes priority over absent/partial
    else if (isRestDay && !hasCheckedIn) status = "REST_DAY"; // not expected in — distinct from "ABSENT"
    else if (!hasCheckedIn) status = "ABSENT";
    else if (inProgress) status = "PARTIAL"; // checked in, not out yet — not final, not "absent"
    else if (hours >= shiftHours) status = "MET";
    else status = "PARTIAL";

    days.push({
      date: dateStr,
      label: dateObj.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", timeZone: "UTC" }),
      hours: Math.round(hours * 100) / 100,
      status,
      inProgress,
      isRestDay,
    });
  }
  return days;
}

export interface AttendanceHistoryEntry {
  date: string;
  record: Attendance | null;
  isOnLeave: boolean;
  isRestDay: boolean;
}

/**
 * Walks every calendar day from `startDate` to `endDate` (inclusive, most
 * recent first), merging real attendance rows with approved-leave and
 * rest-day awareness. Unlike a raw attendance-table scan, this also
 * surfaces days with no row at all — on leave, a rest day not worked, or
 * (if none of those) an inferred absence — instead of silently omitting them.
 */
export function buildAttendanceHistory(
  attendance: Attendance[],
  leaveDates: Set<string>,
  offDays: number[],
  startDate: string,
  endDate: string
): AttendanceHistoryEntry[] {
  const byDate = new Map(attendance.map((r) => [r.work_date, r]));
  const entries: AttendanceHistoryEntry[] = [];
  const start = Date.parse(`${startDate}T00:00:00Z`);
  for (let t = Date.parse(`${endDate}T00:00:00Z`); t >= start; t -= 86_400_000) {
    const dateObj = new Date(t);
    const dateStr = dateObj.toISOString().slice(0, 10);
    entries.push({
      date: dateStr,
      record: byDate.get(dateStr) ?? null,
      isOnLeave: leaveDates.has(dateStr),
      isRestDay: !isWorkingDay(dateObj, offDays),
    });
  }
  return entries;
}

import { hoursDecimal, isWorkingDay } from "@/lib/format";
import type { Attendance } from "@/lib/types";

export type DayStatus = "MET" | "PARTIAL" | "ABSENT" | "ON_LEAVE" | "UPCOMING";

export const STATUS_COLOR: Record<DayStatus, string> = {
  MET: "#059669",
  PARTIAL: "#f59e0b",
  ABSENT: "#ef4444",
  ON_LEAVE: "#2563eb",
  UPCOMING: "#e2e8f0",
};

export const STATUS_LABEL: Record<DayStatus, string> = {
  MET: "Met target",
  PARTIAL: "Partial",
  ABSENT: "Absent",
  ON_LEAVE: "On leave",
  UPCOMING: "Upcoming",
};

export interface DayHours {
  date: string;
  label: string;
  hours: number;
  status: DayStatus;
  /** Checked in but not out yet (today) — hours aren't final, don't call it "Absent". */
  inProgress: boolean;
}

/**
 * Builds one DayHours entry per working day (Mon–Fri) in the given month,
 * classifying each day's status from attendance + approved-leave data.
 * Shared by the employee's own Monthly Hours page and the admin's
 * per-employee view so both classify days identically.
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
    if (!isWorkingDay(dateObj, offDays)) continue;

    const dateStr = `${monthKey}-${String(d).padStart(2, "0")}`;
    const rec = byDate.get(dateStr);
    const hasCheckedIn = !!rec?.check_in;
    const hasCheckedOut = !!rec?.check_out;
    const inProgress = hasCheckedIn && !hasCheckedOut;
    const hours = hasCheckedOut ? hoursDecimal(rec!.check_in, rec!.check_out) : 0;

    let status: DayStatus;
    if (dateStr > todayKey) status = "UPCOMING";
    else if (leaveDates.has(dateStr)) status = "ON_LEAVE"; // excused — takes priority over absent/partial
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
    });
  }
  return days;
}

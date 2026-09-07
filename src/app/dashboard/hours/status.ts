export type DayStatus = "MET" | "PARTIAL" | "ABSENT" | "UPCOMING";

export const STATUS_COLOR: Record<DayStatus, string> = {
  MET: "#059669",
  PARTIAL: "#f59e0b",
  ABSENT: "#ef4444",
  UPCOMING: "#e2e8f0",
};

export const STATUS_LABEL: Record<DayStatus, string> = {
  MET: "Met target",
  PARTIAL: "Partial",
  ABSENT: "Absent",
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

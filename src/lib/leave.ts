import type { LeaveStatus } from "@/lib/types";

export const LEAVE_STATUS_STYLE: Record<LeaveStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

/** "CASUAL" → "Casual", "PENDING" → "Pending". */
export function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/** Calendar days a leave covers, counting both its first and last day. */
export function leaveDayCount(startDate: string, endDate: string): number {
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000) + 1;
}

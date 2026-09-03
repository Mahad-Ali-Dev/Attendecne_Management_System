import type { AttendanceStatus } from "@/lib/types";

const MAP: Record<AttendanceStatus | "NOT_IN", { label: string; cls: string }> = {
  PRESENT: { label: "Present", cls: "bg-emerald-50 text-emerald-700" },
  LATE: { label: "Late", cls: "bg-amber-50 text-amber-700" },
  ABSENT: { label: "Absent", cls: "bg-red-50 text-red-700" },
  NOT_IN: { label: "Not in", cls: "bg-slate-100 text-slate-500" },
};

export function StatusBadge({
  status,
}: {
  status: AttendanceStatus | "NOT_IN";
}) {
  const { label, cls } = MAP[status] ?? MAP.NOT_IN;
  return (
    <span className={`badge ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { formatDate } from "@/lib/format";
import type { Profile, ProductivitySession } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

export function FlaggedSessionsPanel({ items }: { items: { session: ProductivitySession; employee: Profile }[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-navy">
          <AlertTriangle className="h-4 w-4 text-red-500" /> Flagged sessions
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          These are statistical anomalies (uniform input timing, minimal mouse movement, key-only activity, or rapid
          tab switching) for a human to review — not proof of misconduct. False positives happen.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-400">No flagged sessions recently.</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {items.map(({ session, employee }) => (
            <Link
              key={session.id}
              href={`/admin/employees/${employee.id}`}
              className="flex items-center gap-3 px-6 py-3 text-sm transition hover:bg-slate-50"
            >
              <Avatar name={employee.full_name} src={employee.avatar_url} size={32} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-navy">{employee.full_name}</div>
                <div className="text-xs text-slate-400">
                  {formatDate(session.work_date)}
                  {session.flag_reason ? ` · ${session.flag_reason}` : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

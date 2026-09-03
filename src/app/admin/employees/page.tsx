import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { IdCard, Phone, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const employees = (data ?? []) as Profile[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Employees</h1>
        <p className="mt-1 text-sm text-slate-500">
          {employees.length} registered {employees.length === 1 ? "member" : "members"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((emp) => (
          <Link
            key={emp.id}
            href={`/admin/employees/${emp.id}`}
            className="card group p-5 transition hover:shadow-soft"
          >
            <div className="flex items-center gap-3">
              <Avatar name={emp.full_name} src={emp.avatar_url} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-navy">{emp.full_name}</span>
                  {emp.role === "ADMIN" && (
                    <span className="badge bg-brand-50 text-brand-700">Admin</span>
                  )}
                </div>
                <div className="truncate text-sm text-slate-400">
                  {emp.position || "Employee"}
                  {emp.department ? ` · ${emp.department}` : ""}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-50 pt-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <IdCard className="h-4 w-4 text-slate-300" /> {emp.cnic || "—"}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-300" /> {emp.phone || "—"}
              </div>
              <div className="text-xs text-slate-400">
                Joined {formatDate(emp.created_at)}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {employees.length === 0 && (
        <div className="card px-6 py-12 text-center text-sm text-slate-400">
          No employees have registered yet.
        </div>
      )}
    </div>
  );
}

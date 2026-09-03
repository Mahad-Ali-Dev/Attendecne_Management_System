import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatTime, hoursBetween } from "@/lib/format";
import type { Attendance, Profile } from "@/lib/types";
import { ArrowLeft, IdCard, Phone, MapPin, Building2, Mail, Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmployeeDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: profileData }, { data: attData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", params.id).single(),
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", params.id)
      .order("work_date", { ascending: false })
      .limit(30),
  ]);

  if (!profileData) notFound();
  const emp = profileData as Profile;
  const history = (attData ?? []) as Attendance[];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/employees"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <div className="card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar name={emp.full_name} src={emp.avatar_url} size={96} />
            <h1 className="mt-4 text-xl font-bold text-navy">{emp.full_name}</h1>
            <p className="text-sm text-slate-400">{emp.position || "Employee"}</p>
            {emp.role === "ADMIN" && (
              <span className="badge mt-2 bg-brand-50 text-brand-700">Administrator</span>
            )}
          </div>
          <dl className="mt-6 space-y-3.5 text-sm">
            <Row icon={<Mail className="h-4 w-4" />} label="Email" value={emp.email} />
            <Row icon={<IdCard className="h-4 w-4" />} label="CNIC" value={emp.cnic} />
            <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={emp.phone} />
            <Row icon={<Building2 className="h-4 w-4" />} label="Department" value={emp.department} />
            <Row icon={<Briefcase className="h-4 w-4" />} label="Position" value={emp.position} />
            <Row icon={<MapPin className="h-4 w-4" />} label="Address" value={emp.address} />
          </dl>
          <p className="mt-5 border-t border-slate-50 pt-4 text-xs text-slate-400">
            Registered {formatDate(emp.created_at)}
          </p>
        </div>

        {/* Attendance history */}
        <div className="card overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-navy">Attendance history</h2>
            <p className="text-xs text-slate-400">Last 30 records</p>
          </div>
          {history.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-400">
              No attendance recorded yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">In</th>
                  <th className="px-6 py-3 font-medium">Out</th>
                  <th className="px-6 py-3 font-medium">Hours</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((r) => (
                  <tr key={r.id} className="text-slate-600">
                    <td className="px-6 py-3 font-medium text-navy">{formatDate(r.work_date)}</td>
                    <td className="px-6 py-3">{formatTime(r.check_in)}</td>
                    <td className="px-6 py-3">{formatTime(r.check_out)}</td>
                    <td className="px-6 py-3">{hoursBetween(r.check_in, r.check_out)}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="break-words text-slate-700">{value || "—"}</dd>
      </div>
    </div>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data";
import { notifyUser } from "@/lib/notify";
import { formatDate } from "@/lib/format";
import { leaveDatesInRange } from "@/lib/leave";

/**
 * Admin creates or edits an employee's salary slip for a given month
 * ("YYYY-MM"). Upserts on (user_id, month) so re-saving the same month
 * corrects it rather than creating a duplicate. Used both from an
 * employee's own profile page and from the company-wide Salary page.
 */
export async function upsertSalarySlip(
  employeeId: string,
  month: string,
  basicSalary: number,
  allowances: number,
  performanceBonus: number,
  deductions: number,
  note: string
) {
  await requireAdmin();
  const supabase = createClient();

  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Pick a month." };
  if ([basicSalary, allowances, performanceBonus, deductions].some((n) => !Number.isFinite(n) || n < 0)) {
    return { error: "Amounts must be zero or greater." };
  }

  const { error } = await supabase.from("salary_slips").upsert(
    {
      user_id: employeeId,
      month: `${month}-01`,
      basic_salary: basicSalary,
      allowances,
      performance_bonus: performanceBonus,
      deductions,
      note: note.trim() || null,
    },
    { onConflict: "user_id,month" }
  );

  if (error) return { error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/salary");
  return { ok: true };
}

/**
 * Admin approves or rejects a leave request. `approvedDates` lets the admin
 * approve only part of a multi-day request — only those dates count as paid
 * leave, and the rest of the range falls through to absent. Omit it (or pass
 * the whole range) for a normal full approval, which stores NULL so the whole
 * range reads as approved.
 */
export async function reviewLeaveRequest(requestId: string, approve: boolean, approvedDates?: string[]) {
  const admin = await requireAdmin();
  const supabase = createClient();

  const { data: req, error: findErr } = await supabase
    .from("leave_requests")
    .select("user_id, start_date, end_date")
    .eq("id", requestId)
    .maybeSingle();
  if (findErr) return { error: findErr.message };
  if (!req) return { error: "Leave request not found." };

  const rangeDates = leaveDatesInRange(req.start_date, req.end_date);
  let approvedCol: string[] | null = null;
  if (approve && approvedDates && approvedDates.length > 0) {
    const inRange = new Set(rangeDates);
    const chosen = Array.from(new Set(approvedDates.filter((d) => inRange.has(d)))).sort();
    if (chosen.length === 0) return { error: "Pick at least one day to approve, or reject the request." };
    // Every day chosen is a full approval — store NULL so it reads as the whole range.
    approvedCol = chosen.length === rangeDates.length ? null : chosen;
  }

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status: approve ? "APPROVED" : "REJECTED",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      approved_dates: approve ? approvedCol : null,
    })
    .eq("id", requestId);
  if (error) return { error: error.message };

  const range = `${formatDate(req.start_date)} – ${formatDate(req.end_date)}`;
  const message = !approve
    ? `Your leave request for ${range} was rejected.`
    : approvedCol
      ? `Your leave was partly approved: ${approvedCol.length} of ${rangeDates.length} days (${range}) are paid; the other days count as absent.`
      : `Your leave request for ${range} was approved.`;
  await notifyUser(req.user_id, approve ? "LEAVE_APPROVED" : "LEAVE_REJECTED", message, "/dashboard/leave");

  // Approval feeds attendance, payroll and the reports, so refresh those too.
  revalidatePath("/admin/leave");
  revalidatePath(`/admin/employees/${req.user_id}`);
  revalidatePath("/admin/salary");
  revalidatePath("/admin/reports");
  return { ok: true };
}

/** Admin marks an employee's complaint resolved, with an optional reply. */
export async function resolveComplaint(complaintId: string, resolution: string) {
  const admin = await requireAdmin();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("complaints")
    .update({
      status: "RESOLVED",
      resolution: resolution.trim() || null,
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", complaintId)
    .select("user_id, subject")
    .single();

  if (error) return { error: error.message };

  if (data) {
    await notifyUser(
      data.user_id,
      "COMPLAINT_RESOLVED",
      `Your complaint "${data.subject}" has been resolved.`,
      "/dashboard/support"
    );
  }

  revalidatePath("/admin/support");
  return { ok: true };
}

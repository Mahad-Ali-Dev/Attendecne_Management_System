"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { notifyAdmins } from "@/lib/notify";
import { formatDate } from "@/lib/format";

/**
 * First step of the two-step leave flow: a team lead approves or rejects one of
 * their own members' pending requests. This only stamps the lead_* fields — the
 * final `status` stays the admin's call (an RLS `with check (status = 'PENDING')`
 * enforces that even if this is bypassed). Admins are notified of the decision.
 */
export async function reviewLeaveAsLead(requestId: string, approve: boolean) {
  const lead = await getCurrentProfile();
  if (lead.role !== "TEAM_LEAD") return { error: "Only a team lead can review a team member's leave." };
  const supabase = createClient();

  // RLS ("team lead reviews member leave") limits this to the lead's own
  // members and to requests the admin hasn't finalized yet.
  const { data, error } = await supabase
    .from("leave_requests")
    .update({
      lead_status: approve ? "APPROVED" : "REJECTED",
      lead_reviewed_by: lead.id,
      lead_reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "PENDING")
    .select("user_id, start_date, end_date")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "That request can no longer be reviewed." };

  const { data: member } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.user_id)
    .maybeSingle();
  const who = member?.full_name ?? "A team member";
  await notifyAdmins(
    "LEAVE_REQUESTED",
    `Team lead ${lead.full_name} ${approve ? "approved" : "rejected"} ${who}'s leave for ${formatDate(
      data.start_date
    )} – ${formatDate(data.end_date)}.`,
    "/admin/leave"
  );

  revalidatePath("/dashboard/team");
  revalidatePath("/admin/leave");
  return { ok: true };
}

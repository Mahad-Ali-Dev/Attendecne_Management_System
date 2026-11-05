"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pktNow } from "@/lib/format";

/**
 * A support agent records how many tickets they solved on a given day. One row
 * per day (unique on user_id + work_date), so re-submitting the same day just
 * corrects the count. Backdating is allowed (someone forgot to log yesterday);
 * future dates aren't. Only support agents may log — the screen is hidden from
 * everyone else, and this re-checks server-side.
 */
export async function logTickets(workDate: string, ticketsSolved: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_support")
    .eq("id", user.id)
    .single();
  if (!profile?.is_support) return { error: "Only customer-support agents can log tickets." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) return { error: "Pick a date." };
  if (workDate > pktNow().toISOString().slice(0, 10)) return { error: "You can't log tickets for a future date." };
  if (!Number.isInteger(ticketsSolved) || ticketsSolved < 0) return { error: "Enter a whole number of tickets." };
  if (ticketsSolved > 10_000) return { error: "That's an unusually large number — please check it." };

  const { error } = await supabase.from("ticket_reports").upsert(
    {
      user_id: user.id,
      work_date: workDate,
      tickets_solved: ticketsSolved,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,work_date" }
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tickets");
  revalidatePath("/admin/tickets");
  return { ok: true };
}

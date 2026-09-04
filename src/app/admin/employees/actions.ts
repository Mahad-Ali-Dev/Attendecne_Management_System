"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data";

/**
 * Links an employee to the numeric user ID their fingerprint was enrolled
 * under on the ZKTeco terminal, so the device sync script knows whose
 * attendance row a punch belongs to. Pass an empty string to unlink.
 */
export async function setDeviceUserId(employeeId: string, deviceUserId: string) {
  await requireAdmin();
  const supabase = createClient();
  const value = deviceUserId.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({ device_user_id: value })
    .eq("id", employeeId);

  if (error) {
    const msg =
      error.code === "23505"
        ? "That device ID is already assigned to another employee."
        : error.message;
    return { error: msg };
  }

  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true };
}

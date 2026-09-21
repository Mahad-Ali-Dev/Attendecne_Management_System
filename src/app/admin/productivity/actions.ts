"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data";

/**
 * Sets an admin-managed category for a hostname so the tracker picks it up
 * for future activity — it does not relabel that hostname's past
 * site_activity rows, which keep whatever category they were recorded with.
 */
export async function upsertSiteCategory(hostname: string, category: "PRODUCTIVE" | "NEUTRAL" | "DISTRACTING") {
  const admin = await requireAdmin();
  const supabase = createClient();

  if (!hostname.trim()) return { error: "Missing hostname." };

  const { error } = await supabase
    .from("site_categories")
    .upsert({ hostname, category, created_by: admin.id }, { onConflict: "hostname" });

  if (error) return { error: error.message };
  revalidatePath("/admin/productivity");
  return { ok: true };
}

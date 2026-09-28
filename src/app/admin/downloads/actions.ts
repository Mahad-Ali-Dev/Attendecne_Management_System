"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data";
import { DESKTOP_BUILDS_BUCKET, buildStorageKey } from "@/lib/desktopBuilds";

/** Admin uploads a new build of the tracker desktop app for employees to download. */
export async function uploadDesktopBuild(formData: FormData) {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a file first." };

  const admin = createAdminClient();
  const key = buildStorageKey(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await admin.storage
    .from(DESKTOP_BUILDS_BUCKET)
    .upload(key, bytes, { contentType: file.type || "application/octet-stream" });

  if (error) {
    const msg = /exceeded the maximum allowed size/i.test(error.message)
      ? "That file is larger than this project's Supabase Storage limit (50MB). Compress it or raise the limit in Supabase's project settings."
      : error.message;
    return { error: msg };
  }

  revalidatePath("/admin/downloads");
  revalidatePath("/dashboard/downloads");
  return { ok: true };
}

/** Admin removes a previously uploaded build. */
export async function deleteDesktopBuild(path: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.storage.from(DESKTOP_BUILDS_BUCKET).remove([path]);
  if (error) return { error: error.message };

  revalidatePath("/admin/downloads");
  revalidatePath("/dashboard/downloads");
  return { ok: true };
}

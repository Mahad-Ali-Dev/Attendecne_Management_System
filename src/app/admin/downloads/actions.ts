"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data";
import { uploadDesktopBuildFile, deleteDesktopBuild as deleteDesktopBuildAsset } from "@/lib/desktopBuilds";

/** Admin uploads a new build of the tracker desktop app for employees to download. */
export async function uploadDesktopBuild(formData: FormData) {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a file first." };

  const { error } = await uploadDesktopBuildFile(file);
  if (error) return { error };

  revalidatePath("/admin/downloads");
  revalidatePath("/dashboard/downloads");
  return { ok: true };
}

/** Admin removes a previously uploaded build. */
export async function deleteDesktopBuild(path: string) {
  await requireAdmin();

  const { error } = await deleteDesktopBuildAsset(path);
  if (error) return { error };

  revalidatePath("/admin/downloads");
  revalidatePath("/dashboard/downloads");
  return { ok: true };
}

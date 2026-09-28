import type { SupabaseClient } from "@supabase/supabase-js";
import type { DesktopBuild } from "@/lib/types";

export const DESKTOP_BUILDS_BUCKET = "desktop-builds";

// Storage object keys can't contain "/" grouping without creating a real
// subfolder (which would need a second list() call per upload to reach the
// file inside it), so every build is stored flat at the bucket root as
// "<uploaded-at ms>-<random>__<original filename>" — sortable by name and
// splittable back into the original filename for the download prompt.
const NAME_SEPARATOR = "__";

export function buildStorageKey(originalFilename: string): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${unique}${NAME_SEPARATOR}${originalFilename}`;
}

function originalFilename(storedName: string): string {
  const idx = storedName.indexOf(NAME_SEPARATOR);
  return idx >= 0 ? storedName.slice(idx + NAME_SEPARATOR.length) : storedName;
}

/** Lists every uploaded desktop-app build, newest first. */
export async function listDesktopBuilds(supabase: SupabaseClient): Promise<DesktopBuild[]> {
  const { data, error } = await supabase.storage.from(DESKTOP_BUILDS_BUCKET).list("", {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error || !data) return [];

  return data
    .filter((f) => f.id)
    .map((f) => {
      const { data: pub } = supabase.storage.from(DESKTOP_BUILDS_BUCKET).getPublicUrl(f.name);
      return {
        path: f.name,
        filename: originalFilename(f.name),
        size: f.metadata?.size ?? 0,
        uploadedAt: f.created_at ?? new Date().toISOString(),
        url: pub.publicUrl,
      };
    });
}

/** Formats a byte count as e.g. "24.3 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

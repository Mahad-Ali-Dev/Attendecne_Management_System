import type { SiteCategoryValue } from "@/lib/types";

/** Productive share of tracked time, rounded to a whole percent; null when nothing was tracked (avoids a divide-by-zero 0%/NaN reading as "all unproductive"). */
export function productivityPercent(productiveSeconds: number, unproductiveSeconds: number): number | null {
  const total = productiveSeconds + unproductiveSeconds;
  if (total === 0) return null;
  return Math.round((productiveSeconds / total) * 100);
}

export function categoryLabel(category: SiteCategoryValue): string {
  return category === "UNCATEGORIZED" ? "Uncategorized" : category;
}

export function categoryBadgeClass(category: SiteCategoryValue): string {
  switch (category) {
    case "PRODUCTIVE":
      return "bg-emerald-50 text-emerald-700";
    case "DISTRACTING":
      return "bg-red-50 text-red-700";
    case "NEUTRAL":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

/** Formats a raw executable basename (e.g. "chrome.exe", "EXCEL.EXE") as e.g. "Chrome", "Excel". */
export function formatAppName(appName: string): string {
  const base = appName.replace(/\.exe$/i, "");
  return base
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

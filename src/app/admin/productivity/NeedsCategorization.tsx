"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertSiteCategory } from "./actions";
import { Loader2, Tags } from "lucide-react";

const OPTIONS = [
  { value: "PRODUCTIVE", label: "Productive", className: "hover:bg-emerald-50 hover:text-emerald-700" },
  { value: "NEUTRAL", label: "Neutral", className: "hover:bg-slate-100 hover:text-slate-700" },
  { value: "DISTRACTING", label: "Distracting", className: "hover:bg-red-50 hover:text-red-700" },
] as const;

export function NeedsCategorization({ hostnames }: { hostnames: string[] }) {
  const router = useRouter();
  const [pendingHost, setPendingHost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function categorize(hostname: string, category: (typeof OPTIONS)[number]["value"]) {
    setError(null);
    setPendingHost(hostname);
    startTransition(async () => {
      const res = await upsertSiteCategory(hostname, category);
      setPendingHost(null);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-navy">
          <Tags className="h-4 w-4" /> Needs categorization
        </h2>
        <p className="text-xs text-slate-400">
          Hostnames seen recently with no category yet — set one so the tracker knows how to label them going
          forward.
        </p>
      </div>
      {hostnames.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-400">Nothing to categorize.</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {hostnames.map((hostname) => (
            <div key={hostname} className="flex items-center justify-between gap-3 px-6 py-3">
              <span className="truncate text-sm font-medium text-navy">{hostname}</span>
              <div className="flex shrink-0 items-center gap-1.5">
                {pendingHost === hostname ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => categorize(hostname, o.value)}
                      className={`rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 transition ${o.className}`}
                    >
                      {o.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="px-6 pb-4 text-xs text-red-600">{error}</p>}
    </div>
  );
}

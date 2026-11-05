"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSupportAgent } from "../actions";
import { Headphones, Loader2 } from "lucide-react";

/**
 * Admin switch marking an employee as a customer-support agent. Saves as soon
 * as it's flipped — only agents get the daily ticket log and appear in the
 * ticket report, so this is the gate for the whole feature.
 */
export function SupportAgentToggle({
  employeeId,
  initialIsSupport,
}: {
  employeeId: string;
  initialIsSupport: boolean;
}) {
  const router = useRouter();
  const [isSupport, setIsSupport] = useState(initialIsSupport);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !isSupport;
    setError(null);
    setIsSupport(next); // optimistic
    startTransition(async () => {
      const res = await setSupportAgent(employeeId, next);
      if (res?.error) {
        setIsSupport(!next); // roll back
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-5 border-t border-slate-50 pt-4">
      <label className="label flex items-center gap-1.5">
        <Headphones className="h-3.5 w-3.5" /> Customer support agent
      </label>
      <p className="mb-2 text-xs text-slate-400">
        Turn on so this employee can log daily tickets solved and show up in the ticket report.
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={isSupport}
        disabled={pending}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:bg-slate-50 disabled:opacity-60"
      >
        <span className="font-medium text-navy">{isSupport ? "Support agent" : "Not a support agent"}</span>
        <span className="flex items-center gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
              isSupport ? "bg-brand-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                isSupport ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
        </span>
      </button>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTeamLead } from "../actions";
import { Users, Loader2 } from "lucide-react";

/**
 * Admin switch that promotes an employee to team lead (or back to a regular
 * employee). A lead keeps their own employee screens and gains a My Team view;
 * an admin then assigns members to them below.
 */
export function TeamLeadToggle({
  employeeId,
  initialIsLead,
}: {
  employeeId: string;
  initialIsLead: boolean;
}) {
  const router = useRouter();
  const [isLead, setIsLead] = useState(initialIsLead);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !isLead;
    setError(null);
    setIsLead(next); // optimistic
    startTransition(async () => {
      const res = await setTeamLead(employeeId, next);
      if (res?.error) {
        setIsLead(!next); // roll back
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-5 border-t border-slate-50 pt-4">
      <label className="label flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" /> Team lead
      </label>
      <p className="mb-2 text-xs text-slate-400">
        Promote so this employee can see their team on a My Team page. You assign members once they&apos;re a lead.
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={isLead}
        disabled={pending}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:bg-slate-50 disabled:opacity-60"
      >
        <span className="font-medium text-navy">{isLead ? "Team lead" : "Not a team lead"}</span>
        <span className="flex items-center gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
              isLead ? "bg-brand-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                isLead ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
        </span>
      </button>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

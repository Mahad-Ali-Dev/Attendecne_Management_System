"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEmployeeDisabled } from "../actions";
import { formatDate } from "@/lib/format";
import { Loader2, UserX, UserCheck } from "lucide-react";

/**
 * Disable (employee left the company) or re-enable a profile. Disabling is
 * reversible and destroys nothing — it just blocks sign-in and removes the
 * employee from attendance and stats going forward — so it still asks for a
 * confirm before firing, the way a consequential toggle should.
 */
export function DisableEmployeeControl({
  employeeId,
  employeeName,
  disabledAt,
}: {
  employeeId: string;
  employeeName: string;
  disabledAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const isDisabled = !!disabledAt;

  function run(disabled: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await setEmployeeDisabled(employeeId, disabled);
      if (res?.error) setError(res.error);
      else {
        setConfirming(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-5 border-t border-slate-50 pt-4">
      <label className="label flex items-center gap-1.5">
        {isDisabled ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
        Account status
      </label>

      {isDisabled ? (
        <>
          <p className="mb-2 text-xs text-slate-400">
            Disabled on {formatDate(disabledAt)}. They can&apos;t sign in and are left out of attendance and
            stats from the next month on. Their past records are untouched. Re-enable to restore access.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(false)}
            className="btn-ghost w-full justify-center"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Re-enable account
          </button>
        </>
      ) : confirming ? (
        <>
          <p className="mb-2 text-xs text-slate-500">
            Disable {employeeName}? They&apos;ll be signed out and blocked from logging in. Nothing is
            deleted — they stay in this and earlier months&apos; stats, and drop out from next month on.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
              Yes, disable
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              className="btn-ghost shrink-0"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-400">
            Use this when someone leaves the company. It blocks their login and removes them from stats
            going forward, without deleting any of their history.
          </p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <UserX className="h-4 w-4" />
            Disable account
          </button>
        </>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

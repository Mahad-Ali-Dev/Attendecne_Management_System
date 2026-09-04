"use client";

import { useState, useTransition } from "react";
import { setDeviceUserId } from "../actions";
import { Fingerprint, Loader2 } from "lucide-react";

export function DeviceMappingForm({
  employeeId,
  initialValue,
}: {
  employeeId: string;
  initialValue: string | null;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await setDeviceUserId(employeeId, value);
      if (res?.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 border-t border-slate-50 pt-4">
      <label className="label flex items-center gap-1.5">
        <Fingerprint className="h-3.5 w-3.5" /> Fingerprint device user ID
      </label>
      <p className="mb-2 text-xs text-slate-400">
        The ID this employee was assigned when enrolled on the K50 terminal — used to match
        their fingerprint scans to this profile.
      </p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. 23"
          className="input"
        />
        <button type="submit" disabled={pending} className="btn-ghost shrink-0">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {saved && !error && <p className="mt-1.5 text-xs text-emerald-600">Saved.</p>}
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ShiftEditForm } from "./ShiftEditForm";
import { RelaxationEditForm } from "./RelaxationEditForm";
import { OffDaysEditForm } from "./OffDaysEditForm";
import { DeviceMappingForm } from "./DeviceMappingForm";
import { SupportAgentToggle } from "./SupportAgentToggle";
import { TeamLeadToggle } from "./TeamLeadToggle";
import { DisableEmployeeControl } from "./DisableEmployeeControl";
import { Settings, X } from "lucide-react";

/**
 * Gear button in the profile card that opens a scrollable dialog holding every
 * admin control for an employee — shift, rest days, device mapping, support and
 * team-lead toggles, and account status. Keeps the controls off the main page
 * until an admin wants them.
 */
export function EmployeeSettingsButton({
  employeeId,
  employeeName,
  shiftStart,
  shiftEnd,
  offDays,
  deviceUserId,
  isSupport,
  relaxMinutes,
  isLead,
  disabledAt,
  isAdmin,
}: {
  employeeId: string;
  employeeName: string;
  shiftStart: string;
  shiftEnd: string;
  offDays: number[];
  deviceUserId: string | null;
  isSupport: boolean;
  relaxMinutes: number;
  isLead: boolean;
  disabledAt: string | null;
  /** The target is an administrator — hide the support / team-lead / disable controls. */
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Employee settings"
        className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
      >
        <Settings className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
          <div className="absolute inset-0 bg-navy/30" onClick={() => setOpen(false)} />
          <div className="relative my-6 w-full max-w-lg rounded-2xl bg-white shadow-soft">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-navy">Employee settings</h3>
                <p className="text-xs text-slate-400">
                  {employeeName} · shift, rest days, device mapping and account access.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-6 pb-6">
              <ShiftEditForm employeeId={employeeId} initialStart={shiftStart} initialEnd={shiftEnd} />
              <RelaxationEditForm
                employeeId={employeeId}
                initialMinutes={relaxMinutes}
                shiftStart={shiftStart}
                shiftEnd={shiftEnd}
              />
              <OffDaysEditForm employeeId={employeeId} initialOffDays={offDays} />
              <DeviceMappingForm employeeId={employeeId} initialValue={deviceUserId} />
              {!isAdmin && <SupportAgentToggle employeeId={employeeId} initialIsSupport={isSupport} />}
              {!isAdmin && <TeamLeadToggle employeeId={employeeId} initialIsLead={isLead} />}
              {!isAdmin && (
                <DisableEmployeeControl employeeId={employeeId} employeeName={employeeName} disabledAt={disabledAt} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

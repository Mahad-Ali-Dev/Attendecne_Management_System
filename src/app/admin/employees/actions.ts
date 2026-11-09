"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data";
import { isLateCheckIn, pktNow } from "@/lib/format";

/**
 * Links an employee to the numeric user ID their fingerprint was enrolled
 * under on the ZKTeco terminal, so the device sync script knows whose
 * attendance row a punch belongs to. Pass an empty string to unlink.
 */
export async function setDeviceUserId(employeeId: string, deviceUserId: string) {
  await requireAdmin();
  const supabase = createClient();
  const value = deviceUserId.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({ device_user_id: value })
    .eq("id", employeeId);

  if (error) {
    const msg =
      error.code === "23505"
        ? "That device ID is already assigned to another employee."
        : error.message;
    return { error: msg };
  }

  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true };
}

/**
 * Disables (employee left the company) or re-enables a profile. Disabling
 * keeps every record — it just stamps profiles.disabled_at with today's PKT
 * date and bans the auth user so they can't sign in, and from the month after
 * their disable month onward they drop out of attendance and all stats.
 * Re-enabling clears the stamp and lifts the ban. Nothing is ever deleted.
 *
 * Goes through the service-role client: lifting/applying the auth ban needs
 * admin API access anyway, so both writes stay on the one privileged client.
 * An admin can't disable themselves or another admin.
 */
export async function setEmployeeDisabled(employeeId: string, disabled: boolean) {
  const me = await requireAdmin();
  if (employeeId === me.id) return { error: "You can't disable your own account." };

  const admin = createAdminClient();
  const { data: target, error: lookupErr } = await admin
    .from("profiles")
    .select("role, disabled_at")
    .eq("id", employeeId)
    .single();
  if (lookupErr || !target) return { error: "Employee not found." };
  if (target.role === "ADMIN") return { error: "Admins can't be disabled." };

  const disabledAt = disabled ? pktNow().toISOString().slice(0, 10) : null;

  const { error: updateErr } = await admin
    .from("profiles")
    .update({ disabled_at: disabledAt })
    .eq("id", employeeId);
  if (updateErr) return { error: updateErr.message };

  // Ban (or un-ban) at the auth level too, so a disabled employee truly can't
  // authenticate — not even with a token they already hold, once it expires,
  // since the ban also blocks refresh. "none" lifts an existing ban.
  const { error: banErr } = await admin.auth.admin.updateUserById(employeeId, {
    ban_duration: disabled ? "876000h" : "none",
  });
  if (banErr) {
    // Keep the two in step: if the ban couldn't be changed, roll the flag back
    // so we never show "active" for a banned user (or vice versa).
    await admin.from("profiles").update({ disabled_at: target.disabled_at }).eq("id", employeeId);
    return { error: banErr.message };
  }

  // Every surface that lists or counts employees needs to reflect the change.
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/employees");
  revalidatePath("/admin");
  revalidatePath("/admin/salary");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/productivity");
  return { ok: true };
}

/**
 * Marks an employee as a customer-support agent (or clears it). Only support
 * agents get the daily ticket-log screen and show up in the admin ticket
 * report, so this is what opens the feature up for someone.
 */
export async function setSupportAgent(employeeId: string, isSupport: boolean) {
  await requireAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_support: isSupport })
    .eq("id", employeeId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/tickets");
  return { ok: true };
}

/**
 * Promotes an employee to team lead, or demotes a lead back to a regular
 * employee. A team lead is still an employee (keeps their own attendance,
 * hours, salary) — the role just unlocks their My Team view and lets an admin
 * assign members to them. Demoting a lead unassigns everyone who reported to
 * them. Admins can't be team leads.
 */
export async function setTeamLead(employeeId: string, makeLead: boolean) {
  const me = await requireAdmin();
  if (employeeId === me.id) return { error: "That's your own account." };
  const supabase = createClient();

  const { data: target } = await supabase.from("profiles").select("role").eq("id", employeeId).single();
  if (!target) return { error: "Employee not found." };
  if (target.role === "ADMIN") return { error: "Admins can't be made team leads." };

  const { error } = await supabase
    .from("profiles")
    .update({ role: makeLead ? "TEAM_LEAD" : "EMPLOYEE" })
    .eq("id", employeeId);
  if (error) return { error: error.message };

  // Demoting a lead: nobody reports to them any more.
  if (!makeLead) {
    await supabase.from("profiles").update({ team_lead_id: null }).eq("team_lead_id", employeeId);
  }

  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/employees");
  return { ok: true };
}

/** Admin adds an employee to a team lead's team (sets their team_lead_id). */
export async function addTeamMember(leadId: string, memberId: string) {
  await requireAdmin();
  if (leadId === memberId) return { error: "A team lead can't be on their own team." };
  const supabase = createClient();

  const { data: rows } = await supabase.from("profiles").select("id, role").in("id", [leadId, memberId]);
  const lead = rows?.find((r) => r.id === leadId);
  const member = rows?.find((r) => r.id === memberId);
  if (!lead || lead.role !== "TEAM_LEAD") return { error: "That person isn't a team lead." };
  if (!member) return { error: "Employee not found." };
  if (member.role === "ADMIN") return { error: "Admins can't be team members." };

  const { error } = await supabase.from("profiles").update({ team_lead_id: leadId }).eq("id", memberId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/employees/${leadId}`);
  revalidatePath(`/admin/employees/${memberId}`);
  return { ok: true };
}

/** Admin removes an employee from a team (clears their team_lead_id). */
export async function removeTeamMember(leadId: string, memberId: string) {
  await requireAdmin();
  const supabase = createClient();

  const { error } = await supabase.from("profiles").update({ team_lead_id: null }).eq("id", memberId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/employees/${leadId}`);
  revalidatePath(`/admin/employees/${memberId}`);
  return { ok: true };
}

/**
 * Admin adds or corrects a support agent's ticket count for a day. Upserts the
 * one row per (employee, day), so it both adds a missed day and fixes an
 * existing one. Agents can only log once and can't edit, so this is the way a
 * mistake gets fixed.
 */
export async function upsertTicketReport(employeeId: string, workDate: string, ticketsSolved: number) {
  await requireAdmin();
  const supabase = createClient();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) return { error: "Pick a date." };
  if (workDate > pktNow().toISOString().slice(0, 10)) return { error: "Can't set tickets for a future date." };
  if (!Number.isInteger(ticketsSolved) || ticketsSolved < 0) return { error: "Enter a whole number of tickets." };
  if (ticketsSolved > 10_000) return { error: "That's an unusually large number — please check it." };

  const { error } = await supabase.from("ticket_reports").upsert(
    { user_id: employeeId, work_date: workDate, tickets_solved: ticketsSolved, updated_at: new Date().toISOString() },
    { onConflict: "user_id,work_date" }
  );

  if (error) return { error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/tickets");
  return { ok: true };
}

/** Admin removes a day's ticket entry entirely (e.g. one logged by mistake). */
export async function deleteTicketReport(employeeId: string, workDate: string) {
  await requireAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from("ticket_reports")
    .delete()
    .eq("user_id", employeeId)
    .eq("work_date", workDate);

  if (error) return { error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/tickets");
  return { ok: true };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Admin changes an employee's shift start/end time — e.g. after they move
 * to a different shift. Only affects going forward: past attendance rows
 * already have their PRESENT/LATE/ABSENT status locked in from whatever
 * shift time was in effect when they were recorded. Salary calculations,
 * however, always read the employee's *current* shift time when computed —
 * even for a past month — so editing this can change an already-viewed
 * month's expected-hours/deduction suggestion the next time it's opened.
 */
export async function updateEmployeeShift(employeeId: string, shiftStart: string, shiftEnd: string) {
  await requireAdmin();
  const supabase = createClient();

  const timeRe = /^\d{2}:\d{2}$/;
  if (!timeRe.test(shiftStart) || !timeRe.test(shiftEnd)) {
    return { error: "Invalid time." };
  }
  // shift_end <= shift_start is a legitimate overnight shift (e.g. 3 PM to
  // 2 AM) — shiftLengthHours/isLateCheckIn/upsertAttendance already treat
  // it that way (wrapping to the next day), so this only rejects the one
  // genuinely nonsensical case: identical start and end.
  if (shiftStart === shiftEnd) {
    return { error: "Shift start and end can't be the same time." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ shift_start: shiftStart, shift_end: shiftEnd })
    .eq("id", employeeId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/salary");
  return { ok: true };
}

/**
 * Admin sets which weekdays an employee is normally off (0=Sun..6=Sat) —
 * e.g. someone who rests on weekdays and works the weekend instead of the
 * standard Sat+Sun. Affects every "working days"/expected-hours
 * calculation (Monthly Hours, salary) going forward.
 */
export async function updateEmployeeOffDays(employeeId: string, offDays: number[]) {
  await requireAdmin();
  const supabase = createClient();

  const cleaned = Array.from(new Set(offDays)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (cleaned.length === 7) {
    return { error: "At least one day has to be a working day." };
  }

  const { error } = await supabase.from("profiles").update({ off_days: cleaned }).eq("id", employeeId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/salary");
  revalidatePath("/dashboard/hours");
  return { ok: true };
}

/** Builds a UTC ISO timestamp from a PKT (UTC+5) work date + wall-clock time. */
function pktToISOString(workDate: string, time: string): string {
  return new Date(`${workDate}T${time}:00+05:00`).toISOString();
}

function addOneDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Admin correction for an employee's check-in/check-out on a given day.
 * Upserts the attendance row (creates it if the employee never punched at
 * all that day) and recomputes LATE/PRESENT/ABSENT from the new check-in
 * time, the same way the check-in button and the device sync do.
 * Pass an empty string for either time to leave/clear it.
 */
export async function upsertAttendance(
  employeeId: string,
  workDate: string,
  checkInTime: string,
  checkOutTime: string
) {
  await requireAdmin();
  const supabase = createClient();

  if (!workDate) return { error: "Pick a date." };
  if (checkOutTime && !checkInTime) return { error: "Set a check-in time first." };

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("shift_start, shift_end")
    .eq("id", employeeId)
    .single();
  if (profileErr || !profile) return { error: "Employee not found." };

  // A check-out clock-time at or before the check-in clock-time normally
  // means a typo — but for an employee whose own shift is registered as
  // overnight (shift_end <= shift_start, e.g. 10 PM - 6 AM), it legitimately
  // means the checkout lands on the following calendar day.
  const crossesMidnight = !!(checkInTime && checkOutTime && timeToMinutes(checkOutTime) <= timeToMinutes(checkInTime));
  const employeeIsOvernightShift = timeToMinutes(profile.shift_end) <= timeToMinutes(profile.shift_start);

  if (crossesMidnight && !employeeIsOvernightShift) {
    return { error: "Check-out must be after check-in." };
  }

  const check_in = checkInTime ? pktToISOString(workDate, checkInTime) : null;
  const check_out = checkOutTime
    ? pktToISOString(crossesMidnight ? addOneDay(workDate) : workDate, checkOutTime)
    : null;
  const status = !checkInTime ? "ABSENT" : isLateCheckIn(checkInTime, profile.shift_start) ? "LATE" : "PRESENT";

  const { error } = await supabase
    .from("attendance")
    .upsert(
      { user_id: employeeId, work_date: workDate, check_in, check_out, status },
      { onConflict: "user_id,work_date" }
    );

  if (error) return { error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true };
}

/**
 * Admin removes an attendance record entirely (as opposed to clearing its
 * times via upsertAttendance, which leaves an ABSENT row behind) — e.g. a
 * duplicate device punch or a mistaken manual entry.
 */
export async function deleteAttendance(employeeId: string, workDate: string) {
  await requireAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("user_id", employeeId)
    .eq("work_date", workDate);

  if (error) return { error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/salary");
  return { ok: true };
}

/**
 * Admin correction for a day's tracked productive/unproductive time — the
 * tracker writes these normally, but admins can fix an obviously wrong
 * value (e.g. a stuck timer inflating one day's hours) the same way they
 * can correct attendance. Only the two duration fields are editable here;
 * tab_switch_count and the flagged/reason fields are tracker-computed
 * signals, not "time," and stay out of admin's hands.
 */
export async function updateProductivitySession(
  employeeId: string,
  workDate: string,
  productiveSeconds: number,
  unproductiveSeconds: number
) {
  await requireAdmin();
  const supabase = createClient();

  if (!workDate) return { error: "Missing date." };
  if (
    !Number.isFinite(productiveSeconds) ||
    !Number.isFinite(unproductiveSeconds) ||
    productiveSeconds < 0 ||
    unproductiveSeconds < 0
  ) {
    return { error: "Time can't be negative." };
  }

  const { error } = await supabase
    .from("productivity_sessions")
    .update({ total_productive_seconds: productiveSeconds, total_unproductive_seconds: unproductiveSeconds })
    .eq("user_id", employeeId)
    .eq("work_date", workDate);

  if (error) return { error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/productivity");
  return { ok: true };
}

/**
 * Admin adds a day's tracked time by hand — e.g. an employee forgot to start
 * the tracker and told an admin the next day. Only the two totals exist for
 * such a day (no per-app breakdown). Refuses a date that already has a
 * session — that's what updateProductivitySession is for. Goes through the
 * service-role client because the tracker owns writes to this table, so
 * there's no admin insert policy to rely on.
 */
export async function addProductivitySession(
  employeeId: string,
  workDate: string,
  productiveSeconds: number,
  unproductiveSeconds: number
) {
  await requireAdmin();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) return { error: "Pick a date." };
  if (workDate > pktNow().toISOString().slice(0, 10)) return { error: "Can't add time for a future date." };
  if (!Number.isFinite(productiveSeconds) || !Number.isFinite(unproductiveSeconds)) {
    return { error: "Enter the tracked time." };
  }
  if (productiveSeconds < 0 || unproductiveSeconds < 0) return { error: "Time can't be negative." };

  const productive = Math.round(productiveSeconds);
  const unproductive = Math.round(unproductiveSeconds);
  if (productive + unproductive === 0) return { error: "Enter some tracked time." };
  if (productive + unproductive > 24 * 3600) return { error: "A day can't have more than 24 hours tracked." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("productivity_sessions")
    .select("id")
    .eq("user_id", employeeId)
    .eq("work_date", workDate)
    .maybeSingle();
  if (existing) return { error: "That date already has tracked time — edit it instead." };

  const { error } = await admin.from("productivity_sessions").insert({
    user_id: employeeId,
    work_date: workDate,
    total_productive_seconds: productive,
    total_unproductive_seconds: unproductive,
  });

  if (error) {
    return { error: error.code === "23505" ? "That date already has tracked time — edit it instead." : error.message };
  }
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/productivity");
  return { ok: true };
}

/** Admin removes a day's tracked productivity session entirely — e.g. a session that shouldn't have been recorded at all. */
export async function deleteProductivitySession(employeeId: string, workDate: string) {
  await requireAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from("productivity_sessions")
    .delete()
    .eq("user_id", employeeId)
    .eq("work_date", workDate);

  if (error) return { error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/productivity");
  return { ok: true };
}

/**
 * Admin deletes a salary slip entirely — e.g. one added for the wrong month
 * by mistake. Unlike attendance/productivity_sessions, salary_slips has no
 * delete RLS policy (admins only get insert/update), so this goes through
 * the service-role client instead of the session-scoped one.
 */
export async function deleteSalarySlip(employeeId: string, slipId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("salary_slips").delete().eq("id", slipId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/salary");
  return { ok: true };
}

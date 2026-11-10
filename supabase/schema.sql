-- ============================================================================
--  Evolut Ecommerce Solutions — Attendance Management System
--  Supabase schema. Run this entire file in: Dashboard → SQL Editor → New query
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES  (one row per employee, linked 1:1 to auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text        not null,
  email        text        not null,
  role         text        not null default 'EMPLOYEE' check (role in ('EMPLOYEE', 'ADMIN', 'TEAM_LEAD')),
  cnic         text,
  phone        text,
  address      text,
  department   text,
  position     text,
  avatar_url   text,
  shift_start     time        not null default '09:00',
  shift_end       time        not null default '17:00',
  device_user_id  text        unique,
  -- Days of the week this employee is normally OFF, as JS Date.getUTCDay()
  -- values (0=Sun .. 6=Sat). Defaults to the standard Sat+Sun weekend; an
  -- employee who instead rests on weekdays and works the weekend gets a
  -- different set here so their weekend hours count toward their totals
  -- instead of being silently skipped as "not a working day".
  off_days        integer[]   not null default '{0,6}',
  -- The date an admin disabled this profile (employee left the company), or
  -- NULL while they're active. Disabling never deletes anything: the row and
  -- every attendance/salary/leave record it owns stay put. A disabled
  -- employee can't sign in (their auth user is banned too), and they drop out
  -- of attendance and stats from the month AFTER their disable month onward —
  -- disabled 15 Oct still counts for all of October and every earlier month,
  -- but not November or later. Re-enabling clears this back to NULL.
  disabled_at     date,
  -- Whether this employee is a customer-support agent. Admin-set, not chosen
  -- at registration. Only support agents get the daily ticket-log screen and
  -- appear in the admin ticket report.
  is_support      boolean     not null default false,
  -- Minutes of paid relaxation / break allowed per working day before the
  -- tracker target applies. A day's required productive hours = shift length
  -- minus this. Defaults to 90 minutes (a 9-hour shift ⇒ a 7.5-hour target);
  -- an admin can raise or lower it per employee.
  relax_minutes   integer     not null default 90,
  -- The team lead this employee reports to (another profile whose role is
  -- 'TEAM_LEAD'), or NULL if they're not on anyone's team. Admin-managed. A
  -- team lead sees their members' attendance, hours, leave, productivity and
  -- tickets on their My Team page. Self-referencing, cleared if the lead's
  -- profile is ever deleted.
  team_lead_id    uuid        references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- Employees registered before shift scheduling existed still get these columns.
alter table public.profiles add column if not exists shift_start time not null default '09:00';
alter table public.profiles add column if not exists shift_end   time not null default '17:00';
-- Maps a profile to the numeric "user ID" it was assigned during fingerprint
-- enrollment on the ZKTeco K50 terminal itself. Set by an admin, not at registration.
alter table public.profiles add column if not exists device_user_id text unique;
-- Employees registered before custom weekly schedules existed still default
-- to the standard Sat+Sun weekend.
alter table public.profiles add column if not exists off_days integer[] not null default '{0,6}';
-- Profiles created before the "disable instead of delete" feature existed are
-- active (NULL) until an admin disables them.
alter table public.profiles add column if not exists disabled_at date;
-- Customer-support flag, off by default — an admin turns it on per employee.
alter table public.profiles add column if not exists is_support boolean not null default false;
-- Per-employee tracker relaxation (break) allowance in minutes; 90 by default.
alter table public.profiles add column if not exists relax_minutes integer not null default 90;
-- Team-lead role + team membership, added later. Widen the role check to allow
-- 'TEAM_LEAD', then add the self-referencing link from a member to their lead.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('EMPLOYEE', 'ADMIN', 'TEAM_LEAD'));
alter table public.profiles add column if not exists team_lead_id uuid references public.profiles (id) on delete set null;
create index if not exists profiles_team_lead_idx on public.profiles (team_lead_id);

-- ---------------------------------------------------------------------------
-- 2. ATTENDANCE  (one row per employee per day)
-- ---------------------------------------------------------------------------
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  work_date   date not null default (now() at time zone 'utc')::date,
  check_in    timestamptz,
  check_out   timestamptz,
  status      text not null default 'PRESENT' check (status in ('PRESENT', 'LATE', 'ABSENT')),
  note        text,
  created_at  timestamptz not null default now(),
  unique (user_id, work_date)
);

create index if not exists attendance_date_idx on public.attendance (work_date);
create index if not exists attendance_user_idx on public.attendance (user_id);

-- ---------------------------------------------------------------------------
-- 2b. SALARY SLIPS  (one row per employee per month, set by an admin)
-- ---------------------------------------------------------------------------
create table if not exists public.salary_slips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  month         date not null,  -- always the 1st of the month, e.g. 2026-09-01
  basic_salary  numeric(12,2) not null default 0,
  allowances    numeric(12,2) not null default 0,
  performance_bonus numeric(12,2) not null default 0,
  deductions    numeric(12,2) not null default 0,
  note          text,
  created_at    timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists salary_slips_user_idx on public.salary_slips (user_id);

-- Discretionary performance bonus, added later; adds to net pay like allowances.
alter table public.salary_slips add column if not exists performance_bonus numeric(12,2) not null default 0;

-- ---------------------------------------------------------------------------
-- 2c. LEAVE REQUESTS  (employee-submitted, admin-reviewed)
-- ---------------------------------------------------------------------------
create table if not exists public.leave_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  start_date   date not null,
  end_date     date not null,
  leave_type   text not null default 'CASUAL' check (leave_type in ('SICK', 'CASUAL', 'ANNUAL', 'OTHER')),
  reason       text,
  status       text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by  uuid references public.profiles (id),
  reviewed_at  timestamptz,
  -- Two-step verification: when the requester is on a team, their team lead
  -- reviews first — lead_status goes PENDING → APPROVED/REJECTED — and the
  -- admin sees that decision before making the final call. NULL lead_status
  -- means the requester has no team lead (an admin-only request). The final
  -- `status` is always the admin's and the one payroll/attendance trust.
  lead_status      text check (lead_status in ('PENDING', 'APPROVED', 'REJECTED')),
  lead_reviewed_by uuid references public.profiles (id),
  lead_reviewed_at timestamptz,
  created_at   timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists leave_requests_user_idx on public.leave_requests (user_id);
create index if not exists leave_requests_status_idx on public.leave_requests (status);

-- Two-step leave verification (team lead reviews before the admin), added later.
alter table public.leave_requests add column if not exists lead_status text
  check (lead_status in ('PENDING', 'APPROVED', 'REJECTED'));
alter table public.leave_requests add column if not exists lead_reviewed_by uuid references public.profiles (id);
alter table public.leave_requests add column if not exists lead_reviewed_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2d. NOTIFICATIONS  (in-app alerts — leave requested / approved / rejected)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (type in ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED')),
  message     text not null,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- Widen the type check to also cover complaint notifications (added later —
-- re-running this against a DB that already has the notifications table
-- from before needs the constraint explicitly replaced, not just declared).
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED',
    'COMPLAINT_SUBMITTED', 'COMPLAINT_RESOLVED'
  ));

-- ---------------------------------------------------------------------------
-- 2e. COMPLAINTS  (employee-raised issues — e.g. "checkout not working" —
-- admin-resolved, optionally tied to a specific date)
-- ---------------------------------------------------------------------------
create table if not exists public.complaints (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  category      text not null default 'ATTENDANCE' check (category in ('ATTENDANCE', 'SALARY', 'LEAVE', 'OTHER')),
  subject       text not null,
  description   text not null,
  related_date  date,
  status        text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED')),
  resolution    text,
  resolved_by   uuid references public.profiles (id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists complaints_user_idx on public.complaints (user_id);
create index if not exists complaints_status_idx on public.complaints (status);

-- ---------------------------------------------------------------------------
-- 2f. PASSWORD RESET CODES  (short-lived, emailed via Resend)
-- ---------------------------------------------------------------------------
create table if not exists public.password_reset_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  code        text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists password_reset_codes_user_idx on public.password_reset_codes (user_id);

-- ---------------------------------------------------------------------------
-- 2g. TICKET REPORTS  (one row per support agent per day — how many customer
-- support tickets they resolved that day. Logged by the agent, correctable by
-- an admin, the same way attendance is.)
-- ---------------------------------------------------------------------------
create table if not exists public.ticket_reports (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  work_date      date not null default (now() at time zone 'utc')::date,
  tickets_solved integer not null default 0 check (tickets_solved >= 0),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, work_date)
);

create index if not exists ticket_reports_user_idx on public.ticket_reports (user_id);
create index if not exists ticket_reports_date_idx on public.ticket_reports (work_date);

-- ---------------------------------------------------------------------------
-- 3. is_admin()  — SECURITY DEFINER avoids RLS recursion on profiles
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

-- ---------------------------------------------------------------------------
-- 3b. leads_member()  — is `member_id` on the signed-in user's team?
-- SECURITY DEFINER so team-scoped policies on attendance / leave / tickets /
-- productivity can check team_lead_id without recursing through RLS on profiles.
-- ---------------------------------------------------------------------------
create or replace function public.leads_member(member_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = member_id and team_lead_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.attendance    enable row level security;
alter table public.salary_slips  enable row level security;
alter table public.leave_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.complaints enable row level security;
alter table public.password_reset_codes enable row level security;
alter table public.ticket_reports enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists "read own or admin reads all" on public.profiles;
create policy "read own or admin reads all" on public.profiles
  for select using (id = auth.uid() or public.is_admin() or team_lead_id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "admin updates any profile" on public.profiles;
create policy "admin updates any profile" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
-- INSERTs are done server-side with the service-role key (bypasses RLS).

-- attendance -----------------------------------------------------------------
drop policy if exists "read own attendance or admin reads all" on public.attendance;
create policy "read own attendance or admin reads all" on public.attendance
  for select using (user_id = auth.uid() or public.is_admin() or public.leads_member(user_id));

drop policy if exists "insert own attendance" on public.attendance;
create policy "insert own attendance" on public.attendance
  for insert with check (user_id = auth.uid());

drop policy if exists "update own attendance" on public.attendance;
create policy "update own attendance" on public.attendance
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "admin inserts any attendance" on public.attendance;
create policy "admin inserts any attendance" on public.attendance
  for insert with check (public.is_admin());

drop policy if exists "admin updates any attendance" on public.attendance;
create policy "admin updates any attendance" on public.attendance
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin deletes any attendance" on public.attendance;
create policy "admin deletes any attendance" on public.attendance
  for delete using (public.is_admin());

-- salary slips -----------------------------------------------------------------
-- Employees can only ever read their own; only an admin creates or edits one.
drop policy if exists "read own salary or admin reads all" on public.salary_slips;
create policy "read own salary or admin reads all" on public.salary_slips
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin inserts any salary slip" on public.salary_slips;
create policy "admin inserts any salary slip" on public.salary_slips
  for insert with check (public.is_admin());

drop policy if exists "admin updates any salary slip" on public.salary_slips;
create policy "admin updates any salary slip" on public.salary_slips
  for update using (public.is_admin()) with check (public.is_admin());

-- leave requests ---------------------------------------------------------------
drop policy if exists "read own leave or admin reads all" on public.leave_requests;
create policy "read own leave or admin reads all" on public.leave_requests
  for select using (user_id = auth.uid() or public.is_admin() or public.leads_member(user_id));

drop policy if exists "insert own leave request" on public.leave_requests;
create policy "insert own leave request" on public.leave_requests
  for insert with check (user_id = auth.uid());

-- Withdraw a request you haven't heard back on yet — once reviewed, it stands.
drop policy if exists "cancel own pending leave request" on public.leave_requests;
create policy "cancel own pending leave request" on public.leave_requests
  for delete using (user_id = auth.uid() and status = 'PENDING');

drop policy if exists "admin reviews any leave request" on public.leave_requests;
create policy "admin reviews any leave request" on public.leave_requests
  for update using (public.is_admin()) with check (public.is_admin());

-- A team lead reviews their own members' leave first (two-step verification).
-- They may touch a member's PENDING request to stamp lead_status, but the
-- `with check (status = 'PENDING')` keeps them from making the final call —
-- only the admin policy above can move status off PENDING.
drop policy if exists "team lead reviews member leave" on public.leave_requests;
create policy "team lead reviews member leave" on public.leave_requests
  for update using (public.leads_member(user_id) and status = 'PENDING')
  with check (public.leads_member(user_id) and status = 'PENDING');

-- notifications ------------------------------------------------------------
drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "mark own notifications read" on public.notifications;
create policy "mark own notifications read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- INSERTs are done server-side with the service-role key: a notification's
-- recipient is always someone OTHER than whoever triggered it (an employee
-- notifying admins, or an admin notifying that employee), so there's no
-- single auth.uid()-scoped insert policy that covers both directions.

-- complaints -----------------------------------------------------------------
drop policy if exists "read own complaints or admin reads all" on public.complaints;
create policy "read own complaints or admin reads all" on public.complaints
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "insert own complaint" on public.complaints;
create policy "insert own complaint" on public.complaints
  for insert with check (user_id = auth.uid());

drop policy if exists "admin resolves any complaint" on public.complaints;
create policy "admin resolves any complaint" on public.complaints
  for update using (public.is_admin()) with check (public.is_admin());

-- ticket reports --------------------------------------------------------------
-- A support agent logs and corrects their own daily counts; an admin can read
-- everyone's and fix any of them. Mirrors the attendance policy set.
drop policy if exists "read own tickets or admin reads all" on public.ticket_reports;
create policy "read own tickets or admin reads all" on public.ticket_reports
  for select using (user_id = auth.uid() or public.is_admin() or public.leads_member(user_id));

drop policy if exists "insert own tickets" on public.ticket_reports;
create policy "insert own tickets" on public.ticket_reports
  for insert with check (user_id = auth.uid());

-- Deliberately no "update own tickets" policy: a day's count is logged once and
-- is final for the agent — only an admin may correct it (admin policy below).
-- Drop it in case an earlier version of this file created one.
drop policy if exists "update own tickets" on public.ticket_reports;

drop policy if exists "admin inserts any tickets" on public.ticket_reports;
create policy "admin inserts any tickets" on public.ticket_reports
  for insert with check (public.is_admin());

drop policy if exists "admin updates any tickets" on public.ticket_reports;
create policy "admin updates any tickets" on public.ticket_reports
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin deletes any tickets" on public.ticket_reports;
create policy "admin deletes any tickets" on public.ticket_reports
  for delete using (public.is_admin());

-- productivity sessions (tracker-owned) ---------------------------------------
-- The desktop tracker creates these tables, not this file, so only add the
-- team-lead read policy when the table is actually present. This is purely
-- additive — it sits alongside whatever own/admin read policies already exist.
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'productivity_sessions') then
    drop policy if exists "team lead reads team productivity" on public.productivity_sessions;
    create policy "team lead reads team productivity" on public.productivity_sessions
      for select using (public.leads_member(user_id));
  end if;
end $$;

-- password reset codes --------------------------------------------------------
-- No public policies at all: a forgot-password request happens before the
-- employee has a session, so there's no auth.uid() to scope a policy to —
-- every read/write goes through the service-role key instead.

-- ---------------------------------------------------------------------------
-- 5. STORAGE bucket for profile photos (public read)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
-- Uploads happen server-side with the service-role key.

-- ============================================================================
--  Done. Profile rows + photo uploads are created by the Next.js server using
--  the service-role key, so no public INSERT policy is needed for them.
-- ============================================================================

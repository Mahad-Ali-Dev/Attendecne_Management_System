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
  role         text        not null default 'EMPLOYEE' check (role in ('EMPLOYEE', 'ADMIN')),
  cnic         text,
  phone        text,
  address      text,
  department   text,
  position     text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

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
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.attendance enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists "read own or admin reads all" on public.profiles;
create policy "read own or admin reads all" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

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
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "insert own attendance" on public.attendance;
create policy "insert own attendance" on public.attendance
  for insert with check (user_id = auth.uid());

drop policy if exists "update own attendance" on public.attendance;
create policy "update own attendance" on public.attendance
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

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

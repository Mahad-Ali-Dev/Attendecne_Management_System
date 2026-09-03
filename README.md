# Evolut Attendance Management System

A clean, production-ready employee attendance system for **Evolut Ecommerce Solutions**.
Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase** (Auth, Postgres, Storage).

## Features

- **Employee self-registration** — full name, work email, password, **CNIC**, **phone**, **address**, department, position, and **profile photo**.
- **One-tap check-in / check-out** with automatic *Late* detection (after 09:30 PKT).
- **Personal dashboard** — today's status, profile card, and 14-day attendance history.
- **Admin overview** — live counts (present / late / not-in) and a real-time table of who's in today.
- **Employee directory** — searchable cards with full profiles and per-employee 30-day attendance history.
- **Role-based access** — employees see only their own data; admins see everyone (enforced by Postgres Row-Level Security).
- Clean, responsive UI in the Evolut navy brand palette.

---

## Quick start

### 1. Create a Supabase project
Go to <https://supabase.com> → **New project**. Once it's ready, open **Project Settings → API** and copy:
- Project URL
- `anon` public key
- `service_role` key (keep secret)

### 2. Run the database schema
In Supabase: **SQL Editor → New query**, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
This creates the `profiles` and `attendance` tables, the `avatars` storage bucket, and all RLS policies.

### 3. Configure environment variables
```bash
cp .env.local.example .env.local
```
Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAIL=admin@evolutecomsolutions.com
```
> The email set in `NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAIL` automatically becomes an **ADMIN** when it registers. Everyone else is an **EMPLOYEE**.

### 4. Install & run
```bash
npm install
npm run dev
```
Open <http://localhost:3000>.

### 5. First login
1. Go to **/register** and sign up using the bootstrap admin email → you land on the admin-enabled dashboard.
2. Register more accounts (any other email) as employees.
3. Employees check in/out from their dashboard; the admin sees everything at **/admin**.

---

## Deploy to Vercel
1. Push this folder to a Git repo and import it at <https://vercel.com/new>.
2. Add the same four environment variables in **Vercel → Project → Settings → Environment Variables**.
3. Deploy. (No build config needed — it's a standard Next.js app.)

To promote another existing user to admin later, run in Supabase SQL Editor:
```sql
update public.profiles set role = 'ADMIN' where email = 'someone@evolutecomsolutions.com';
```

---

## Project structure
```
src/
  app/
    (auth)/login, (auth)/register   # branded auth screens
    dashboard/                      # employee: check-in/out + history
    admin/                          # admin overview + employee directory
    api/register/                   # server-side account + photo + profile creation
  components/                       # Logo, Avatar, header, badges, cards
  lib/
    supabase/                       # browser / server / middleware clients
    data.ts, format.ts, types.ts
supabase/schema.sql                 # run once in Supabase
```

## Notes
- **Late rule** lives in `src/app/dashboard/actions.ts` (`09:30 PKT`). Adjust as needed.
- Times use **Pakistan Standard Time (UTC+5)**.
- Profile photos are stored in the public `avatars` bucket; account creation & uploads happen server-side with the service-role key so the browser never sees it.

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { SignOutButton } from "@/components/SignOutButton";
import type { Profile } from "@/lib/types";
import { LayoutDashboard, Users, ShieldCheck } from "lucide-react";

export function AppHeader({ profile }: { profile: Profile }) {
  const isAdmin = profile.role === "ADMIN";
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-navy"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-navy"
                >
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
                <Link
                  href="/admin/employees"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-navy"
                >
                  <Users className="h-4 w-4" /> Employees
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-navy">{profile.full_name}</div>
            <div className="text-xs text-slate-400">
              {isAdmin ? "Administrator" : profile.position || "Employee"}
            </div>
          </div>
          <Avatar name={profile.full_name} src={profile.avatar_url} size={38} />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

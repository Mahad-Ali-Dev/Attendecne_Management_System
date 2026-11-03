"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, LogIn } from "lucide-react";

const DISABLED_MESSAGE =
  "This account has been disabled. Please contact your administrator.";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The middleware sends a disabled employee here with ?disabled=1 after
  // clearing their session, so they see why they were signed out. Read from
  // the URL directly to avoid pulling in useSearchParams (and its Suspense
  // requirement) on this otherwise fully client-side form.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("disabled") === "1") {
      setError(DISABLED_MESSAGE);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      // A disabled employee's auth user is banned, so sign-in fails here —
      // show the plain-English reason rather than the raw "user banned" text.
      const banned = error.code === "user_banned" || /banned/i.test(error.message);
      setError(banned ? DISABLED_MESSAGE : error.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, disabled_at")
      .eq("id", data.user.id)
      .single();

    // Belt-and-braces: if the auth ban somehow didn't block the sign-in, the
    // profile flag still does — drop the session and keep them on this page.
    if (profile?.disabled_at) {
      await supabase.auth.signOut();
      setError(DISABLED_MESSAGE);
      setLoading(false);
      return;
    }

    router.replace(profile?.role === "ADMIN" ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy">Welcome back</h2>
      <p className="mt-1 text-sm text-slate-500">
        Sign in to mark your attendance.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}
        <div>
          <label className="label">Work email</label>
          <input
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="you@evolutecomsolutions.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-xs font-semibold text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New to Evolut?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:underline">
          Create your employee account
        </Link>
      </p>
    </div>
  );
}

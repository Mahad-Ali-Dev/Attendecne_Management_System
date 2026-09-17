import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Returns the signed-in user's profile, redirecting to /login if absent.
 * Wrapped in React's cache() because every layout AND the page it renders
 * both call this on every request — without memoizing, that was two full
 * auth+profile round-trips to Supabase per page view instead of one.
 * cache() scopes the memoization to a single request's render pass, so
 * there's no risk of one user's result leaking into another's.
 */
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  // Defensive default: profiles rows created before off_days existed (or
  // read right after a deploy but before schema.sql has been re-run to add
  // the column) would otherwise come back with off_days undefined, and
  // every caller assumes a real array.
  return { ...profile, off_days: profile.off_days ?? [0, 6] } as Profile;
});

/** Like getCurrentProfile but also enforces the ADMIN role. */
export const requireAdmin = cache(async (): Promise<Profile> => {
  const profile = await getCurrentProfile();
  if (profile.role !== "ADMIN") redirect("/dashboard");
  return profile;
});

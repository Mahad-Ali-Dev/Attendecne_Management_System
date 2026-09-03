import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Returns the signed-in user's profile, redirecting to /login if absent.
 */
export async function getCurrentProfile(): Promise<Profile> {
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
  return profile as Profile;
}

/** Like getCurrentProfile but also enforces the ADMIN role. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (profile.role !== "ADMIN") redirect("/dashboard");
  return profile;
}

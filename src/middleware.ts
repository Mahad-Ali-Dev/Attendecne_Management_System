import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Tried skipping this for Server Action requests to cut redundant Supabase
// Auth calls (every action re-checks auth itself anyway) — reverted after
// it broke session handling for actions in practice: this middleware isn't
// just deciding whether to redirect, it's also what refreshes and
// re-propagates the session cookie, and actions apparently depend on that
// having already happened. Verified failure: profile updates silently
// stopped persisting ("Not signed in") once this was skipped.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

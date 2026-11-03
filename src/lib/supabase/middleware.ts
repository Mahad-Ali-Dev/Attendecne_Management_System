import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // API routes manage their own auth — never redirect them.
  if (path.startsWith("/api")) return response;

  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // A disabled employee (profiles.disabled_at set) still holds a valid session
  // until their token expires — kick them off every protected page right away
  // instead of waiting. One extra primary-key lookup per signed-in page
  // request, which only ever redirects a disabled user. Crucially we CLEAR the
  // auth cookies on the redirect rather than bounce to /login with the session
  // intact: otherwise the "signed in → leave auth pages" rule below would send
  // them straight back and loop. If the column isn't there yet (pre-migration)
  // the select errors, `me` is null, and nobody gets redirected.
  if (user && !isPublic) {
    const { data: me } = await supabase
      .from("profiles")
      .select("disabled_at")
      .eq("id", user.id)
      .maybeSingle();
    if (me?.disabled_at) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "disabled=1";
      const redirect = NextResponse.redirect(url);
      for (const c of request.cookies.getAll()) {
        if (c.name.startsWith("sb-") && c.name.includes("auth-token")) {
          redirect.cookies.set(c.name, "", { maxAge: 0, path: "/" });
        }
      }
      return redirect;
    }
  }

  // Not signed in and trying to reach a protected page → send to login.
  if (!user && !isPublic && path !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Signed in but on an auth page → bounce to the dashboard.
  if (user && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth cookie on every matched request. This is the
 * "proxy.ts session-refresh step" referenced in src/lib/supabase/server.ts —
 * without it, a Server Component's cookie writes are a no-op (Next disallows
 * setting cookies there), so nothing else in the app would ever renew an
 * expiring session.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Do not add logic between createServerClient and this call — this is
  // what actually revalidates the token and rewrites the cookie when it
  // needs refreshing.
  //
  // getClaims() (not getUser()) — same guarantee (a cryptographically
  // verified session, refreshed first if it's close to expiring — see
  // GoTrueClient.getClaims/getSession), but getUser() always round-trips to
  // Supabase's Auth server while getClaims() verifies the JWT locally via
  // WebCrypto against the project's cached JWKS. This runs in the matcher
  // below on *every* request — every navigation, every server action (a
  // button click), every asset not explicitly excluded — so getUser()'s
  // ~200ms here was effectively a floor under every single interaction in
  // the app, compounding with any of getUser()'s own occasional slower
  // responses. See the identical fix + measurements in src/lib/session.ts.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

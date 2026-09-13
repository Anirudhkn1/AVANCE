import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * Reads/writes the auth cookie via Next's `cookies()` so sessions stay in sync.
 *
 * In a Server Component, cookie writes are a no-op (Next disallows setting cookies
 * there) — that's expected as long as session refresh also happens somewhere with
 * write access, e.g. a Route Handler or a proxy.ts session-refresh step.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — ignore, session refresh
            // happens elsewhere with cookie-write access.
          }
        },
      },
    }
  );
}

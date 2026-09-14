import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// getClaims() (not getUser()) verifies the access token locally — signature
// checked with WebCrypto against the project's JWKS (SUPABASE_JWKS_URL),
// same security guarantee as revalidating with the Auth server, but without
// the network round trip getUser() always makes. The JWKS is cached at
// supabase-js's module scope (shared across requests in the same warm
// server process, not per-client), so only a cold start pays that cost —
// every request after is pure local verification. This was the main reason
// every navigation/login felt slow (root layout awaited it on every
// request); Suspense-wrapping it in layout.tsx made the wait visible via a
// spinner instead of invisible, but this is what actually shortens it.
// Falls back to getUser()'s network call automatically if the project ever
// moves off asymmetric signing keys (see GoTrueClient.getClaims in
// @supabase/auth-js) — can't regress correctness, only remove latency.
// Several pages call this more than once per render (layout + page), so
// cache() dedupes it to one call per request either way.
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;

  // Signed in with Supabase but no matching profile row is a data-integrity
  // bug, not a normal path — every creation path below writes both together.
  return prisma.user.findUnique({
    where: { id: data.claims.sub },
    select: { id: true, name: true, email: true, avatarSeed: true },
  });
});

/** Use in server components/pages. Throws Next's redirect (not a real error) when signed out. */
export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// getUser() (not getSession()) revalidates the token against Supabase's Auth
// server rather than trusting the cookie as-is — the secure option. That's a
// network round trip, and several pages call this more than once per render
// (layout + page), so cache() dedupes it to one call per request.
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  // Signed in with Supabase but no matching profile row is a data-integrity
  // bug, not a normal path — every creation path below writes both together.
  return prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, name: true, email: true, avatarSeed: true },
  });
});

/** Use in server components/pages. Throws Next's redirect (not a real error) when signed out. */
export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

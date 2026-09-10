import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Use in server components/pages. Throws Next's redirect (not a real error) when signed out. */
export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

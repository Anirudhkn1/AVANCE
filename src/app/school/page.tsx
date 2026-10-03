import { getSessionUserId } from "@/lib/session";
import { SchoolsHero } from "@/components/schools-hero";

// The front door of Avance Schools — public, shown every time someone
// chooses to enter Schools (the /profiles tile, the landing page button).
// Deep links to inner pages skip it.
export default async function SchoolsHeroPage() {
  // Token-only check: signed-in visitors go back to their profile picker.
  const signedIn = Boolean(await getSessionUserId());
  return <SchoolsHero exitHref={signedIn ? "/profiles" : "/"} />;
}

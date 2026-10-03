import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { alegreyaSans, alegreyaSansSC, spaceMono, specialElite } from "./fonts";
import { getSessionUser, getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { INTRO_STORAGE_KEY } from "@/lib/brand";
import { Navbar, NavbarFallback } from "@/components/navbar";
import { AppBackground } from "@/components/app-background";
import { IntroOverlay } from "@/components/intro-overlay";
import { SessionSync } from "@/components/session-sync";
import { NavigationProgress } from "@/components/navigation-progress";

export const metadata: Metadata = {
  title: "Avance — A game layer for real-world work",
  description:
    "Avance turns real-world assignments into measurable quests and gives institutions visibility before failure happens.",
};

// Runs before first paint, ahead of any streamed content: on the first load
// of "/" in a tab, flags <html data-intro="play"> so globals.css hides the page
// behind the intro cover from the very first frame (no hero flash while JS
// loads). Later loads in the same tab skip it. suppressHydrationWarning on
// <html> covers the attribute this adds before React hydrates.
const INTRO_GATE_SCRIPT = `try{if(location.pathname==="/"&&!sessionStorage.getItem(${JSON.stringify(INTRO_STORAGE_KEY)})){document.documentElement.setAttribute("data-intro","play")}}catch(e){}`;

// Session check + unread count are both per-request, uncached round trips
// (see the comment on getSessionUser — it revalidates against Supabase's
// Auth server, not just the cookie). Previously these were awaited directly
// in RootLayout, which — since loading.tsx only wraps `page.js` and nested
// layouts, never the layout that defines it — meant every single navigation
// sat blocked on this network round trip with nothing on screen, before any
// loading UI (this app's own, or the target page's) got a chance to render.
// Isolating them in their own async component and wrapping *that* in
// Suspense lets the <html>/<body> shell — and the route's loading.tsx —
// stream immediately; this chrome fills in a moment later without holding
// up the rest of the page. See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md
// ("Good to know" / Navigation section).
async function AppChrome() {
  // The unread count only needs the id from the token, so it runs alongside
  // the profile lookup instead of after it.
  const userId = await getSessionUserId();
  let user, unreadCount;
  try {
    [user, unreadCount] = await Promise.all([
      getSessionUser(),
      userId ? prisma.notification.count({ where: { userId, read: false } }) : 0,
    ]);
  } catch (error) {
    // The root layout has no error boundary above it, so a database hiccup
    // here would otherwise take down the whole document. Keep the shell up
    // with the placeholder nav; the page's own error.tsx offers a retry.
    console.error("Navbar data unavailable:", error);
    return (
      <>
        <SessionSync userId={userId} />
        <NavbarFallback />
      </>
    );
  }

  return (
    <>
      {/* The token's id (not the profile row), so a tab on /login while
          signed in still reports the real session. */}
      <SessionSync userId={userId} />
      {user && <AppBackground />}
      <Navbar user={user} unreadCount={unreadCount} />
    </>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${specialElite.variable} ${alegreyaSansSC.variable} ${alegreyaSans.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <IntroOverlay />
        {/* Its own boundary: useSearchParams suspends, and this must never
            hold up (or be held up by) the navbar's data. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <Suspense fallback={<NavbarFallback />}>
          <AppChrome />
        </Suspense>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}

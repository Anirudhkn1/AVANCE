import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { CornerSpider } from "@/components/corner-spider";
import { Logo } from "@/components/logo";
import { BellIcon } from "@/components/nav-icons";
import { AccountMenu, MobileDock, NavLinks, NavShell } from "@/components/navbar-client";
import "./navbar.css";

// A floating capsule that hangs just below the top of the viewport (instead
// of a full-width bar), with the app's own sections in the middle and the
// bell + account menu on the right. On phones the section links move to a
// dock at the bottom of the screen (MobileDock) and the capsule keeps only
// the logo, bell and avatar. The capsule's background stays opaque on
// purpose — a translucent/blurred one lets the app background bleed through
// behind the links (see the note in app-background.tsx).

// Shown in the moment before the real Navbar knows who's signed in (see the
// Suspense boundary around AppChrome in layout.tsx) — same capsule, same
// height, so swapping the two never shifts the page, with a small pulse
// standing in for the avatar while it waits.
export function NavbarFallback() {
  return (
    <header className="nav-header">
      <div className="nav-capsule">
        <div className="flex flex-1 items-center">
          <Logo className="text-lg" />
        </div>
        <div className="h-9 w-9 rounded-full bg-surface-muted animate-loader-pulse" />
      </div>
    </header>
  );
}

export function Navbar({
  user,
  unreadCount = 0,
}: {
  user: { name?: string | null; avatarSeed: string } | null;
  unreadCount?: number;
}) {
  return (
    <>
      <NavShell>
        <div className="nav-capsule">
          {/* Reading progress along the capsule's bottom edge (CSS scroll timeline). */}
          <div className="nav-capsule__clip" aria-hidden>
            <span className="nav-progress" />
          </div>

          <div className="flex flex-1 items-center">
            <Link href={user ? "/dashboard" : "/"} className="nav-logo" aria-label="Avance home">
              <Logo className="text-lg" />
            </Link>
          </div>

          {user && <NavLinks />}

          <div className="flex flex-1 items-center justify-end gap-1">
            {user ? (
              <>
                <Link
                  href="/notifications"
                  className={`nav-icon-btn nav-enter ${unreadCount > 0 ? "nav-bell--alert" : ""}`}
                  aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
                >
                  <BellIcon className="nav-bell__icon" />
                  {unreadCount > 0 && <span className="nav-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </Link>
                <AccountMenu name={user.name ?? null} avatar={<Avatar seed={user.avatarSeed} size="md" />} />
              </>
            ) : (
              <>
                <Link href="/login" className="nav-text-link">
                  Sign in
                </Link>
                <Link href="/register" className="nav-cta">
                  Sign up <span className="nav-cta__arrow">›</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </NavShell>

      {/* Outside the header on purpose: the header slides away with a
          transform, which would re-anchor a position:fixed child to it. */}
      {user && <MobileDock />}
      {/* Student section only — it decides that itself from the route. */}
      {user && <CornerSpider />}
    </>
  );
}

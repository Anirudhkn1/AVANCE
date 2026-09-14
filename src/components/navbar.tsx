import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { Avatar } from "@/components/ui";
import GooeyNav from "@/components/GooeyNav";

// Organisations/Habits/To-Do/Focus are reached via icons on the /dashboard
// desktop itself — the nav stays a short list of what isn't an icon there.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
];

// Shown in the moment before the real Navbar knows who's signed in (see the
// Suspense boundary around AppChrome in layout.tsx) — same height/border so
// swapping the two never shifts the page, with a small pulse standing in
// for the avatar/actions so the header doesn't look frozen while it waits.
export function NavbarFallback() {
  return (
    <header className="border-b border-border bg-surface sticky top-0 z-20">
      <div className="mx-auto max-w-6xl flex items-center gap-6 px-4 py-3">
        <span className="font-semibold tracking-tight text-base shrink-0">Avance</span>
        <div className="ml-auto h-8 w-8 rounded-full bg-surface-muted animate-loader-pulse" />
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
    <header className="border-b border-border bg-surface sticky top-0 z-20">
      <div className="mx-auto max-w-6xl flex items-center gap-6 px-4 py-3">
        <Link href={user ? "/dashboard" : "/"} className="font-semibold tracking-tight text-base shrink-0">
          Avance
        </Link>
        {user && (
          <div className="hidden md:block">
            <GooeyNav items={NAV_ITEMS} />
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/notifications"
                className="relative px-2 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted text-sm"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-danger px-1 text-[10px] leading-4 text-white text-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/profile" className="flex items-center gap-2">
                <Avatar seed={user.avatarSeed} size="sm" />
                <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-sm text-muted hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-surface-muted"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted hover:text-foreground">
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-lg hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
      {user && (
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

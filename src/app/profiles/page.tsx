import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { Avatar } from "@/components/ui";

// Netflix-style "who's using Avance?" picker shown after every sign-in.
export default async function ProfilesPage() {
  const user = await requireSessionUser();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Who&apos;s using Avance?</h1>
      <div className="mt-10 flex flex-wrap justify-center gap-8">
        <ProfileTile href="/dashboard" label={user.name}>
          <Avatar seed={user.avatarSeed} size="lg" />
        </ProfileTile>
        <ProfileTile href="/school" label="School">
          <span className="text-5xl" aria-hidden>
            🎒
          </span>
        </ProfileTile>
      </div>
    </div>
  );
}

function ProfileTile({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group flex w-32 flex-col items-center gap-3">
      <span className="flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-border bg-surface shadow-sm transition group-hover:scale-105 group-hover:border-accent [&_img]:h-24 [&_img]:w-24">
        {children}
      </span>
      <span className="text-sm text-muted group-hover:text-foreground">{label}</span>
    </Link>
  );
}

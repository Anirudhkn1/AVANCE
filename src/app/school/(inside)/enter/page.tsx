import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { BackLink } from "@/components/school";

export default async function SchoolEntryPage() {
  await requireSessionUser();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="mb-8 self-start">
        <BackLink href="/profiles">Profiles</BackLink>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Who are you?</h1>
      <div className="mt-10 grid w-full max-w-lg grid-cols-2 gap-5">
        <Tile href="/school/kids" emoji="🧒" title="Student" text="Homework, levels and class updates" />
        <Tile href="/school/staff" emoji="🏫" title="Staff" text="Teachers and school office" />
      </div>
    </div>
  );
}

function Tile({ href, emoji, title, text }: { href: string; emoji: string; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-accent"
    >
      <span className="text-5xl" aria-hidden>
        {emoji}
      </span>
      <span className="font-semibold">{title}</span>
      <span className="text-xs text-muted">{text}</span>
    </Link>
  );
}

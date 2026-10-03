import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";

// Reached from the hero's "Enter school". The hero is public, so a signed-out
// visitor signs in first and comes straight back here.
export default async function SchoolEntryPage() {
  if (!(await getSessionUserId())) redirect("/school/login");
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16">
      <h1 className="text-4xl tracking-tight">Who are you?</h1>
      <div className="mt-10 grid w-full max-w-lg grid-cols-2 gap-5">
        <Tile href="/school/kids" emoji="🧒" title="Student" text="Homework, levels and class updates" />
        <Tile href="/school/staff" emoji="🧑‍🏫" title="Staff" text="Teachers and school office" />
      </div>
    </div>
  );
}

function Tile({ href, emoji, title, text }: { href: string; emoji: string; title: string; text: string }) {
  return (
    <Link href={href} className="schools-tile">
      <span className="text-5xl" aria-hidden>
        {emoji}
      </span>
      <span className="font-[family-name:var(--font-fredoka)] text-lg font-semibold">{title}</span>
      <span className="text-xs text-muted">{text}</span>
    </Link>
  );
}

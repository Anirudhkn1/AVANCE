import Link from "next/link";
import { requireSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { randomAvatarValue } from "@/lib/avatar";
import { levelInfo } from "@/lib/school";
import { Avatar, Card } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { BackLink, fieldClass } from "@/components/school";
import { createKidAction } from "@/actions/school";

export default async function KidsPage() {
  const userId = await requireSessionUserId();
  const kids = await prisma.kidProfile.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } });
  const avatarChoices = Array.from({ length: 6 }, () => randomAvatarValue());

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-8">
      <BackLink href="/school/enter">Who are you?</BackLink>
      <h1 className="text-center text-3xl font-semibold tracking-tight">Which student?</h1>

      <div className="flex flex-wrap justify-center gap-8">
        {kids.map((k) => (
          <Link key={k.id} href={`/school/kid/${k.id}`} className="group flex w-32 flex-col items-center gap-2">
            <span className="flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-border bg-surface shadow-sm transition group-hover:scale-105 group-hover:border-accent [&_img]:h-24 [&_img]:w-24">
              <Avatar seed={k.avatarSeed} size="lg" />
            </span>
            <span className="text-sm font-medium">{k.name}</span>
            <span className="text-xs text-muted">Level {levelInfo(k.xp).level}</span>
          </Link>
        ))}
      </div>

      <Card className="mx-auto max-w-md">
        <h2 className="mb-3 text-lg font-semibold">＋ Add a student</h2>
        <SubmitForm action={createKidAction} submitLabel="Create account">
          <input name="name" placeholder="Student's name" required maxLength={60} className={fieldClass} />
          <fieldset>
            <legend className="mb-2 text-sm text-muted">Pick an avatar</legend>
            <div className="flex flex-wrap gap-2">
              {avatarChoices.map((seed, i) => (
                <label key={seed} className="cursor-pointer">
                  <input type="radio" name="avatarSeed" value={seed} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="block rounded-full border-2 border-transparent p-0.5 peer-checked:border-accent">
                    <Avatar seed={seed} size="lg" />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </SubmitForm>
      </Card>
    </div>
  );
}

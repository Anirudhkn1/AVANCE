import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pageKid } from "@/lib/school";
import { equippedCharacter } from "@/lib/voyage";
import { Card } from "@/components/ui";
import { BackLink } from "@/components/school";
import { CharacterStage } from "@/components/character-stage";
import { KidAvatar } from "@/components/kid-avatar";

// What opens when a student taps a classmate's name on the leaderboard: that
// classmate's hero, animated. Only classmates can be viewed, and only from a
// student's own login — teachers never reach this page.
export default async function ClassmateHeroPage({ params }: PageProps<"/school/kid/[kidId]/hero/[heroId]">) {
  const { kidId, heroId } = await params;
  const { kid, classroom } = await pageKid(kidId);
  if (!classroom) notFound();

  const mate = await prisma.kidProfile.findFirst({
    where: { id: heroId, classroomId: classroom.id, classroomStatus: "APPROVED" },
    select: { id: true, name: true, avatarSeed: true, xp: true, characterId: true },
  });
  if (!mate) notFound();
  const hero = equippedCharacter(mate.characterId, mate.xp);
  const mine = mate.id === kid.id;

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-5">
      <BackLink href={`/school/kid/${kid.id}/leaderboard`}>Back to the leaderboard</BackLink>
      <div className="flex items-center gap-3">
        <KidAvatar kid={mate} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{mine ? `${mate.name} (you)` : mate.name}</h1>
          <p className="text-sm text-muted">Class {classroom.name}</p>
        </div>
      </div>
      {hero ? (
        <CharacterStage character={hero} />
      ) : (
        <Card>
          <p className="text-sm text-muted">{mate.name} hasn&apos;t picked a Voyage hero yet.</p>
        </Card>
      )}
    </div>
  );
}

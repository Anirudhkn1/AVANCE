import { notFound } from "next/navigation";
import { pageKid } from "@/lib/school";
import { characterById, isUnlocked } from "@/lib/voyage";
import { Badge, Card } from "@/components/ui";
import { ActionButton } from "@/components/school-client";
import { BackLink } from "@/components/school";
import { CharacterStage } from "@/components/character-stage";
import { setCharacterAction } from "@/actions/school";

// A crew member the kid has unlocked on their Voyage: the full animated
// stage, plus the button that wears them as the profile picture. Reached from
// the Voyage map; only the kid's own parent login can open it.
export default async function VoyageCharacterPage({
  params,
}: PageProps<"/school/kid/[kidId]/voyage/[characterId]">) {
  const { kidId, characterId } = await params;
  const { kid } = await pageKid(kidId);
  const hero = characterById(characterId);
  if (!hero || !isUnlocked(hero, kid.xp)) notFound();
  const worn = kid.characterId === hero.id;

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-5">
      <BackLink href={`/school/kid/${kid.id}/homework`}>Back to your Voyage</BackLink>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,22rem)_1fr]">
        <CharacterStage character={hero} />
        <Card className="space-y-4">
          <div>
            <Badge tone="accent">Joined your crew at {hero.unlockXp} XP</Badge>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{hero.name}</h1>
            <p className="text-sm text-muted">{hero.epithet}</p>
          </div>
          <p className="text-sm">{hero.blurb}</p>
          {worn ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-success">★ {hero.name} is your profile picture right now.</p>
              <form action={setCharacterAction.bind(null, kid.id, null)}>
                <ActionButton variant="secondary">Go back to my avatar</ActionButton>
              </form>
            </div>
          ) : (
            <form action={setCharacterAction.bind(null, kid.id, hero.id)}>
              <ActionButton variant="primary" size="md">
                Wear {hero.name} as my profile picture
              </ActionButton>
            </form>
          )}
          <p className="text-xs text-muted">Classmates can tap your name on the leaderboard to see this animation.</p>
        </Card>
      </div>
    </div>
  );
}

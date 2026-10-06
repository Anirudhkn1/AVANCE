import { Avatar } from "@/components/avatar";
import { CHARACTERS, isUnlocked } from "@/lib/voyage";
import { setCharacterAction } from "@/actions/school";

// "Which face do I wear?" — the kid's own illustrated avatar, or any Voyage
// hero they've unlocked. Each choice is its own tiny server-action form.
export function ProfilePicturePicker({
  kidId,
  xp,
  avatarSeed,
  characterId,
}: {
  kidId: string;
  xp: number;
  avatarSeed: string;
  characterId: string | null;
}) {
  const unlocked = CHARACTERS.filter((c) => isUnlocked(c, xp));
  const wearing = unlocked.find((c) => c.id === characterId)?.id ?? null;

  const option = (selected: boolean) =>
    `flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-xs transition hover:border-accent ${selected ? "border-accent bg-accent-soft font-medium" : "border-transparent bg-surface-muted"}`;

  return (
    <div className="flex flex-wrap gap-3">
      <form action={setCharacterAction.bind(null, kidId, null)}>
        <button type="submit" className={option(wearing === null)} aria-pressed={wearing === null}>
          <Avatar seed={avatarSeed} size="lg" />
          My avatar
        </button>
      </form>
      {unlocked.map((c) => (
        <form key={c.id} action={setCharacterAction.bind(null, kidId, c.id)}>
          <button type="submit" className={option(wearing === c.id)} aria-pressed={wearing === c.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a 256px static crop */}
            <img src={c.face} alt="" className="h-14 w-14 rounded-full object-cover" />
            {c.name}
          </button>
        </form>
      ))}
      {unlocked.length === 0 && (
        <p className="self-center text-sm text-muted">Finish homework to sail your Voyage — heroes join your crew along the way.</p>
      )}
    </div>
  );
}

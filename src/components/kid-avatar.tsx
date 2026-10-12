import { Avatar } from "@/components/avatar";
import { equippedCharacter } from "@/lib/voyage";

// A student's profile picture: their equipped Voyage hero while their XP still
// covers it, otherwise the illustrated avatar they picked. Only used on
// student-facing pages — teachers keep seeing the plain avatar.

const SIZES = { sm: "h-6 w-6", md: "h-9 w-9", lg: "h-14 w-14", xl: "h-20 w-20" } as const;

export function KidAvatar({
  kid,
  size = "md",
}: {
  kid: { avatarSeed: string; characterId: string | null; xp: number };
  size?: keyof typeof SIZES;
}) {
  const hero = equippedCharacter(kid.characterId, kid.xp);
  if (!hero) return <Avatar seed={kid.avatarSeed} size={size === "xl" ? "lg" : size} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a 256px static crop; nothing for next/image to optimize
    <img
      src={hero.face}
      alt=""
      aria-hidden
      className={`inline-block rounded-full object-cover ring-2 ${SIZES[size]}`}
      style={{ ["--tw-ring-color" as string]: hero.accent }}
    />
  );
}

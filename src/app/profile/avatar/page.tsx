import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { updateAvatarAction } from "@/actions/profile";
import { AVATAR_STYLES, AVATAR_STYLE_LABELS, avatarValue, avatarDataUri, parseAvatarValue, isAvatarStyle, type AvatarStyle } from "@/lib/avatar";
import { Card } from "@/components/ui";

const OPTIONS_PER_SHUFFLE = 12;

export default async function AvatarPickerPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string; batch?: string }>;
}) {
  const user = await requireSessionUser();
  const { style: styleParam, batch: batchParam } = await searchParams;

  const style: AvatarStyle = styleParam && isAvatarStyle(styleParam) ? styleParam : AVATAR_STYLES[0];
  const batch = Number.parseInt(batchParam ?? "0", 10) || 0;
  const current = parseAvatarValue(user.avatarSeed);

  // Deterministic per (style, batch) so the grid a "Shuffle" link lands on
  // is stable across reloads/back-navigation, but different batches give a
  // different-looking set of options to browse.
  const candidateSeeds = Array.from({ length: OPTIONS_PER_SHUFFLE }, (_, i) => `b${batch}-${i}`);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Change avatar</h1>
        <p className="text-muted text-sm mt-1">
          {AVATAR_STYLES.length > 1 ? "Pick a style, then a face. Shuffle to see more." : "Pick one. Shuffle to see more."}
        </p>
      </div>

      {AVATAR_STYLES.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {AVATAR_STYLES.map((s) => (
            <Link
              key={s}
              href={`/profile/avatar?style=${s}`}
              className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                s === style ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:bg-surface-muted"
              }`}
            >
              {AVATAR_STYLE_LABELS[s]}
            </Link>
          ))}
        </div>
      )}

      <Card>
        <div className="grid grid-cols-4 gap-3">
          {candidateSeeds.map((seed) => {
            const isCurrent = current.style === style && current.seed === seed;
            return (
              <form key={seed} action={updateAvatarAction}>
                <input type="hidden" name="style" value={style} />
                <input type="hidden" name="seed" value={seed} />
                <button
                  type="submit"
                  aria-label={isCurrent ? "Current avatar" : "Choose this avatar"}
                  className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                    isCurrent ? "border-accent" : "border-transparent hover:border-border"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data: URI */}
                  <img
                    src={avatarDataUri(avatarValue(style, seed), 96)}
                    alt=""
                    className="w-full h-full bg-surface-muted"
                  />
                </button>
              </form>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center">
          <Link
            href={`/profile/avatar?style=${style}&batch=${batch + 1}`}
            className="text-sm text-accent hover:underline"
          >
            🔀 Shuffle for more
          </Link>
        </div>
      </Card>

      <Link href="/profile" className="text-sm text-muted hover:text-foreground">
        ← Back to profile
      </Link>
    </div>
  );
}

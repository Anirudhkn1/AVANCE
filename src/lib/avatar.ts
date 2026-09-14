// Illustrated, user-picked avatars via DiceBear — replaces the old
// non-customisable random-object emoji (former PRD §22 behaviour). See the
// picker at /profile/avatar.
//
// User.avatarSeed stores a single opaque string, "<style>|<seed>", so every
// other part of the app that just threads avatarSeed through to <Avatar>
// (navbar, leaderboard, activity feed, ...) never needs to know the
// encoding — only the helpers below parse/build it.
// DiceBear v10 split the old single "@dicebear/collection" package (which
// only ever reached v9, and has no Voxel Art) into @dicebear/core — now a
// Style/Avatar class API rather than v9's createAvatar() function — plus
// @dicebear/styles, which ships each style as a importable JSON definition.
import { Style, Avatar as DicebearAvatar } from "@dicebear/core";
import voxelArtDefinition from "@dicebear/styles/voxel-art.json" with { type: "json" };

// Single style by request — just DiceBear's "Voxel Art" set. AVATAR_STYLES
// stays an array (rather than one constant) so the picker page's style
// switcher can come back for free if another style is ever added.
export const AVATAR_STYLES = ["voxelArt"] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];

export const AVATAR_STYLE_LABELS: Record<AvatarStyle, string> = {
  voxelArt: "Voxel Art",
};

// New Style instances re-validate the definition's JSON Schema, so these are
// built once at module load and reused across every render (the Avatar
// constructor's own docs call this out) rather than per avatarDataUri() call.
const STYLES: Record<AvatarStyle, Style<unknown>> = {
  voxelArt: new Style(voxelArtDefinition),
};

export function isAvatarStyle(value: string): value is AvatarStyle {
  return (AVATAR_STYLES as readonly string[]).includes(value);
}

export function avatarValue(style: AvatarStyle, seed: string): string {
  return `${style}|${seed}`;
}

/** Splits a stored avatarSeed value into its style + seed. Bare seeds with
 * no "|" (accounts from before the picker existed, or from a style that's
 * since been retired) fall back to the current default style, using the
 * whole stored value as the seed, so old rows still render a deterministic
 * avatar instead of erroring. */
export function parseAvatarValue(value: string): { style: AvatarStyle; seed: string } {
  const i = value.indexOf("|");
  if (i === -1) return { style: AVATAR_STYLES[0], seed: value };
  const style = value.slice(0, i);
  const seed = value.slice(i + 1);
  return isAvatarStyle(style) && seed ? { style, seed } : { style: AVATAR_STYLES[0], seed: value };
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function randomAvatarValue(): string {
  const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
  return avatarValue(style, randomSeed());
}

/** Renders a stored avatarSeed value to an inline SVG data URI. */
export function avatarDataUri(value: string, size = 64): string {
  const { style, seed } = parseAvatarValue(value);
  return new DicebearAvatar(STYLES[style], { seed, size }).toDataUri();
}

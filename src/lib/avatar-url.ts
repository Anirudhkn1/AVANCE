// Kept apart from avatar.ts so building an avatar's URL never pulls the
// DiceBear renderer into a bundle — only /api/avatar renders the SVG.
export function avatarSrc(value: string): string {
  return `/api/avatar?v=${encodeURIComponent(value)}`;
}

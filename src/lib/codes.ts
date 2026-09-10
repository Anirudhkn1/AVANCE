export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

export function randomCode(groupSize = 4, groups = 2): string {
  const parts: string[] = [];
  for (let g = 0; g < groups; g++) {
    let part = "";
    for (let i = 0; i < groupSize; i++) {
      part += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    parts.push(part);
  }
  return parts.join("-");
}

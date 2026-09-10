// Random object avatars (PRD §22) — deliberately NOT customisable characters,
// just a deterministic fun object/emoji assigned at signup.

const OBJECTS = [
  "🪐", "🧭", "🧊", "🪀", "🔭", "🪁", "🧩", "🪄", "🧬", "🛰️",
  "🪛", "🧯", "🪃", "🧱", "🪆", "🧿", "🪤", "🧰", "🪑", "🧶",
  "🪙", "🧵", "🪞", "🧸", "🪟", "🧫", "🪚", "🧴", "🪥", "🧨",
];

export function randomAvatarSeed(): string {
  return OBJECTS[Math.floor(Math.random() * OBJECTS.length)];
}

export function avatarForSeed(seed: string): string {
  if (OBJECTS.includes(seed)) return seed;
  // Fallback: hash arbitrary seed strings into the same object set.
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return OBJECTS[hash % OBJECTS.length];
}

// The Voyage — Avance Schools' One Piece-inspired XP journey. A kid's XP
// (1–3 per homework, set by the teacher) moves their ship along a route of
// waypoints; some waypoints hand out a crew member, who can then be worn as the
// kid's profile picture and shown off in a full themed animation
// (src/components/character-stage.tsx).
//
// Plain data, no server-only imports — the Voyage map, the stage and the
// server actions all read from here. To add a character: drop the art in
// public/characters/<id>.jpg (+ <id>-face.jpg, a square crop), add an entry to
// CHARACTERS, give it a waypoint below, and a theme in character-stage.

/** Which themed effect set the stage plays for a character. */
export type StageTheme = "haki" | "blueflame" | "storm" | "sunrise";

export type Character = {
  id: string;
  name: string;
  epithet: string;
  blurb: string;
  /** XP at which the character joins the crew. */
  unlockXp: number;
  /** Full art, shown on the stage. */
  image: string;
  width: number;
  height: number;
  /** Square crop used as the profile picture. */
  face: string;
  theme: StageTheme;
  /** Brand colour for rings, glows and the stage's caption. */
  accent: string;
};

// Listed in the order they join the crew — Luffy, the main character, last.
export const CHARACTERS: readonly Character[] = [
  {
    id: "nami",
    name: "Nami",
    epithet: "Navigator of the Straw Hats",
    blurb: "Reads the sky like a map — and calls down the thunder when she's annoyed.",
    unlockXp: 100,
    image: "/characters/nami.jpg",
    width: 633,
    height: 1200,
    face: "/characters/nami-face.jpg",
    theme: "storm",
    accent: "#ff9f1c",
  },
  {
    id: "shanks",
    name: "Shanks",
    epithet: "Red-Haired · Conqueror's Haki",
    blurb: "He doesn't need to raise his voice. The sea itself goes quiet.",
    unlockXp: 250,
    image: "/characters/shanks.jpg",
    width: 736,
    height: 736,
    face: "/characters/shanks-face.jpg",
    theme: "haki",
    accent: "#e63946",
  },
  {
    id: "sanji",
    name: "Sanji",
    epithet: "Black Leg · Cook of the Straw Hats",
    blurb: "Calm smile, cigarette lit — and his kicks burn blue.",
    unlockXp: 500,
    image: "/characters/sanji.jpg",
    width: 572,
    height: 974,
    face: "/characters/sanji-face.jpg",
    theme: "blueflame",
    accent: "#4cc9f0",
  },
  {
    id: "luffy",
    name: "Luffy",
    epithet: "Captain of the Straw Hats",
    blurb: "The one who set sail first, and never once looked back.",
    unlockXp: 750,
    image: "/characters/luffy.jpg",
    width: 736,
    height: 1044,
    face: "/characters/luffy-face.jpg",
    theme: "sunrise",
    accent: "#ffd166",
  },
];

export function characterById(id: string | null | undefined): Character | null {
  return CHARACTERS.find((c) => c.id === id) ?? null;
}

export const isUnlocked = (c: Character, xp: number) => xp >= c.unlockXp;

/** The kid's chosen profile hero — only while their XP still covers it. */
export function equippedCharacter(characterId: string | null | undefined, xp: number): Character | null {
  const c = characterById(characterId);
  return c && isUnlocked(c, xp) ? c : null;
}

// ---------------------------------------------------------------------------
// Waypoints along the route. Characters sit at their unlock XP; the rest are
// milestones. The last one is a teaser for the crew that's still to come.
// ---------------------------------------------------------------------------

export type Waypoint = {
  xp: number;
  /** Island name on the map. */
  name: string;
  characterId?: string;
  /** Emoji for waypoints without a character. */
  icon?: string;
};

export const WAYPOINTS: readonly Waypoint[] = [
  { xp: 0, name: "Home Port", icon: "⚓" },
  { xp: 50, name: "Set Sail!", icon: "🏴‍☠️" },
  { xp: 100, name: "Cocoyasi", characterId: "nami" },
  { xp: 250, name: "Foosha Village", characterId: "shanks" },
  { xp: 500, name: "Baratie", characterId: "sanji" },
  { xp: 750, name: "Captain's Island", characterId: "luffy" },
  { xp: 1000, name: "Mystery Island", icon: "❓" },
];

// ---------------------------------------------------------------------------
// Levels — each waypoint past Home Port is a level: Level 2 at 50 XP, Level 3
// at 100, then 250, 500, 750, 1000 … and "so on" is every 250 XP after that.
// ---------------------------------------------------------------------------

const LEVEL_STEP_AFTER_ROUTE = 250;

function levelFloor(level: number): number {
  if (level <= WAYPOINTS.length) return WAYPOINTS[level - 1].xp;
  return WAYPOINTS[WAYPOINTS.length - 1].xp + (level - WAYPOINTS.length) * LEVEL_STEP_AFTER_ROUTE;
}

export function levelInfo(xp: number) {
  let level = 1;
  while (xp >= levelFloor(level + 1)) level++;
  const floor = levelFloor(level);
  const next = levelFloor(level + 1);
  return { level, into: xp - floor, span: next - floor, toNext: next - xp };
}

/** The next waypoint a kid hasn't reached yet, or null once the route is done. */
export function nextWaypoint(xp: number): Waypoint | null {
  return WAYPOINTS.find((w) => w.xp > xp) ?? null;
}

/**
 * How far along the route the ship is, as a position between waypoint
 * indexes (e.g. 2.5 = halfway from the 3rd waypoint to the 4th). Past the
 * last waypoint it rests on it.
 */
export function routePosition(xp: number): number {
  const last = WAYPOINTS.length - 1;
  if (xp >= WAYPOINTS[last].xp) return last;
  let i = 0;
  while (xp >= WAYPOINTS[i + 1].xp) i++;
  return i + (xp - WAYPOINTS[i].xp) / (WAYPOINTS[i + 1].xp - WAYPOINTS[i].xp);
}

export const HOMEWORK_XP_CHOICES = [1, 2, 3] as const;

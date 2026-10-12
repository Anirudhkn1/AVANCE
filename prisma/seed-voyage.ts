// Voyage demo data for the demo school ("Sunrise Public School", see
// seed-school.ts). Safe to re-run any time — it recomputes every kid's XP from
// their completions first, then re-applies the demo targets:
//
//   • Aarav Sharma (5-A)  — 820 XP: the whole crew unlocked (Nami, Shanks,
//     Sanji, Luffy); wears Shanks. Open any hero from the Voyage on his
//     Homework page.
//   • Diya Sharma (4-A)   — 72 XP: sailing past "Set Sail!", Nami still locked
//     (28 XP to go) — progress in motion.
//   • A few 5-A classmates — spread across the heroes, so tapping names on
//     Aarav's leaderboard opens different animations.
//
//   npm run db:seed:voyage
//
// Run it after `npm run db:seed:school`. XP for the demo kids above is
// set directly (a demo shortcut) rather than earned from 1–3 XP homework.

import { prisma } from "./seed-helpers";

// Kept in step with STAFF_CODE in seed-school.ts.
const DEMO_STAFF_CODE = "STAF-2026";

// [xp, hero] for Aarav's first classmates, in name order — heroes must match
// what that XP unlocks (src/lib/voyage.ts).
const CLASSMATES: [number, string][] = [
  [130, "nami"],
  [265, "shanks"],
  [540, "sanji"],
  [790, "luffy"],
  [112, "nami"],
  [310, "shanks"],
];

const hash = (id: string) => [...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);

async function main() {
  const school = await prisma.school.findUnique({ where: { staffCode: DEMO_STAFF_CODE } });
  if (!school) {
    console.log("No demo school found — run `npm run db:seed:school` first.");
    return;
  }

  // 1. Homework that was never given an XP value (all still the default 1) gets 1–3, stable per id.
  const homework = await prisma.homework.findMany({
    where: { subject: { classroom: { schoolId: school.id } } },
    select: { id: true, xp: true },
  });
  if (homework.length > 0 && homework.every((h) => h.xp === 1)) {
    for (const xp of [1, 2, 3]) {
      const ids = homework.filter((h) => 1 + (hash(h.id) % 3) === xp).map((h) => h.id);
      if (xp > 1 && ids.length) await prisma.homework.updateMany({ where: { id: { in: ids } }, data: { xp } });
    }
    console.log(`Gave ${homework.length} homework a 1–3 XP value.`);
  }

  // 2. Everyone's XP = what their completions are worth.
  const kids = await prisma.kidProfile.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true, classroom: { select: { name: true } }, classroomStatus: true, completions: { select: { homework: { select: { xp: true } } } } },
    orderBy: { name: "asc" },
  });
  const xp = new Map(kids.map((k) => [k.id, k.completions.reduce((n, c) => n + c.homework.xp, 0)]));
  const hero = new Map<string, string | null>(kids.map((k) => [k.id, null]));

  // 3. Demo targets.
  const byName = (name: string) => kids.find((k) => k.name === name);
  const aarav = byName("Aarav Sharma");
  const diya = byName("Diya Sharma");
  if (aarav) {
    xp.set(aarav.id, 820);
    hero.set(aarav.id, "shanks");
  }
  if (diya) xp.set(diya.id, 72);

  const classmates = kids.filter((k) => k.classroom?.name === "5-A" && k.classroomStatus === "APPROVED" && k.id !== aarav?.id);
  CLASSMATES.forEach(([points, id], i) => {
    const kid = classmates[i];
    if (!kid) return;
    xp.set(kid.id, points);
    hero.set(kid.id, id);
  });

  for (const k of kids) {
    await prisma.kidProfile.update({ where: { id: k.id }, data: { xp: xp.get(k.id)!, characterId: hero.get(k.id) } });
  }
  console.log(`Voyage: ${kids.length} kids updated.`);
  if (aarav) console.log("  Aarav Sharma: 820 XP, whole crew unlocked, wearing Shanks.");
  if (diya) console.log("  Diya Sharma: 72 XP, still sailing (Nami unlocks at 100).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

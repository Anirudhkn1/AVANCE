// Demo Elixir decks for the demo school ("Sunrise Public School", see
// seed-school.ts): a few teacher-written decks per class so a kid has cards to
// brew straight away. Idempotent — decks that already exist are skipped, and
// it never touches progress or points.
//
//   npm run db:seed:elixir
//
// Run it after `npm run db:seed:school` (which rebuilds the school and, with
// it, deletes the decks under its subjects).

import { prisma } from "./seed-helpers";

// Kept in step with STAFF_CODE in seed-school.ts.
const DEMO_STAFF_CODE = "STAF-2026";

type Deck = { class: string; subject: string; title: string; cards: [string, string][] };

const DECKS: Deck[] = [
  {
    class: "5-A",
    subject: "Maths",
    title: "Times tables",
    cards: [
      ["7 × 8", "56"],
      ["9 × 6", "54"],
      ["12 × 4", "48"],
      ["8 × 8", "64"],
      ["6 × 7", "42"],
      ["11 × 9", "99"],
      ["9 × 9", "81"],
      ["12 × 12", "144"],
      ["7 × 7", "49"],
      ["8 × 6", "48"],
      ["13 × 5", "65"],
      ["15 × 4", "60"],
    ],
  },
  {
    class: "5-A",
    subject: "Maths",
    title: "Fractions basics",
    cards: [
      ["What is 1/2 + 1/4?", "3/4"],
      ["Simplify 6/8", "3/4"],
      ["Which is bigger: 2/3 or 3/5?", "2/3"],
      ["What is the top number of a fraction called?", "The numerator"],
      ["What is the bottom number of a fraction called?", "The denominator"],
      ["Write 0.5 as a fraction", "1/2"],
      ["What is 3/4 of 20?", "15"],
      ["What is 1/3 + 1/3?", "2/3"],
    ],
  },
  {
    class: "5-A",
    subject: "Science",
    title: "Parts of a plant",
    cards: [
      ["Which part of a plant absorbs water from the soil?", "The roots"],
      ["Which part makes food for the plant?", "The leaves"],
      ["What is the process of making food using sunlight called?", "Photosynthesis"],
      ["Which part holds the plant up and carries water?", "The stem"],
      ["Which part grows into a fruit?", "The flower (its ovary)"],
      ["What green substance in leaves traps sunlight?", "Chlorophyll"],
      ["What gas do plants take in from the air?", "Carbon dioxide"],
      ["What gas do plants give out?", "Oxygen"],
    ],
  },
  {
    class: "5-A",
    subject: "English",
    title: "Word meanings",
    cards: [
      ["Enormous means…", "Very big"],
      ["Opposite of ancient", "Modern"],
      ["Synonym for happy", "Joyful"],
      ["Plural of mouse", "Mice"],
      ["Past tense of run", "Ran"],
      ["Opposite of brave", "Cowardly"],
      ["A word that describes a noun is called…", "An adjective"],
      ["A word that describes a verb is called…", "An adverb"],
    ],
  },
  {
    class: "4-A",
    subject: "Maths",
    title: "Tables 2 to 5",
    cards: [
      ["3 × 7", "21"],
      ["4 × 6", "24"],
      ["5 × 9", "45"],
      ["2 × 8", "16"],
      ["4 × 8", "32"],
      ["3 × 9", "27"],
      ["5 × 7", "35"],
      ["4 × 9", "36"],
    ],
  },
  {
    class: "4-A",
    subject: "EVS",
    title: "Our surroundings",
    cards: [
      ["Which animal gives us wool?", "The sheep"],
      ["What do bees make?", "Honey"],
      ["What do we call animals that eat only plants?", "Herbivores"],
      ["Which season comes after summer in India?", "The monsoon (rainy season)"],
      ["Which gas do we need to breathe?", "Oxygen"],
      ["Where do fish live?", "In water"],
    ],
  },
];

async function main() {
  // By staff code, not name: a hand-made school can share the demo school's name.
  const school = await prisma.school.findUnique({ where: { staffCode: DEMO_STAFF_CODE } });
  if (!school) {
    console.log("No demo school found — run `npm run db:seed:school` first.");
    return;
  }
  let made = 0;
  for (const d of DECKS) {
    const subject = await prisma.subject.findFirst({
      where: { name: d.subject, classroom: { schoolId: school.id, name: d.class } },
    });
    if (!subject) continue;
    const exists = await prisma.elixirDeck.findFirst({ where: { subjectId: subject.id, title: d.title } });
    if (exists) continue;
    await prisma.elixirDeck.create({
      data: {
        subjectId: subject.id,
        title: d.title,
        cards: { create: d.cards.map(([front, back]) => ({ front, back })) },
      },
    });
    made++;
  }
  console.log(`Elixir demo decks: ${made} created, ${DECKS.length - made} already there or skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

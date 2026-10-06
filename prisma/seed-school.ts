// Demo data for the School section: "Sunrise Public School", made to look as
// if it has run on Avance for about two months — three classrooms, six staff,
// ~65 kids, daily homework with a realistic spread of on-time / late / missed
// completions, teachers' daily class notes, announcements with PDF circulars
// and a timetable PDF per class.
//
// Everything is dated relative to *now* (IST), so run it again right before a
// demo: it deletes the previous demo school and rebuilds it.
//
//   npm run db:seed:school
//
// Demo logins (password123): parent@avance.dev (student side: Aarav, 5-A, and
// Diya, 4-A), teacher@avance.dev (Ms. Ananya Rao, class teacher of 5-A),
// principal@avance.dev (school admin).

import { randomUUID } from "node:crypto";
import { avatarValue } from "../src/lib/avatar";
import { DEMO_PASSWORD, ensureUser, prisma, supabaseAdmin } from "./seed-helpers";
import { PdfPage, renderPdf } from "./seed-pdf";

// Kept in step with src/lib/school.ts (which can't be imported here: it is
// `server-only`).
// Each homework is worth 1–3 XP (teacher's choice) — see src/lib/voyage.ts.
const BUCKET = "school-files";

// Every demo code contains a character randomCode() never produces (I, O or
// 0), so they can't collide with a real school's codes.
const STAFF_CODE = "STAF-2026";
const STUDENT_CODE = "KIDS-2026";

// ---------------------------------------------------------------------------
// Deterministic randomness, so every re-seed tells the same story.
// ---------------------------------------------------------------------------

let state = 20260801;
function rand() {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const chance = (p: number) => rand() < p;
const between = (a: number, b: number) => a + rand() * (b - a);
const int = (a: number, b: number) => Math.floor(between(a, b + 1));
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
function shuffle<T>(xs: T[]) {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

// ---------------------------------------------------------------------------
// IST calendar. Days are "YYYY-MM-DD" strings in IST.
// ---------------------------------------------------------------------------

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const istDay = (d: Date) => new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
const addDays = (day: string, count: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10);
const weekday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
/** A moment on an IST day, `hours` after midnight (fractional hours allowed). */
const istAt = (day: string, hours: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) - IST_OFFSET_MS + Math.round(hours * 3_600_000));
const istDayEnd = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - IST_OFFSET_MS + DAY_MS - 1);
const longDate = (day: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`)
  );
const shortDate = (day: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`)
  );

const NOW = new Date();
const TODAY = istDay(NOW);
const NOW_HOURS = (NOW.getTime() + IST_OFFSET_MS - Date.parse(`${TODAY}T00:00:00Z`)) / 3_600_000;
const START = addDays(TODAY, -62); // the school's first week on Avance

/** Sundays and the 2nd/4th Saturdays are off. */
function isSchoolDay(day: string) {
  const w = weekday(day);
  if (w === 0) return false;
  if (w === 6) {
    const date = Number(day.slice(8));
    if ((date >= 8 && date <= 14) || (date >= 22 && date <= 28)) return false;
  }
  return true;
}

function nextSchoolDay(day: string, count = 1) {
  let d = day;
  while (count > 0) {
    d = addDays(d, 1);
    if (isSchoolDay(d)) count--;
  }
  return d;
}

function nearestSchoolDay(day: string, weekdayWanted: number) {
  let d = day;
  while (weekday(d) !== weekdayWanted || !isSchoolDay(d)) d = addDays(d, 1);
  return d;
}

const SCHOOL_DAYS: string[] = [];
for (let d = START; d <= TODAY; d = addDays(d, 1)) if (isSchoolDay(d)) SCHOOL_DAYS.push(d);

/** Seeded events only exist if their time has already come. */
const happened = (d: Date) => d.getTime() <= NOW.getTime() - 5 * 60 * 1000;

/** A time earlier today, for things planned "today" that are still in the future. */
function clampToNow(d: Date): Date | null {
  if (happened(d)) return d;
  if (istDay(d) !== TODAY || NOW_HOURS < 9) return null; // school hasn't started yet
  return new Date(NOW.getTime() - between(15, 45) * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Cast
// ---------------------------------------------------------------------------

const STAFF = {
  principal: { name: "Mrs. Lakshmi Iyer", email: "principal@avance.dev", short: "Mrs. Iyer" },
  ananya: { name: "Ms. Ananya Rao", email: "teacher@avance.dev", short: "Ms. Rao" },
  suresh: { name: "Mr. Suresh Menon", email: "suresh.menon@avance.dev", short: "Mr. Menon" },
  farah: { name: "Mrs. Farah Khan", email: "farah.khan@avance.dev", short: "Mrs. Khan" },
  prakash: { name: "Mr. Prakash Gowda", email: "prakash.gowda@avance.dev", short: "Mr. Gowda" },
  shwetha: { name: "Mrs. Shwetha Hegde", email: "shwetha.hegde@avance.dev", short: "Mrs. Hegde" },
} as const;
type StaffKey = keyof typeof STAFF;

const PENDING_TEACHER = { name: "Mr. Rohit Verma", email: "rohit.verma@avance.dev" };
const PARENT = { name: "Kiran Sharma", email: "parent@avance.dev" };
// Owns every classmate's kid profile. Never shown anywhere (staff see kids,
// not their parents), so one account stands in for all the other families.
const FAMILIES = { name: "Sunrise families (demo)", email: "families@avance.dev" };

const FIRST_NAMES = [
  "Aditi", "Advait", "Ahana", "Anika", "Arnav", "Avni", "Ayaan", "Chirag", "Dhruv", "Esha", "Gautam", "Harini",
  "Ishaan", "Ira", "Kabir", "Kavya", "Krish", "Lavanya", "Manav", "Mihika", "Nakul", "Navya", "Nikhil", "Ojas",
  "Pari", "Pranav", "Reyansh", "Riya", "Rohan", "Saanvi", "Samarth", "Sara", "Shreya", "Siddharth", "Tanvi",
  "Tejas", "Vihaan", "Vedika", "Yash", "Zoya", "Aryan", "Anaya", "Darsh", "Gauri", "Hrithik", "Jiya",
  "Keerthana", "Lakshya", "Myra", "Nithya", "Om", "Prisha", "Rehaan", "Sahana", "Tara", "Uday", "Varun",
  "Vaishnavi", "Yuvan", "Aadhya", "Bhavya", "Charan", "Ritvik", "Sneha", "Kiara", "Atharv",
];
const LAST_NAMES = [
  "Reddy", "Iyer", "Nair", "Rao", "Shetty", "Kulkarni", "Hegde", "Gowda", "Patil", "Menon", "Joshi", "Kapoor",
  "Khan", "Fernandes", "D'Souza", "Bhat", "Kamath", "Naidu", "Gupta", "Verma", "Murthy", "Prasad", "Das",
  "Singh", "Mehta", "Shah", "Acharya", "Chatterjee",
];

// ---------------------------------------------------------------------------
// Curriculum — chapter lists and the phrasing teachers use for homework and
// "taught today" notes. {t} = current chapter, {g} = grammar point,
// {n} = worksheet number, {p}/{p2} = textbook pages.
// ---------------------------------------------------------------------------

type Kind = "maths" | "english" | "science" | "social" | "hindi" | "kannada" | "evs";

const HOMEWORK: Record<Kind, string[]> = {
  maths: [
    "{t}: textbook practice, Q1–8",
    "{t}: worksheet {n}",
    "{t}: solve the 5 word problems from the board",
    "{t}: finish the classwork sums",
    "Revise {t} for the class quiz",
    "Tables 12 to 16 — write once and learn",
  ],
  english: [
    "Read '{t}' aloud twice and answer Q1–5",
    "'{t}': new words — meanings and one sentence each",
    "Write 8 lines: what did you like about '{t}'?",
    "Grammar worksheet: {g}",
    "Learn the spellings from '{t}' for dictation",
    "Picture composition: describe the picture in 8 lines",
  ],
  science: [
    "{t}: answer the questions at the end of the chapter",
    "{t}: draw and label the diagram",
    "{t}: write 5 facts you learnt today",
    "{t}: try the activity at home and note what happened",
    "{t}: fill-in-the-blanks worksheet",
  ],
  social: [
    "{t}: answer Q1–4 of the exercise",
    "{t}: mark the places on the outline map",
    "{t}: make a mind map in the notebook",
    "{t}: learn the key words for the quiz",
  ],
  hindi: [
    "पाठ '{t}' पढ़ो और प्रश्न 1–4 के उत्तर लिखो",
    "'{t}' से 10 नए शब्द और उनके अर्थ लिखो",
    "सुलेख: '{t}' का पहला अनुच्छेद",
    "व्याकरण worksheet: {g}",
  ],
  kannada: [
    "{t}: one page in the copy-writing book",
    "{t}: write 10 words and read them aloud",
    "{t}: practise and recite tomorrow",
    "Dictation practice: {t}",
  ],
  evs: [
    "{t}: answer the questions in the book",
    "{t}: draw a picture and write 3 lines about it",
    "{t}: ask your grandparents and write what they said",
    "{t}: worksheet {n}",
  ],
};

const HOMEWORK_DETAILS = [
  "Do it in the homework notebook.",
  "Neat handwriting, please!",
  "Parents, please check and sign.",
  "Show all steps.",
  "Bring it to class tomorrow — we'll discuss it together.",
  "Use a pencil for diagrams.",
];

const NOTES: Record<Kind, string[]> = {
  maths: [
    "{t}: introduced with examples on the board, pages {p}–{p2}.",
    "{t}: solved textbook questions together; practice in pairs.",
    "{t}: 10-minute quiz, then corrected mistakes together.",
    "{t}: hands-on activity with paper cut-outs — the class loved it.",
    "{t}: word problems. A few children need more practice here.",
  ],
  english: [
    "Read '{t}' aloud in class and discussed the new words.",
    "'{t}': comprehension questions answered orally.",
    "Grammar — {g}. Practice in the classwork notebook.",
    "Dictation and spelling check from '{t}'.",
    "'{t}': role-play in groups of four.",
  ],
  science: [
    "{t}: explained with a small experiment in class.",
    "{t}: drew and labelled the diagram together, pages {p}–{p2}.",
    "{t}: watched a short video and discussed it.",
    "{t}: chapter revision with a Q&A round.",
  ],
  social: [
    "{t}: read pages {p}–{p2} and discussed.",
    "{t}: map work in class.",
    "{t}: group discussion and a quick quiz.",
  ],
  hindi: ["पाठ '{t}' पढ़ा, कठिन शब्दों के अर्थ समझे।", "'{t}': प्रश्न-उत्तर कक्षा में।", "सुलेख और श्रुतलेख अभ्यास।", "व्याकरण: {g}।"],
  kannada: ["{t}: practised in class and read aloud together.", "{t}: copy-writing in class.", "Dictation and reading practice."],
  evs: [
    "{t}: read the story together and discussed it.",
    "{t}: group activity, pages {p}–{p2}.",
    "{t}: children shared their own experiences.",
  ],
};

const GRAMMAR: Partial<Record<Kind, string[]>> = {
  english: ["nouns and pronouns", "adjectives", "simple past tense", "articles a, an, the", "punctuation", "prepositions", "conjunctions"],
  hindi: ["संज्ञा", "सर्वनाम", "विशेषण", "क्रिया", "विलोम शब्द", "पर्यायवाची शब्द"],
};

const TOPICS = {
  maths5: ["The Fish Tale", "Shapes and Angles", "How Many Squares?", "Parts and Wholes", "Does It Look the Same?", "Be My Multiple, I'll Be Your Factor", "Can You See the Pattern?", "Mapping Your Way", "Boxes and Sketches"],
  english5: ["Ice-cream Man", "Wonderful Waste!", "Teamwork", "Flying Together", "My Shadow", "Robinson Crusoe Discovers a Footprint", "Crying", "My Elder Brother", "The Lazy Frog"],
  science5: ["Super Senses", "Food and Digestion", "Seeds and Germination", "Every Drop Counts", "Experiments with Water", "Up You Go! (Air)", "Our Skeletal System", "Simple Machines", "Soil and Erosion"],
  social5: ["Maps and Directions", "Latitudes and Longitudes", "Continents and Oceans", "Weather and Climate", "Forests and Wildlife", "Natural Resources", "Our Country India", "Our Constitution", "Local Government"],
  hindi5: ["राख की रस्सी", "फसलों के त्योहार", "खिलौनेवाला", "नन्हा फनकार", "जहाँ चाह वहाँ राह", "चिट्ठी का सफ़र", "डाकिए की कहानी", "वे दिन भी क्या दिन थे", "एक माँ की बेबसी"],
  kannada: ["ಕಾಗುಣಿತ (Kagunita)", "ಒತ್ತಕ್ಷರ (Ottakshara)", "ಪದ್ಯ: ಮಳೆ ಬಂತು", "ಗಾದೆಗಳು (Proverbs)", "ಪತ್ರ ಲೇಖನ (Letter writing)", "ಕಥೆ: ಜಾಣ ಕಾಗೆ", "ವಿರುದ್ಧ ಪದಗಳು (Opposites)", "ಪದ್ಯ: ನಮ್ಮ ಶಾಲೆ", "ಪ್ರಬಂಧ (Essay)"],
  maths4: ["Building with Bricks", "Long and Short", "A Trip to Bhopal", "Tick-Tick-Tick", "The Way the World Looks", "The Junk Seller", "Jugs and Mugs", "Carts and Wheels", "Halves and Quarters"],
  english4: ["Wake Up!", "Neha's Alarm Clock", "Noses", "The Little Fir Tree", "Run!", "Nasruddin's Aim", "Why?", "Alice in Wonderland", "Don't Be Afraid of the Dark"],
  evs4: ["Going to School", "Ear to Ear", "A Day with Nandu", "The Story of Amrita", "Anita and the Honeybees", "Omana's Journey", "From the Window", "Reaching Grandmother's House", "Changing Families"],
  hindi4: ["मन के भोले-भाले बादल", "जैसा सवाल वैसा जवाब", "किरमिच की गेंद", "पापा जब बच्चे थे", "दोस्त की पोशाक", "नाव बनाओ नाव बनाओ", "दान का हिसाब", "कौन?", "स्वतंत्रता की ओर"],
};

type SubjectPlan = { name: string; kind: Kind; teacher: StaffKey; periods: number; hwChance: number; topics: string[] };
type ClassPlan = {
  name: string;
  joinCode: string;
  createdBy: StaffKey;
  kidCount: number;
  subjects: SubjectPlan[];
  /** Timetable periods with no homework (PE, Library…). */
  extras: Record<string, number>;
};

const CLASSES: ClassPlan[] = [
  {
    name: "4-A",
    joinCode: "FOUR-A26",
    createdBy: "prakash",
    kidCount: 20,
    subjects: [
      { name: "English", kind: "english", teacher: "suresh", periods: 6, hwChance: 0.55, topics: TOPICS.english4 },
      { name: "EVS", kind: "evs", teacher: "shwetha", periods: 7, hwChance: 0.45, topics: TOPICS.evs4 },
      { name: "Hindi", kind: "hindi", teacher: "farah", periods: 4, hwChance: 0.5, topics: TOPICS.hindi4 },
      { name: "Kannada", kind: "kannada", teacher: "shwetha", periods: 4, hwChance: 0.5, topics: TOPICS.kannada },
      { name: "Maths", kind: "maths", teacher: "prakash", periods: 7, hwChance: 0.7, topics: TOPICS.maths4 },
    ],
    extras: { Computer: 2, PE: 4, Library: 1, Art: 4 },
  },
  {
    name: "5-A",
    joinCode: "FIVE-A26",
    createdBy: "ananya",
    kidCount: 24,
    subjects: [
      { name: "English", kind: "english", teacher: "suresh", periods: 6, hwChance: 0.6, topics: TOPICS.english5 },
      { name: "Hindi", kind: "hindi", teacher: "farah", periods: 4, hwChance: 0.55, topics: TOPICS.hindi5 },
      { name: "Kannada", kind: "kannada", teacher: "shwetha", periods: 4, hwChance: 0.55, topics: TOPICS.kannada },
      { name: "Maths", kind: "maths", teacher: "ananya", periods: 7, hwChance: 0.75, topics: TOPICS.maths5 },
      { name: "Science", kind: "science", teacher: "ananya", periods: 5, hwChance: 0.5, topics: TOPICS.science5 },
      { name: "Social Studies", kind: "social", teacher: "prakash", periods: 5, hwChance: 0.5, topics: TOPICS.social5 },
    ],
    extras: { Computer: 2, PE: 3, Library: 1, Art: 2 },
  },
  {
    name: "5-B",
    joinCode: "FIVE-B26",
    createdBy: "suresh",
    kidCount: 22,
    subjects: [
      { name: "English", kind: "english", teacher: "suresh", periods: 6, hwChance: 0.6, topics: TOPICS.english5 },
      { name: "Hindi", kind: "hindi", teacher: "farah", periods: 4, hwChance: 0.55, topics: TOPICS.hindi5 },
      { name: "Kannada", kind: "kannada", teacher: "shwetha", periods: 4, hwChance: 0.55, topics: TOPICS.kannada },
      { name: "Maths", kind: "maths", teacher: "ananya", periods: 7, hwChance: 0.75, topics: TOPICS.maths5 },
      { name: "Science", kind: "science", teacher: "shwetha", periods: 5, hwChance: 0.5, topics: TOPICS.science5 },
      { name: "Social Studies", kind: "social", teacher: "prakash", periods: 5, hwChance: 0.5, topics: TOPICS.social5 },
    ],
    extras: { Computer: 2, PE: 3, Library: 1, Art: 2 },
  },
];

// ---------------------------------------------------------------------------
// Timetable: Mon–Fri have 7 periods, Saturday 4.
// ---------------------------------------------------------------------------

const PERIODS_PER_DAY: Record<number, number> = { 1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 4 };
type Grid = Record<number, string[]>; // weekday -> subject per period

function buildTimetable(plan: ClassPlan): Grid {
  const bag: string[] = [];
  for (const s of plan.subjects) for (let i = 0; i < s.periods; i++) bag.push(s.name);
  for (const [label, count] of Object.entries(plan.extras)) for (let i = 0; i < count; i++) bag.push(label);

  for (let attempt = 0; ; attempt++) {
    const order = shuffle([...bag]);
    const grid: Grid = {};
    let ok = true;
    for (let w = 1; w <= 6; w++) {
      grid[w] = order.splice(0, PERIODS_PER_DAY[w]);
      const counts = new Map<string, number>();
      for (const label of grid[w]) counts.set(label, (counts.get(label) ?? 0) + 1);
      if ([...counts.values()].some((c) => c > 2)) ok = false;
    }
    if (ok || attempt > 2000) return grid;
  }
}

// ---------------------------------------------------------------------------
// PDFs
// ---------------------------------------------------------------------------

const SCHOOL_NAME = "Sunrise Public School";
const SCHOOL_ADDRESS = "14th Cross, Jayanagar 4th Block, Bengaluru 560011";
const PERIOD_TIMES = ["8:45-9:25", "9:25-10:05", "10:05-10:45", "11:00-11:40", "11:40-12:20", "1:00-1:40", "1:40-2:20"];
const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ACCENT: [number, number, number] = [0.35, 0.33, 0.75];

function timetablePdf(plan: ClassPlan, grid: Grid, updatedDay: string) {
  const page = new PdfPage(842, 595);
  page.text(47, 545, SCHOOL_NAME, { size: 20, bold: true, color: ACCENT });
  page.text(47, 524, `Class ${plan.name} - Timetable 2026-27 (Term 1)`, { size: 13, bold: true });
  page.text(47, 508, SCHOOL_ADDRESS, { size: 9, color: [0.4, 0.4, 0.45] });

  // Columns: Day | P1 P2 P3 | Break | P4 P5 | Lunch | P6 P7
  const columns: { kind: "day" | "period" | "break"; period?: number; label?: string; time?: string; w: number }[] = [
    { kind: "day", w: 84 },
    ...[0, 1, 2].map((p) => ({ kind: "period" as const, period: p, w: 84 })),
    { kind: "break", label: "BREAK", time: "10:45", w: 40 },
    ...[3, 4].map((p) => ({ kind: "period" as const, period: p, w: 84 })),
    { kind: "break", label: "LUNCH", time: "12:20", w: 40 },
    ...[5, 6].map((p) => ({ kind: "period" as const, period: p, w: 84 })),
  ];
  const teacherOf = new Map(plan.subjects.map((s) => [s.name, STAFF[s.teacher].short]));
  const top = 490;
  const headerH = 40;
  const rowH = 54;
  const bodyTop = top - headerH;
  const bodyH = rowH * 6;

  let x = 47;
  for (const col of columns) {
    page.box(x, bodyTop, col.w, headerH, { fill: [0.92, 0.92, 0.98] });
    if (col.kind === "day") {
      page.centered(x + col.w / 2, bodyTop + 16, "Day", { size: 10, bold: true });
    } else if (col.kind === "break") {
      page.box(x, bodyTop - bodyH, col.w, bodyH, { fill: [0.97, 0.95, 0.88] });
      page.centered(x + col.w / 2, bodyTop + 22, col.time!, { size: 7 });
      [...col.label!].forEach((ch, i) => page.centered(x + col.w / 2, bodyTop - 70 - i * 36, ch, { size: 11, bold: true, color: [0.55, 0.5, 0.35] }));
    } else {
      const p = col.period!;
      page.centered(x + col.w / 2, bodyTop + 22, `Period ${p + 1}`, { size: 10, bold: true });
      page.centered(x + col.w / 2, bodyTop + 9, PERIOD_TIMES[p], { size: 7.5, color: [0.4, 0.4, 0.45] });
      for (let w = 1; w <= 6; w++) {
        const y = bodyTop - w * rowH;
        const label = grid[w][p];
        page.box(x, y, col.w, rowH, label ? {} : { fill: [0.94, 0.94, 0.95] });
        if (label) {
          page.centered(x + col.w / 2, y + rowH / 2 + 3, label, { size: 10.5, bold: teacherOf.has(label) });
          const teacher = teacherOf.get(label);
          if (teacher) page.centered(x + col.w / 2, y + rowH / 2 - 10, teacher, { size: 7.5, color: [0.4, 0.4, 0.45] });
        } else {
          page.centered(x + col.w / 2, y + rowH / 2 - 3, "-", { size: 10, color: [0.6, 0.6, 0.6] });
        }
      }
    }
    if (col.kind === "day") {
      for (let w = 1; w <= 6; w++) {
        const y = bodyTop - w * rowH;
        page.box(x, y, col.w, rowH, { fill: [0.97, 0.97, 0.99] });
        page.centered(x + col.w / 2, y + rowH / 2 - 3, DAY_NAMES[w], { size: 10, bold: true });
      }
    }
    x += col.w;
  }

  const classTeacher = STAFF[plan.createdBy].name;
  page.text(47, 92, `Class teacher: ${classTeacher}`, { size: 10 });
  page.text(47, 76, "Saturday: classes end at 12:20 pm. 2nd and 4th Saturdays are holidays.", { size: 9, color: [0.4, 0.4, 0.45] });
  page.text(640, 92, `Updated ${shortDate(updatedDay)}`, { size: 9, color: [0.4, 0.4, 0.45] });
  return renderPdf([page]);
}

function letterhead(page: PdfPage, ref: string, day: string) {
  page.centered(page.width / 2, 790, SCHOOL_NAME, { size: 20, bold: true, color: ACCENT });
  page.centered(page.width / 2, 772, SCHOOL_ADDRESS, { size: 9, color: [0.4, 0.4, 0.45] });
  page.line(50, 760, page.width - 50, 760, 1.2);
  page.text(50, 738, ref, { size: 10 });
  page.text(page.width - 150, 738, `Date: ${shortDate(day)}`, { size: 10 });
}

function examSchedulePdf(postedDay: string, examDays: string[]) {
  const page = new PdfPage();
  letterhead(page, "Circular No. 19/2026-27", postedDay);
  page.centered(page.width / 2, 700, "TERM 1 EXAMINATIONS - CLASSES 4 AND 5", { size: 14, bold: true });

  const class5 = ["English", "Maths", "Hindi", "Science", "Kannada", "Social Studies"];
  const class4 = ["English", "Maths", "Hindi", "EVS", "Kannada", "Art & Craft"];
  const cols = [
    { label: "Date", w: 130 },
    { label: "Day", w: 110 },
    { label: "Class 4", w: 125 },
    { label: "Class 5", w: 125 },
  ];
  const left = (page.width - cols.reduce((n, c) => n + c.w, 0)) / 2;
  let y = 660;
  let x = left;
  for (const c of cols) {
    page.box(x, y, c.w, 28, { fill: [0.92, 0.92, 0.98] });
    page.centered(x + c.w / 2, y + 10, c.label, { size: 10.5, bold: true });
    x += c.w;
  }
  examDays.forEach((day, i) => {
    y -= 28;
    const cells = [shortDate(day), DAY_NAMES[weekday(day)], class4[i], class5[i]];
    x = left;
    cols.forEach((c, j) => {
      page.box(x, y, c.w, 28);
      page.centered(x + c.w / 2, y + 10, cells[j], { size: 10 });
      x += c.w;
    });
  });

  y -= 40;
  for (const line of [
    "1. Reporting time is 8:30 am. Exams are from 9:00 to 11:00 am; regular classes continue after the exam.",
    "2. Syllabus: all chapters taught up to the end of last month. Teachers have shared chapter lists on Avance.",
    "3. Children must bring their own stationery. Geometry box required for Maths.",
    "4. Results will be shared at the Parent-Teacher Meeting after the exams.",
  ]) {
    y = page.paragraph(60, y, line, { size: 10.5, maxChars: 92 }) - 6;
  }
  page.text(400, 120, STAFF.principal.name, { size: 11, bold: true });
  page.text(400, 104, "Principal", { size: 10 });
  return renderPdf([page]);
}

function sportsDayPdf(postedDay: string, sportsDay: string) {
  const page = new PdfPage();
  letterhead(page, "Circular No. 17/2026-27", postedDay);
  page.centered(page.width / 2, 700, "ANNUAL SPORTS DAY", { size: 15, bold: true });
  let y = 665;
  for (const para of [
    "Dear Parents,",
    `We are happy to announce that our Annual Sports Day will be held on ${longDate(sportsDay)} at the school ground, from 8:00 am to 12:30 pm. Parents are warmly invited.`,
    "Every child takes part in at least one event: sprint, relay, sack race, lemon-and-spoon race or the class drill. House captains will share event lists in class this week.",
    "Children should come in their house T-shirt, white shorts or track pants and white canvas shoes, with a water bottle and a cap. Breakfast will be served to all children.",
    "Please fill in the consent slip below and send it with your child by Friday.",
  ]) {
    y = page.paragraph(60, y, para, { size: 11, maxChars: 88 }) - 10;
  }
  page.text(400, y - 10, STAFF.principal.name, { size: 11, bold: true });
  page.text(400, y - 26, "Principal", { size: 10 });

  y -= 80;
  page.text(60, y, "- - - - - - - - - - - - - - - - - - - - - - - cut here - - - - - - - - - - - - - - - - - - - - - - -", { size: 9, color: [0.5, 0.5, 0.5] });
  y -= 30;
  page.centered(page.width / 2, y, "CONSENT SLIP - SPORTS DAY", { size: 12, bold: true });
  for (const field of ["Name of the child: ______________________________", "Class & Section: ___________   House: ___________", "Event(s): _____________________________________", "Parent's signature: ____________________________"]) {
    y -= 30;
    page.text(70, y, field, { size: 11 });
  }
  return renderPdf([page]);
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

async function ensureBucket() {
  const { error } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!error) return;
  const created = await supabaseAdmin.storage.createBucket(BUCKET, { public: false });
  if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
}

async function uploadPdf(prefix: string, fileName: string, body: Buffer, uploadedAt: Date) {
  const path = `${prefix}/${uploadedAt.getTime()}-${fileName}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, body, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  return path;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function fill(template: string, kind: Kind, topic: string, topicIndex: number) {
  const page = 6 + topicIndex * 11 + int(0, 6);
  return template
    .replaceAll("{t}", topic)
    .replaceAll("{g}", pick(GRAMMAR[kind] ?? [""]))
    .replaceAll("{n}", String(int(1, 6)))
    .replaceAll("{p}", String(page))
    .replaceAll("{p2}", String(page + int(1, 3)));
}

async function main() {
  console.log(`Seeding the school demo (today is ${TODAY} IST)…`);

  // --- Accounts -----------------------------------------------------------
  const staffUsers = {} as Record<StaffKey, { id: string; name: string }>;
  for (const key of Object.keys(STAFF) as StaffKey[]) {
    const s = STAFF[key];
    staffUsers[key] = await ensureUser({ name: s.name, email: s.email, avatarSeed: avatarValue("voxelArt", `school-${key}`) });
  }
  const pendingTeacher = await ensureUser({ ...PENDING_TEACHER, avatarSeed: avatarValue("voxelArt", "school-rohit") });
  const parent = await ensureUser({ ...PARENT, avatarSeed: avatarValue("voxelArt", "school-parent") });
  const families = await ensureUser({ ...FAMILIES, avatarSeed: avatarValue("voxelArt", "school-families") });
  const staffIds = [...Object.values(staffUsers).map((u) => u.id), pendingTeacher.id];

  // --- Clear the previous demo -------------------------------------------
  const oldSchools = await prisma.school.findMany({
    where: { OR: [{ adminId: staffUsers.principal.id }, { staffCode: STAFF_CODE }, { studentCode: STUDENT_CODE }] },
    select: { id: true, classrooms: { select: { timetable: { select: { path: true } } } }, announcements: { select: { attachmentPath: true } } },
  });
  const oldKids = await prisma.kidProfile.findMany({ where: { ownerId: { in: [parent.id, families.id] } }, select: { id: true } });
  const oldFiles = oldSchools.flatMap((s) => [
    ...s.classrooms.map((c) => c.timetable?.path),
    ...s.announcements.map((a) => a.attachmentPath),
  ]).filter((p): p is string => Boolean(p));
  if (oldFiles.length) await supabaseAdmin.storage.from(BUCKET).remove(oldFiles);
  await prisma.seenMarker.deleteMany({
    where: { viewer: { in: [...oldKids.map((k) => `kid:${k.id}`), ...staffIds.map((id) => `user:${id}`), `user:${parent.id}`] } },
  });
  await prisma.kidProfile.deleteMany({ where: { ownerId: { in: [parent.id, families.id] } } });
  await prisma.school.deleteMany({ where: { id: { in: oldSchools.map((s) => s.id) } } });
  await prisma.schoolStaff.deleteMany({ where: { userId: { in: staffIds } } });

  // --- School & staff ------------------------------------------------------
  const schoolId = randomUUID();
  await prisma.school.create({
    data: {
      id: schoolId,
      name: SCHOOL_NAME,
      staffCode: STAFF_CODE,
      studentCode: STUDENT_CODE,
      adminId: staffUsers.principal.id,
      createdAt: istAt(addDays(START, -6), 11),
    },
  });
  const staffOrder: StaffKey[] = ["principal", "ananya", "suresh", "prakash", "shwetha", "farah"];
  await prisma.schoolStaff.createMany({
    data: [
      ...staffOrder.map((key, i) => ({
        schoolId,
        userId: staffUsers[key].id,
        status: "APPROVED",
        canAnnounce: key === "principal" || key === "ananya",
        createdAt: istAt(addDays(START, -6 + Math.min(i, 2)), 11 + i),
      })),
      // A new teacher waiting for the principal's approval.
      { schoolId, userId: pendingTeacher.id, status: "PENDING", createdAt: istAt(addDays(TODAY, -1), 18.5) },
    ],
  });

  // --- Classrooms, subjects, timetables -----------------------------------
  await ensureBucket();
  type BuiltSubject = SubjectPlan & { id: string; classroomId: string };
  type BuiltClass = { plan: ClassPlan; id: string; grid: Grid; subjects: BuiltSubject[] };
  const classes: BuiltClass[] = [];
  for (const plan of CLASSES) {
    const id = randomUUID();
    const grid = buildTimetable(plan);
    const subjects = plan.subjects.map((s) => ({ ...s, id: randomUUID(), classroomId: id }));
    classes.push({ plan, id, grid, subjects });

    const teacherKeys = [...new Set([plan.createdBy, ...plan.subjects.map((s) => s.teacher)])];
    await prisma.classroom.create({
      data: {
        id,
        schoolId,
        name: plan.name,
        joinCode: plan.joinCode,
        createdById: staffUsers[plan.createdBy].id,
        createdAt: istAt(addDays(START, -5), 12),
        teachers: { create: teacherKeys.map((key) => ({ userId: staffUsers[key].id })) },
        subjects: {
          create: subjects.map((s) => ({
            id: s.id,
            name: s.name,
            ownerId: staffUsers[s.teacher].id,
            createdAt: istAt(addDays(START, -4), 15),
          })),
        },
      },
    });

    const uploadedDay = addDays(START, -4);
    const uploadedAt = istAt(uploadedDay, 16.5);
    const fileName = `Timetable_${plan.name}_2026-27.pdf`;
    const path = await uploadPdf(`timetables/${id}`, fileName, timetablePdf(plan, grid, uploadedDay), uploadedAt);
    await prisma.timetable.create({ data: { classroomId: id, path, fileName, uploadedAt } });
  }
  const classByName = new Map(classes.map((c) => [c.plan.name, c]));
  const subjectIn = (className: string, subjectName: string) =>
    classByName.get(className)!.subjects.find((s) => s.name === subjectName)!;

  // --- Homework & daily notes ---------------------------------------------
  type BuiltHomework = { id: string; subjectId: string; classroomId: string; kind: Kind; day: string; dueDay: string; createdAt: Date; dueDate: Date; xp: number };
  const homework: BuiltHomework[] = [];
  const homeworkRows: { id: string; subjectId: string; title: string; description: string; dueDate: Date; xp: number; createdAt: Date }[] = [];
  const noteRows: { subjectId: string; day: string; body: string; updatedAt: Date }[] = [];

  for (const c of classes) {
    const templateIndex = new Map(c.subjects.map((s) => [s.id, int(0, 5)]));
    SCHOOL_DAYS.forEach((day, dayIndex) => {
      const taught = c.subjects.filter((s) => c.grid[weekday(day)].includes(s.name));
      const topicOf = (s: SubjectPlan) => {
        const index = Math.min(s.topics.length - 1, Math.floor((dayIndex / SCHOOL_DAYS.length) * s.topics.length));
        return { topic: s.topics[index], index };
      };

      for (const s of taught) {
        // Ms. Rao leaves today's notes empty so she can write them live in the demo.
        if ((day === TODAY && s.teacher === "ananya") || !chance(0.88)) continue;
        const updatedAt = clampToNow(istAt(day, between(12.5, 16.5)));
        const { topic, index } = topicOf(s);
        if (updatedAt) noteRows.push({ subjectId: s.id, day, body: fill(pick(NOTES[s.kind]), s.kind, topic, index), updatedAt });
      }

      // Teachers set a little extra before a weekend or holiday: at least one
      // homework per day until the next school day, plus one.
      const withHomework = taught.filter((s) => chance(s.hwChance));
      const daysOff = Math.round((Date.parse(nextSchoolDay(day)) - Date.parse(day)) / DAY_MS) - 1;
      for (const s of shuffle(taught.filter((t) => !withHomework.includes(t)))) {
        if (daysOff === 0 || withHomework.length >= daysOff + 1) break;
        withHomework.push(s);
      }

      for (const s of withHomework) {
        const createdAt = clampToNow(istAt(day, between(10.5, 15.5)));
        if (!createdAt) continue;
        const templates = HOMEWORK[s.kind];
        const n = templateIndex.get(s.id)!;
        templateIndex.set(s.id, n + 1);
        const { topic, index } = topicOf(s);
        const dueDay = nextSchoolDay(day, chance(0.12) ? 2 : 1);
        const row = {
          id: randomUUID(),
          subjectId: s.id,
          title: fill(templates[n % templates.length], s.kind, topic, index),
          description: chance(0.35) ? pick(HOMEWORK_DETAILS) : "",
          dueDate: istDayEnd(dueDay),
          xp: pick([1, 1, 2, 2, 3]),
          createdAt,
        };
        homeworkRows.push(row);
        homework.push({ id: row.id, subjectId: s.id, classroomId: c.id, kind: s.kind, day, dueDay, createdAt, dueDate: row.dueDate, xp: row.xp });
      }
    });
  }
  await prisma.homework.createMany({ data: homeworkRows });
  await prisma.teachingNote.createMany({ data: noteRows });

  // --- Kids -----------------------------------------------------------------
  type Kid = { id: string; name: string; classroomId: string; diligence: number; special?: "aarav" | "diya" };
  const names = shuffle(FIRST_NAMES.map((first) => `${first} ${pick(LAST_NAMES)}`));
  const kids: Kid[] = [];
  type KidRow = {
    id: string;
    ownerId: string;
    name: string;
    avatarSeed: string;
    schoolId: string;
    classroomId: string;
    classroomStatus: string;
    createdAt: Date;
    xp?: number;
  };
  const kidRows: KidRow[] = [];
  // Most kids keep up, some slip, a few clearly need help.
  const diligence = () => (chance(0.55) ? between(0.85, 0.97) : chance(0.65) ? between(0.66, 0.85) : between(0.35, 0.55));

  for (const c of classes) {
    for (let i = 0; i < c.plan.kidCount; i++) {
      const special = c.plan.name === "5-A" && i === 0 ? "aarav" : c.plan.name === "4-A" && i === 0 ? "diya" : undefined;
      const name = special === "aarav" ? "Aarav Sharma" : special === "diya" ? "Diya Sharma" : names.pop()!;
      const kid: Kid = { id: randomUUID(), name, classroomId: c.id, diligence: special === "aarav" ? 0.95 : special === "diya" ? 0.86 : diligence(), special };
      kids.push(kid);
      kidRows.push({
        id: kid.id,
        ownerId: special ? parent.id : families.id,
        name,
        avatarSeed: avatarValue("voxelArt", `kid-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`),
        schoolId,
        classroomId: c.id,
        classroomStatus: "APPROVED",
        // The parent added Aarav first, then Diya, so the student picker lists them in that order.
        createdAt: special === "aarav" ? istAt(addDays(START, -4), 19) : special === "diya" ? istAt(addDays(START, -4), 19.2) : istAt(addDays(START, -int(1, 3)), between(17, 21.5)),
      });
    }
  }
  // A new admission waiting for Ms. Rao to approve her into 5-A.
  kidRows.push({
    id: randomUUID(),
    ownerId: families.id,
    name: "Meera Pillai",
    avatarSeed: avatarValue("voxelArt", "kid-meera-pillai"),
    schoolId,
    classroomId: classByName.get("5-A")!.id,
    classroomStatus: "PENDING",
    createdAt: istAt(addDays(TODAY, -1), 19.5),
  });

  // --- Completions ---------------------------------------------------------
  type Completion = { homeworkId: string; kidId: string; completedAt: Date; late: boolean };
  const completions: Completion[] = [];
  const homeworkXp = new Map(homework.map((h) => [h.id, h.xp]));
  const homeworkByClass = new Map<string, BuiltHomework[]>();
  for (const h of homework) homeworkByClass.set(h.classroomId, [...(homeworkByClass.get(h.classroomId) ?? []), h]);

  function genericCompletion(kid: Kid, h: BuiltHomework): Date | null {
    const r = rand();
    if (r < kid.diligence) {
      // On time: usually that evening, sometimes the next evening or early
      // on the morning it's due.
      let day = chance(0.7) ? h.day : addDays(h.day, 1);
      if (day > h.dueDay) day = h.dueDay;
      const morning = day === h.dueDay && day !== h.day && chance(0.5);
      return istAt(day, morning ? between(6.5, 7.75) : between(16.5, 21.5));
    }
    if (r < kid.diligence + (1 - kid.diligence) * 0.45) {
      return istAt(addDays(h.dueDay, int(1, 3)), between(16.5, 21));
    }
    return null;
  }

  // Aarav (the demo student): diligent, finishes homework the evening it's
  // given, was off sick for two days about three weeks ago (caught up the
  // day after), and has an unbroken streak since. One Kannada homework from
  // last week is still pending, and nothing is ticked yet today — so the
  // demo can tick homework live and watch XP, streak and rank move.
  // A Tuesday and Wednesday, so the absence doesn't run into a weekend.
  const sickIndex = Math.max(1, SCHOOL_DAYS.findIndex((d) => d >= addDays(TODAY, -21) && weekday(d) === 2));
  const sickDays = new Set([SCHOOL_DAYS[sickIndex], SCHOOL_DAYS[sickIndex + 1]]);
  const recoveryDay = SCHOOL_DAYS[sickIndex + 2];
  const fiveA = classByName.get("5-A")!;
  const kannada5A = subjectIn("5-A", "Kannada").id;
  const skipped = homework.find(
    (h) => h.subjectId === kannada5A && h.dueDay >= addDays(TODAY, -7) && h.dueDay <= addDays(TODAY, -3)
  );

  function aaravCompletion(h: BuiltHomework): Date | null {
    if (h.id === skipped?.id || h.day === TODAY) return null;
    const day = sickDays.has(h.day) ? recoveryDay : h.day;
    return istAt(day, between(18, 20.5));
  }

  for (const kid of kids) {
    const mine: Completion[] = [];
    for (const h of homeworkByClass.get(kid.classroomId) ?? []) {
      let at = kid.special === "aarav" ? aaravCompletion(h) : genericCompletion(kid, h);
      // Diya's parent keeps her mostly caught up: anything she missed more
      // than a week ago got done late rather than left hanging.
      if (!at && kid.special === "diya" && h.dueDay < addDays(TODAY, -6)) {
        at = istAt(addDays(h.dueDay, int(1, 2)), between(17, 20));
      }
      if (!at || !happened(at)) continue;
      if (at < h.createdAt) at = new Date(h.createdAt.getTime() + 2 * 3_600_000);
      if (!happened(at)) continue;
      mine.push({ homeworkId: h.id, kidId: kid.id, completedAt: at, late: at > h.dueDate });
    }

    if (kid.special === "aarav") {
      // Fill the streak: every day from his recovery to yesterday (Sundays and
      // off-Saturdays included) needs at least one completion, so move a
      // weekend-spanning homework onto any empty day.
      const byDay = new Map<string, Completion[]>();
      for (const c of mine) {
        const d = istDay(c.completedAt);
        byDay.set(d, [...(byDay.get(d) ?? []), c]);
      }
      const hw = new Map(homework.map((h) => [h.id, h]));
      for (let day = recoveryDay; day < TODAY; day = addDays(day, 1)) {
        if (byDay.get(day)?.length) continue;
        const candidate = mine.find((c) => {
          const h = hw.get(c.homeworkId)!;
          return h.day <= day && day <= h.dueDay && (byDay.get(istDay(c.completedAt))?.length ?? 0) >= 2;
        });
        if (!candidate) continue;
        const from = istDay(candidate.completedAt);
        byDay.set(from, byDay.get(from)!.filter((c) => c !== candidate));
        candidate.completedAt = istAt(day, between(17, 20)); // evening: always after the homework was posted
        candidate.late = candidate.completedAt > hw.get(candidate.homeworkId)!.dueDate;
        byDay.set(day, [candidate]);
      }
    }

    completions.push(...mine);
    const row = kidRows.find((r) => r.id === kid.id)!;
    row.xp = mine.reduce((n, c) => n + homeworkXp.get(c.homeworkId)!, 0);
  }

  await prisma.kidProfile.createMany({ data: kidRows });
  for (let i = 0; i < completions.length; i += 1000) {
    await prisma.homeworkCompletion.createMany({ data: completions.slice(i, i + 1000) });
  }

  // --- Announcements ------------------------------------------------------
  const ptmDay = nearestSchoolDay(addDays(TODAY, -34), 6);
  const unitTestDay = nearestSchoolDay(addDays(TODAY, -36), 3);
  const examStart = nearestSchoolDay(addDays(TODAY, 10), 1);
  const examDays = [examStart];
  while (examDays.length < 6) examDays.push(nextSchoolDay(examDays[examDays.length - 1]));
  const sportsDay = nearestSchoolDay(addDays(TODAY, 15), 6);
  const exhibitionDay = nearestSchoolDay(addDays(TODAY, 4), 5);
  const photoDay = nearestSchoolDay(addDays(TODAY, 1), 1);

  type AnnouncementPlan = {
    day: string;
    hour: number;
    author: StaffKey;
    body: string;
    classroom?: string;
    subject?: string;
    attachment?: { name: string; pdf: () => Buffer };
  };
  const announcements: AnnouncementPlan[] = [
    { day: addDays(START, -1), hour: 17, author: "principal", body: `Dear parents, from Monday ${SCHOOL_NAME} moves homework, class notes and circulars to Avance instead of WhatsApp groups. Please add your child using the student code shared in the diary. Tick homework with your child each evening — teachers can see who needs help.` },
    { day: addDays(START, 1), hour: 8, classroom: "5-A", author: "ananya", body: "Welcome to Class 5-A on Avance! Homework for every subject will appear in your list. Please tick it only after your child has actually finished it. 🙂" },
    { day: addDays(START, 1), hour: 8.5, classroom: "4-A", author: "prakash", body: "Welcome to Class 4-A! Homework and what we covered in class will be posted here every day." },
    { day: addDays(START, 1), hour: 9, classroom: "5-B", author: "suresh", body: "Hello 5-B families! All homework will be posted here from today." },
    { day: addDays(START, 9), hour: 13, author: "principal", body: "Library: from this week every child can borrow one book a week. Library period is on the timetable — please help your child return books on time." },
    { day: addDays(unitTestDay, -7), hour: 14, classroom: "5-A", subject: "Maths", author: "ananya", body: `Maths Unit Test 1 on ${longDate(unitTestDay)}. Portion: The Fish Tale and Shapes and Angles. Practise the textbook exercises — no new questions!` },
    { day: addDays(ptmDay, -6), hour: 12, author: "principal", body: `Parent-Teacher Meeting on ${longDate(ptmDay)}, 9:30 am to 12:30 pm. Unit Test 1 answer sheets will be shown. Please meet the class teacher first.` },
    { day: addDays(ptmDay, 2), hour: 16, classroom: "5-A", author: "ananya", body: "Thank you for coming to the PTM! 5-A's homework completion this month was the best in the school. Let's keep it up. 💪" },
    { day: addDays(TODAY, -27), hour: 15, classroom: "5-A", subject: "English", author: "suresh", body: "Reading challenge: finish one library book by the end of the month and write 5 lines about it in the English notebook." },
    { day: addDays(TODAY, -24), hour: 9, author: "principal", body: "Reminder: school uniform on Mondays and Wednesdays, house T-shirt on Fridays." },
    { day: addDays(TODAY, -19), hour: 15, classroom: "5-A", subject: "Hindi", author: "farah", body: "हिंदी कविता पाठ प्रतियोगिता अगले हफ़्ते। जो बच्चे भाग लेना चाहते हैं, शुक्रवार तक नाम दें।" },
    { day: addDays(TODAY, -17), hour: 15, classroom: "4-A", subject: "EVS", author: "shwetha", body: "EVS: please send one empty plastic bottle with your child on Monday for our water-saving activity." },
    {
      day: addDays(TODAY, -15), hour: 11, author: "principal",
      body: `Annual Sports Day on ${longDate(sportsDay)}! Circular attached — please send the consent slip by Friday.`,
      attachment: { name: "Sports_Day_Circular.pdf", pdf: () => sportsDayPdf(addDays(TODAY, -15), sportsDay) },
    },
    { day: addDays(TODAY, -12), hour: 14, classroom: "5-A", subject: "Science", author: "ananya", body: `Science exhibition: groups of 3, topics shared in class. Models are due on ${longDate(exhibitionDay)}. Use waste material — no need to buy anything!` },
    { day: addDays(TODAY, -9), hour: 15, classroom: "5-B", subject: "Maths", author: "ananya", body: "5-B: tables up to 16 by next week please — we'll have a fun tables quiz." },
    {
      day: addDays(TODAY, -6), hour: 12, author: "principal",
      body: `Term 1 exams begin on ${longDate(examStart)}. The schedule is attached. Regular classes continue after each exam.`,
      attachment: { name: "Term1_Exam_Schedule.pdf", pdf: () => examSchedulePdf(addDays(TODAY, -6), examDays) },
    },
    { day: addDays(TODAY, -3), hour: 10, author: "principal", body: "The water purifier on the 2nd floor is being repaired this week — please send a full water bottle with your child." },
    { day: addDays(TODAY, -2), hour: 15.5, classroom: "5-A", author: "ananya", body: `Class photo on ${longDate(photoDay)} — full uniform, hair neatly tied, please.` },
    { day: TODAY, hour: 8.25, author: "principal", body: "Good morning! Buses will run 10 minutes late this evening because of road work near the school gate. Thank you for your patience." },
  ];

  const announcementRows = [];
  for (const a of announcements) {
    const createdAt = istAt(a.day, a.hour);
    if (!happened(createdAt)) continue;
    const classroom = a.classroom ? classByName.get(a.classroom)! : null;
    let attachmentPath: string | null = null;
    if (a.attachment) attachmentPath = await uploadPdf(`announcements/${schoolId}`, a.attachment.name, a.attachment.pdf(), createdAt);
    announcementRows.push({
      schoolId,
      classroomId: classroom?.id ?? null,
      subjectId: a.subject && a.classroom ? subjectIn(a.classroom, a.subject).id : null,
      authorId: staffUsers[a.author].id,
      body: a.body,
      attachmentPath,
      attachmentName: a.attachment?.name ?? null,
      createdAt,
    });
  }
  await prisma.announcement.createMany({ data: announcementRows });

  // --- "New" dots: the Sharma kids last opened the app yesterday evening,
  // so today's homework, notes and announcements show up as new.
  const seenAt = istAt(addDays(TODAY, -1), 20.5);
  const seenRows = kids
    .filter((k) => k.special)
    .flatMap((k) => [
      { viewer: `kid:${k.id}`, section: "announcements", seenAt },
      ...classes.find((c) => c.id === k.classroomId)!.subjects.map((s) => ({ viewer: `kid:${k.id}`, section: `subject:${s.id}`, seenAt })),
    ]);
  await prisma.seenMarker.createMany({ data: seenRows });

  // --- Summary --------------------------------------------------------------
  const aarav = kids.find((k) => k.special === "aarav")!;
  const aaravDone = completions.filter((c) => c.kidId === aarav.id).length;
  const aaravXp = kidRows.find((r) => r.id === aarav.id)?.xp ?? 0;
  const fiveAHomework = homework.filter((h) => h.classroomId === fiveA.id).length;
  console.log(`\n${SCHOOL_NAME}: ${classes.length} classrooms, ${kids.length} students, ${homework.length} homework,`);
  console.log(`${completions.length} completions, ${noteRows.length} class notes, ${announcementRows.length} announcements.`);
  console.log(`Aarav: ${aaravDone}/${fiveAHomework} homework done in 5-A, ${aaravXp} XP.`);
  console.log("Next: npm run db:seed:voyage (Voyage heroes for the demo kids), npm run db:seed:elixir.");
  console.log(`\nDemo logins (password: ${DEMO_PASSWORD}):`);
  console.log(`  Student side : ${PARENT.email}   → Profiles → School → Student → Aarav (5-A) or Diya (4-A)`);
  console.log(`  Teacher      : ${STAFF.ananya.email}  → Profiles → School → Staff (Ms. Ananya Rao, 5-A class teacher)`);
  console.log(`  School admin : ${STAFF.principal.email} → Profiles → School → Staff → School admin`);
  console.log(`  Pending staff: ${PENDING_TEACHER.email}`);
  console.log(`  Codes: staff ${STAFF_CODE}, students ${STUDENT_CODE}, classrooms ${CLASSES.map((c) => `${c.name} ${c.joinCode}`).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import "server-only";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { requireUser, ForbiddenError } from "@/lib/permissions";

// ---------------------------------------------------------------------------
// Time — the school section runs on IST (fixed +05:30, no DST) for every
// "today"/"this month" boundary.
// ---------------------------------------------------------------------------

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" of the IST calendar day containing `d`. */
export function istDay(d: Date = new Date()): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function istDayStart(day: string): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) - IST_OFFSET_MS);
}

export function istDayEnd(day: string): Date {
  return new Date(istDayStart(day).getTime() + DAY_MS - 1);
}

export function istMonthStart(d: Date = new Date()): Date {
  return istDayStart(`${istDay(d).slice(0, 7)}-01`);
}

/** The last `n` IST days, oldest first, ending today. */
export function lastIstDays(n: number): string[] {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => istDay(new Date(now - (n - 1 - i) * DAY_MS)));
}

export function previousIstDay(day: string): string {
  return istDay(new Date(istDayStart(day).getTime() - 1));
}

// ---------------------------------------------------------------------------
// XP & levels — reaching level L takes 25·L·(L−1) XP: L2 at 50, L3 at 150,
// L4 at 300… (each level needs 50 more than the last).
// ---------------------------------------------------------------------------

export const HOMEWORK_XP = 10;

function xpForLevel(level: number) {
  return 25 * level * (level - 1);
}

export function levelInfo(xp: number) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - floor, span: next - floor, toNext: next - xp };
}

// ---------------------------------------------------------------------------
// Access guards. Pages use the redirecting/notFound variants; actions use
// the throwing ones.
// ---------------------------------------------------------------------------

export async function pageKid(kidId: string) {
  const user = await requireSessionUser();
  const kid = await prisma.kidProfile.findFirst({
    where: { id: kidId, ownerId: user.id },
    include: { school: true, classroom: true },
  });
  if (!kid) notFound();
  const inClass = kid.classroomStatus === "APPROVED" && kid.classroom ? kid.classroom : null;
  return { user, kid, classroom: inClass };
}

export async function actionKid(kidId: string) {
  const user = await requireUser();
  const kid = await prisma.kidProfile.findFirst({ where: { id: kidId, ownerId: user.id } });
  if (!kid) throw new ForbiddenError("Kid profile not found.");
  return { user, kid };
}

async function loadStaff(userId: string) {
  return prisma.schoolStaff.findUnique({ where: { userId }, include: { school: true } });
}

/** Approved staff for a page; anyone else goes back to the staff landing. */
export async function pageStaff() {
  const user = await requireSessionUser();
  const staff = await loadStaff(user.id);
  if (!staff || staff.status !== "APPROVED") redirect("/school/staff");
  return { user, staff, school: staff.school, isAdmin: staff.school.adminId === user.id };
}

export async function actionStaff() {
  const user = await requireUser();
  const staff = await loadStaff(user.id);
  if (!staff || staff.status !== "APPROVED") throw new ForbiddenError("You are not approved staff.");
  return { user, staff, school: staff.school, isAdmin: staff.school.adminId === user.id };
}

export async function actionAdmin() {
  const ctx = await actionStaff();
  if (!ctx.isAdmin) throw new ForbiddenError("Only the school admin can do that.");
  return ctx;
}

export async function isClassroomTeacher(userId: string, classroomId: string) {
  const row = await prisma.classroomTeacher.findUnique({
    where: { classroomId_userId: { classroomId, userId } },
  });
  return Boolean(row);
}

/** The classroom, if it's in the teacher's school and she has joined it. */
export async function teacherClassroom(userId: string, schoolId: string, classroomId: string) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom || classroom.schoolId !== schoolId) return null;
  return (await isClassroomTeacher(userId, classroomId)) ? classroom : null;
}

export async function actionClassroom(classroomId: string) {
  const ctx = await actionStaff();
  const classroom = await teacherClassroom(ctx.user.id, ctx.school.id, classroomId);
  if (!classroom) throw new ForbiddenError("You haven't joined this classroom.");
  return { ...ctx, classroom };
}

export async function actionSubject(subjectId: string) {
  const ctx = await actionStaff();
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, include: { classroom: true } });
  if (!subject || subject.ownerId !== ctx.user.id || subject.classroom.schoolId !== ctx.school.id) {
    throw new ForbiddenError("This isn't your subject.");
  }
  return { ...ctx, subject };
}

// ---------------------------------------------------------------------------
// "New" dots — last-seen time per (viewer, section).
// ---------------------------------------------------------------------------

export const kidViewer = (kidId: string) => `kid:${kidId}`;
export const userViewer = (userId: string) => `user:${userId}`;

export async function getSeen(viewer: string, sections: string[]) {
  const rows = await prisma.seenMarker.findMany({ where: { viewer, section: { in: sections } } });
  return new Map(rows.map((r) => [r.section, r.seenAt]));
}

/** Marks a section seen now; returns when it was previously seen (epoch if never). */
export async function touchSeen(viewer: string, section: string): Promise<Date> {
  const prev = await prisma.seenMarker.findUnique({ where: { viewer_section: { viewer, section } } });
  await prisma.seenMarker.upsert({
    where: { viewer_section: { viewer, section } },
    create: { viewer, section },
    update: { seenAt: new Date() },
  });
  return prev?.seenAt ?? new Date(0);
}

// ---------------------------------------------------------------------------
// Announcements visible in a school (+ optionally one classroom).
// ---------------------------------------------------------------------------

export async function visibleAnnouncements(schoolId: string, classroomId: string | null, take = 30) {
  return prisma.announcement.findMany({
    where: {
      schoolId,
      OR: [{ classroomId: null }, ...(classroomId ? [{ classroomId }] : [])],
    },
    include: {
      author: { select: { name: true } },
      subject: { select: { name: true } },
      classroom: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

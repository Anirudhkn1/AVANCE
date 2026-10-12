"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/codes";
import { randomAvatarValue } from "@/lib/avatar";
import { requireUser, AuthError, ForbiddenError } from "@/lib/permissions";
import { characterById, isUnlocked } from "@/lib/voyage";
import {
  actionAdmin,
  actionClassroom,
  actionKid,
  actionStaff,
  actionSubject,
  istDay,
  istDayEnd,
} from "@/lib/school";
import { checkSchoolFile, removeSchoolFiles, uploadSchoolFile } from "@/lib/school-storage";

type FormResult = string | undefined;

/** Turns permission failures into a form error message instead of a crash. */
async function guarded(fn: () => Promise<FormResult | void>): Promise<FormResult> {
  try {
    return (await fn()) ?? undefined;
  } catch (e) {
    if (e instanceof AuthError || e instanceof ForbiddenError) return e.message;
    throw e;
  }
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const name = z.string().trim().min(1, "Please enter a name.").max(60);

async function uniqueCode(exists: (code: string) => unknown) {
  let code = randomCode();
  while (await exists(code)) code = randomCode();
  return code;
}

function revalidateSchool() {
  revalidatePath("/school", "layout");
}

// ---------------------------------------------------------------------------
// Kid profiles (owned by the signed-in parent)
// ---------------------------------------------------------------------------

export async function createKidAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }
  const parsed = name.safeParse(fd.get("name"));
  if (!parsed.success) return parsed.error.issues[0]?.message;
  const avatar = str(fd, "avatarSeed");
  const kid = await prisma.kidProfile.create({
    data: {
      ownerId: user.id,
      name: parsed.data,
      avatarSeed: /^[a-zA-Z]+\|[a-z0-9]+$/.test(avatar) ? avatar : randomAvatarValue(),
    },
  });
  redirect(`/school/kid/${kid.id}`);
}

export async function kidJoinSchoolAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return guarded(async () => {
    const { kid } = await actionKid(str(fd, "kidId"));
    const school = await prisma.school.findUnique({ where: { studentCode: str(fd, "code").toUpperCase() } });
    if (!school) return "No school found with that student code.";
    await prisma.kidProfile.update({
      where: { id: kid.id },
      data: { schoolId: school.id, classroomId: null, classroomStatus: null },
    });
    revalidateSchool();
  });
}

export async function kidJoinClassroomAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return guarded(async () => {
    const { kid } = await actionKid(str(fd, "kidId"));
    if (!kid.schoolId) return "Join a school first.";
    if (kid.classroomId) return "Already in a classroom.";
    const classroom = await prisma.classroom.findUnique({ where: { joinCode: str(fd, "code").toUpperCase() } });
    if (!classroom || classroom.schoolId !== kid.schoolId) return "No classroom in this school has that code.";
    await prisma.kidProfile.update({
      where: { id: kid.id },
      data: { classroomId: classroom.id, classroomStatus: "PENDING" },
    });
    revalidateSchool();
  });
}

/** Marks homework done (+its XP), or undoes it if it was marked done today (IST). */
export async function toggleHomeworkAction(kidId: string, homeworkId: string) {
  const { kid } = await actionKid(kidId);
  const homework = await prisma.homework.findUnique({ where: { id: homeworkId }, include: { subject: true } });
  if (!homework || kid.classroomStatus !== "APPROVED" || homework.subject.classroomId !== kid.classroomId) {
    throw new ForbiddenError("This homework isn't in your classroom.");
  }
  const existing = await prisma.homeworkCompletion.findUnique({
    where: { homeworkId_kidId: { homeworkId, kidId } },
  });
  if (existing) {
    if (istDay(existing.completedAt) !== istDay()) return; // locked after midnight
    await prisma.$transaction([
      prisma.homeworkCompletion.delete({ where: { id: existing.id } }),
      prisma.kidProfile.update({ where: { id: kidId }, data: { xp: { decrement: homework.xp } } }),
    ]);
  } else {
    const now = new Date();
    try {
      await prisma.$transaction([
        prisma.homeworkCompletion.create({ data: { homeworkId, kidId, completedAt: now, late: now > homework.dueDate } }),
        prisma.kidProfile.update({ where: { id: kidId }, data: { xp: { increment: homework.xp } } }),
      ]);
    } catch (e) {
      // A double tap already recorded it — the unique constraint rolled this one back, XP included.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  revalidateSchool();
}

/** Wears an unlocked Voyage hero as the kid's profile picture (null = back to the avatar). */
export async function setCharacterAction(kidId: string, characterId: string | null) {
  const { kid } = await actionKid(kidId);
  if (characterId !== null) {
    const character = characterById(characterId);
    if (!character || !isUnlocked(character, kid.xp)) throw new ForbiddenError("That hero hasn't joined your crew yet.");
  }
  await prisma.kidProfile.update({ where: { id: kid.id }, data: { characterId } });
  revalidateSchool();
}

// ---------------------------------------------------------------------------
// Schools & staff
// ---------------------------------------------------------------------------

export async function createSchoolAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const user = await requireUser().catch(() => redirect("/login"));
  const parsed = z.string().trim().min(2, "School name is too short.").max(80).safeParse(fd.get("name"));
  if (!parsed.success) return parsed.error.issues[0]?.message;
  if (await prisma.schoolStaff.findUnique({ where: { userId: user.id } })) return "You already belong to a school.";

  const staffCode = await uniqueCode((c) => prisma.school.findFirst({ where: { OR: [{ staffCode: c }, { studentCode: c }] } }));
  const studentCode = await uniqueCode((c) =>
    c === staffCode ? true : prisma.school.findFirst({ where: { OR: [{ staffCode: c }, { studentCode: c }] } })
  );
  await prisma.school.create({
    data: {
      name: parsed.data,
      staffCode,
      studentCode,
      adminId: user.id,
      staff: { create: { userId: user.id, status: "APPROVED", canAnnounce: true } },
    },
  });
  redirect("/school/staff");
}

export async function joinSchoolAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const user = await requireUser().catch(() => redirect("/login"));
  if (await prisma.schoolStaff.findUnique({ where: { userId: user.id } })) return "You already belong to a school.";
  const school = await prisma.school.findUnique({ where: { staffCode: str(fd, "code").toUpperCase() } });
  if (!school) return "No school found with that staff code.";
  await prisma.schoolStaff.create({ data: { schoolId: school.id, userId: user.id } });
  revalidateSchool();
}

export async function cancelStaffRequestAction() {
  const user = await requireUser();
  await prisma.schoolStaff.deleteMany({ where: { userId: user.id, status: "PENDING" } });
  revalidateSchool();
}

export async function reviewStaffAction(staffId: string, approve: boolean) {
  const { school } = await actionAdmin();
  const row = await prisma.schoolStaff.findUnique({ where: { id: staffId } });
  if (!row || row.schoolId !== school.id || row.status !== "PENDING") return;
  if (approve) await prisma.schoolStaff.update({ where: { id: staffId }, data: { status: "APPROVED" } });
  else await prisma.schoolStaff.delete({ where: { id: staffId } });
  revalidateSchool();
}

export async function setAnnouncerAction(staffId: string, canAnnounce: boolean) {
  const { school } = await actionAdmin();
  const row = await prisma.schoolStaff.findUnique({ where: { id: staffId } });
  if (!row || row.schoolId !== school.id || row.userId === school.adminId) return;
  await prisma.schoolStaff.update({ where: { id: staffId }, data: { canAnnounce } });
  revalidateSchool();
}

export async function removeStaffAction(staffId: string) {
  const { school } = await actionAdmin();
  const row = await prisma.schoolStaff.findUnique({ where: { id: staffId } });
  if (!row || row.schoolId !== school.id || row.userId === school.adminId) return;
  await prisma.$transaction([
    prisma.subject.updateMany({ where: { ownerId: row.userId, classroom: { schoolId: school.id } }, data: { ownerId: null } }),
    prisma.classroomTeacher.deleteMany({ where: { userId: row.userId, classroom: { schoolId: school.id } } }),
    prisma.schoolStaff.delete({ where: { id: staffId } }),
  ]);
  revalidateSchool();
}

export async function regenerateCodeAction(kind: "staff" | "student") {
  const { school } = await actionAdmin();
  const code = await uniqueCode((c) => prisma.school.findFirst({ where: { OR: [{ staffCode: c }, { studentCode: c }] } }));
  await prisma.school.update({
    where: { id: school.id },
    data: kind === "staff" ? { staffCode: code } : { studentCode: code },
  });
  revalidateSchool();
}

// ---------------------------------------------------------------------------
// Classrooms
// ---------------------------------------------------------------------------

export async function createClassroomAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  let classroomId = "";
  const err = await guarded(async () => {
    const { user, school } = await actionStaff();
    const parsed = name.safeParse(fd.get("name"));
    if (!parsed.success) return parsed.error.issues[0]?.message;
    const existing = await prisma.classroom.findUnique({ where: { schoolId_name: { schoolId: school.id, name: parsed.data } } });
    if (existing) return `${parsed.data} already exists — join it from the list instead.`;
    const joinCode = await uniqueCode((c) => prisma.classroom.findUnique({ where: { joinCode: c } }));
    const classroom = await prisma.classroom.create({
      data: { schoolId: school.id, name: parsed.data, joinCode, createdById: user.id, teachers: { create: { userId: user.id } } },
    });
    classroomId = classroom.id;
  });
  if (err) return err;
  redirect(`/school/staff/classrooms/${classroomId}`);
}

export async function joinClassroomAction(classroomId: string) {
  const { user, school } = await actionStaff();
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom || classroom.schoolId !== school.id) return;
  await prisma.classroomTeacher.upsert({
    where: { classroomId_userId: { classroomId, userId: user.id } },
    create: { classroomId, userId: user.id },
    update: {},
  });
  redirect(`/school/staff/classrooms/${classroomId}`);
}

export async function leaveClassroomAction(classroomId: string) {
  const { user } = await actionClassroom(classroomId);
  await prisma.$transaction([
    prisma.subject.updateMany({ where: { classroomId, ownerId: user.id }, data: { ownerId: null } }),
    prisma.classroomTeacher.delete({ where: { classroomId_userId: { classroomId, userId: user.id } } }),
  ]);
  redirect("/school/staff?all=1");
}

async function actionClassroomManager(classroomId: string) {
  const ctx = await actionStaff();
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom || classroom.schoolId !== ctx.school.id || (classroom.createdById !== ctx.user.id && !ctx.isAdmin)) {
    throw new ForbiddenError("Only the classroom's creator or the admin can do that.");
  }
  return { ...ctx, classroom };
}

export async function renameClassroomAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return guarded(async () => {
    const { classroom, school } = await actionClassroomManager(str(fd, "classroomId"));
    const parsed = name.safeParse(fd.get("name"));
    if (!parsed.success) return parsed.error.issues[0]?.message;
    if (parsed.data === classroom.name) return;
    const clash = await prisma.classroom.findUnique({ where: { schoolId_name: { schoolId: school.id, name: parsed.data } } });
    if (clash) return `${parsed.data} already exists.`;
    await prisma.classroom.update({ where: { id: classroom.id }, data: { name: parsed.data } });
    revalidateSchool();
  });
}

export async function deleteClassroomAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const err = await guarded(async () => {
    const { classroom } = await actionClassroomManager(str(fd, "classroomId"));
    if (str(fd, "confirm") !== classroom.name) return `Type "${classroom.name}" to confirm.`;
    const [timetable, attachments] = await Promise.all([
      prisma.timetable.findUnique({ where: { classroomId: classroom.id } }),
      prisma.announcement.findMany({ where: { classroomId: classroom.id }, select: { attachmentPath: true } }),
    ]);
    await prisma.kidProfile.updateMany({ where: { classroomId: classroom.id }, data: { classroomId: null, classroomStatus: null } });
    await prisma.classroom.delete({ where: { id: classroom.id } });
    await removeSchoolFiles([timetable?.path, ...attachments.map((a) => a.attachmentPath)]);
  });
  if (err) return err;
  redirect("/school/staff?all=1");
}

export async function reviewKidAction(kidId: string, approve: boolean) {
  const kid = await prisma.kidProfile.findUnique({ where: { id: kidId } });
  if (!kid?.classroomId) return;
  await actionClassroom(kid.classroomId);
  await prisma.kidProfile.update({
    where: { id: kidId },
    data: approve ? { classroomStatus: "APPROVED" } : { classroomId: null, classroomStatus: null },
  });
  revalidateSchool();
}

/** Removes a kid from the roster. Their completions here go too; XP stays on the profile. */
export async function removeKidAction(kidId: string) {
  const kid = await prisma.kidProfile.findUnique({ where: { id: kidId } });
  if (!kid?.classroomId) return;
  const classroomId = kid.classroomId;
  await actionClassroom(classroomId);
  await prisma.$transaction([
    prisma.homeworkCompletion.deleteMany({ where: { kidId, homework: { subject: { classroomId } } } }),
    prisma.kidProfile.update({ where: { id: kidId }, data: { classroomId: null, classroomStatus: null } }),
  ]);
  revalidateSchool();
}

export async function uploadTimetableAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return guarded(async () => {
    const { classroom } = await actionClassroom(str(fd, "classroomId"));
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return "Choose a PDF to upload.";
    const bad = checkSchoolFile(file, "pdf");
    if (bad) return bad;
    const old = await prisma.timetable.findUnique({ where: { classroomId: classroom.id } });
    const path = await uploadSchoolFile(`timetables/${classroom.id}`, file);
    await prisma.timetable.upsert({
      where: { classroomId: classroom.id },
      create: { classroomId: classroom.id, path, fileName: file.name },
      update: { path, fileName: file.name, uploadedAt: new Date() },
    });
    await removeSchoolFiles([old?.path]);
    revalidateSchool();
    return undefined;
  });
}

// ---------------------------------------------------------------------------
// Subjects, homework, daily notes
// ---------------------------------------------------------------------------

export async function createSubjectAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  let target = "";
  const err = await guarded(async () => {
    const { user, classroom } = await actionClassroom(str(fd, "classroomId"));
    const parsed = name.safeParse(fd.get("name"));
    if (!parsed.success) return parsed.error.issues[0]?.message;
    const existing = await prisma.subject.findUnique({ where: { classroomId_name: { classroomId: classroom.id, name: parsed.data } } });
    if (existing) {
      return existing.ownerId ? `${parsed.data} already has a teacher here.` : `${parsed.data} exists without a teacher — claim it below.`;
    }
    const subject = await prisma.subject.create({ data: { classroomId: classroom.id, name: parsed.data, ownerId: user.id } });
    target = `/school/staff/classrooms/${classroom.id}/subjects/${subject.id}`;
  });
  if (err) return err;
  redirect(target);
}

export async function claimSubjectAction(subjectId: string) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject || subject.ownerId) return;
  const { user } = await actionClassroom(subject.classroomId);
  await prisma.subject.update({ where: { id: subjectId }, data: { ownerId: user.id } });
  redirect(`/school/staff/classrooms/${subject.classroomId}/subjects/${subjectId}`);
}

const homeworkSchema = z.object({
  title: z.string().trim().min(1, "Give the homework a title.").max(120),
  description: z.string().trim().max(2000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date."),
  xp: z.coerce.number().int().min(1, "Pick 1, 2 or 3 XP.").max(3, "Pick 1, 2 or 3 XP."),
});

function parseHomework(fd: FormData) {
  return homeworkSchema.safeParse({
    title: fd.get("title"),
    description: fd.get("description") ?? "",
    dueDate: fd.get("dueDate"),
    xp: fd.get("xp") ?? 1,
  });
}

export async function createHomeworkAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return guarded(async () => {
    const { subject } = await actionSubject(str(fd, "subjectId"));
    const parsed = parseHomework(fd);
    if (!parsed.success) return parsed.error.issues[0]?.message;
    await prisma.homework.create({
      data: {
        subjectId: subject.id,
        title: parsed.data.title,
        description: parsed.data.description,
        dueDate: istDayEnd(parsed.data.dueDate),
        xp: parsed.data.xp,
      },
    });
    revalidateSchool();
  });
}

export async function updateHomeworkAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return guarded(async () => {
    const homework = await prisma.homework.findUnique({ where: { id: str(fd, "homeworkId") } });
    if (!homework) return "Homework not found.";
    await actionSubject(homework.subjectId);
    const parsed = parseHomework(fd);
    if (!parsed.success) return parsed.error.issues[0]?.message;
    // Changing the reward re-prices it for the kids who already finished it too.
    const delta = parsed.data.xp - homework.xp;
    await prisma.$transaction([
      prisma.homework.update({
        where: { id: homework.id },
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          dueDate: istDayEnd(parsed.data.dueDate),
          xp: parsed.data.xp,
        },
      }),
      ...(delta === 0
        ? []
        : [
            prisma.kidProfile.updateMany({
              where: { completions: { some: { homeworkId: homework.id } } },
              data: { xp: { increment: delta } },
            }),
          ]),
    ]);
    revalidateSchool();
  });
}

/** Deleting takes the XP back from every kid who had completed it. */
export async function deleteHomeworkAction(homeworkId: string) {
  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: { completions: { select: { kidId: true } } },
  });
  if (!homework) return;
  await actionSubject(homework.subjectId);
  await prisma.$transaction([
    prisma.kidProfile.updateMany({
      where: { id: { in: homework.completions.map((c) => c.kidId) } },
      data: { xp: { decrement: homework.xp } },
    }),
    prisma.homework.delete({ where: { id: homeworkId } }),
  ]);
  revalidateSchool();
}

export async function saveNoteAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return guarded(async () => {
    const { subject } = await actionSubject(str(fd, "subjectId"));
    const body = str(fd, "body").slice(0, 1000);
    const day = istDay();
    if (!body) {
      await prisma.teachingNote.deleteMany({ where: { subjectId: subject.id, day } });
    } else {
      await prisma.teachingNote.upsert({
        where: { subjectId_day: { subjectId: subject.id, day } },
        create: { subjectId: subject.id, day, body },
        update: { body },
      });
    }
    revalidateSchool();
  });
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export async function postAnnouncementAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return guarded(async () => {
    const { user, staff, school } = await actionStaff();
    const body = str(fd, "body").slice(0, 2000);
    if (!body) return "Write something to announce.";
    const scope = str(fd, "scope") === "school" ? "school" : "classroom";
    const classroomId = str(fd, "classroomId") || null;
    const subjectId = str(fd, "subjectId") || null;

    if (scope === "school" && !staff.canAnnounce) return "You don't have permission to post school-wide.";
    if (scope === "classroom") {
      if (!classroomId) return "Pick a classroom.";
      await actionClassroom(classroomId);
    }
    if (subjectId) await actionSubject(subjectId);

    const file = fd.get("file");
    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    if (file instanceof File && file.size > 0) {
      const bad = checkSchoolFile(file, "pdf-or-image");
      if (bad) return bad;
      attachmentPath = await uploadSchoolFile(`announcements/${school.id}`, file);
      attachmentName = file.name;
    }

    await prisma.announcement.create({
      data: {
        schoolId: school.id,
        classroomId: scope === "classroom" ? classroomId : null,
        subjectId,
        authorId: user.id,
        body,
        attachmentPath,
        attachmentName,
      },
    });
    revalidateSchool();
  });
}

export async function deleteAnnouncementAction(announcementId: string) {
  const { user, school, isAdmin } = await actionStaff();
  const a = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!a || a.schoolId !== school.id || (a.authorId !== user.id && !isAdmin)) return;
  await prisma.announcement.delete({ where: { id: a.id } });
  await removeSchoolFiles([a.attachmentPath]);
  revalidateSchool();
}

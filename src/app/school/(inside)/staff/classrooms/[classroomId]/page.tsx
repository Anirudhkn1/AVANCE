import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pageStaff, teacherClassroom } from "@/lib/school";
import { studentRows, subjectCompletion } from "@/lib/school-stats";
import { signSchoolFiles } from "@/lib/school-storage";
import { Avatar, Badge, Card, ProgressBar, SectionHeading } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { ActionButton } from "@/components/school-client";
import { AnnouncementForm, AnnouncementList, BackLink, StudentTable, fieldClass, fmtIst } from "@/components/school";
import {
  claimSubjectAction,
  createSubjectAction,
  deleteClassroomAction,
  leaveClassroomAction,
  removeKidAction,
  renameClassroomAction,
  reviewKidAction,
  uploadTimetableAction,
} from "@/actions/school";

export default async function StaffClassroomPage({ params }: PageProps<"/school/staff/classrooms/[classroomId]">) {
  const { classroomId } = await params;
  const { user, staff, school, isAdmin } = await pageStaff();
  const classroom = await teacherClassroom(user.id, school.id, classroomId);
  if (!classroom) {
    const exists = await prisma.classroom.findFirst({ where: { id: classroomId, schoolId: school.id } });
    if (exists) redirect("/school/staff?all=1"); // not joined yet
    notFound();
  }

  const [subjects, kids, timetable, announcements, rows, completion] = await Promise.all([
    prisma.subject.findMany({
      where: { classroomId },
      include: { owner: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.kidProfile.findMany({ where: { classroomId }, orderBy: { name: "asc" } }),
    prisma.timetable.findUnique({ where: { classroomId } }),
    prisma.announcement.findMany({
      where: { classroomId },
      include: { author: { select: { name: true } }, subject: { select: { name: true } }, classroom: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    studentRows(classroomId, null),
    subjectCompletion(classroomId),
  ]);
  const signed = await signSchoolFiles([timetable?.path, ...announcements.map((a) => a.attachmentPath)]);
  const timetableUrl = timetable ? signed.get(timetable.path) : undefined;

  const mine = subjects.filter((s) => s.ownerId === user.id);

  const pending = kids.filter((k) => k.classroomStatus === "PENDING");
  const approved = kids.filter((k) => k.classroomStatus === "APPROVED");
  const canManage = classroom.createdById === user.id || isAdmin;
  const base = `/school/staff/classrooms/${classroomId}`;

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-8 space-y-6">
      <BackLink href="/school/staff?all=1">My classes</BackLink>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Class {classroom.name}</h1>
          <p className="text-sm text-muted">
            Student code for this class: <span className="font-mono font-medium text-foreground">{classroom.joinCode}</span>
          </p>
        </div>
        <form action={leaveClassroomAction.bind(null, classroomId)}>
          <ActionButton variant="ghost" confirm="Leave this classroom? Your subjects here will be left without a teacher.">
            Leave classroom
          </ActionButton>
        </form>
      </div>

      <Card>
        <SectionHeading title="Subjects" />
        <div className="grid gap-3 sm:grid-cols-3">
          {subjects.map((s) => {
            const own = s.ownerId === user.id;
            const body = (
              <>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted">{s.owner?.name ?? "No teacher"}</p>
              </>
            );
            return own ? (
              <Link key={s.id} href={`${base}/subjects/${s.id}`} className="rounded-xl border-2 border-accent bg-accent-soft p-4">
                {body}
              </Link>
            ) : (
              <div key={s.id} className="rounded-xl border border-border bg-surface-muted p-4">
                {body}
                {!s.ownerId && (
                  <form action={claimSubjectAction.bind(null, s.id)} className="mt-2">
                    <ActionButton variant="primary">Claim — I teach this</ActionButton>
                  </form>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-sm text-muted">
              {mine.length === 0 ? "Add the subject you teach in this class." : "Add another subject you teach here."}
            </p>
            <SubmitForm action={createSubjectAction} submitLabel="Add subject" className="flex flex-wrap gap-2 [&>button]:w-auto">
              <input type="hidden" name="classroomId" value={classroomId} />
              <input name="name" placeholder="e.g. Maths" required className={`${fieldClass} flex-1`} />
            </SubmitForm>
          </div>
      </Card>

      {pending.length > 0 && (
        <Card>
          <SectionHeading title={`Join requests (${pending.length})`} />
          <ul className="divide-y divide-border">
            {pending.map((k) => (
              <li key={k.id} className="flex items-center gap-3 py-2.5">
                <Avatar seed={k.avatarSeed} size="sm" />
                <span className="flex-1 font-medium">{k.name}</span>
                <form action={reviewKidAction.bind(null, k.id, true)}>
                  <ActionButton variant="primary">Approve</ActionButton>
                </form>
                <form action={reviewKidAction.bind(null, k.id, false)}>
                  <ActionButton variant="ghost">Reject</ActionButton>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <SectionHeading title="Class overview" subtitle="Homework across all subjects" />
        {completion.length > 0 && (
          <ul className="mb-5 space-y-2">
            {completion.map((s) => (
              <li key={s.id} className="text-sm">
                <div className="flex justify-between">
                  <span>{s.name}</span>
                  <span className="font-mono tabular-nums text-muted">{s.pct === null ? "—" : `${s.pct}%`}</span>
                </div>
                <ProgressBar percent={s.pct ?? 0} tone="success" className="mt-1" />
              </li>
            ))}
          </ul>
        )}
        <StudentTable rows={rows} hrefFor={(id) => `${base}/students/${id}`} />
      </Card>

      <Card>
        <SectionHeading title="🗓️ Timetable" />
        {timetable && timetableUrl ? (
          <p className="mb-3 text-sm">
            <a href={timetableUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {timetable.fileName}
            </a>{" "}
            <span className="text-muted">· updated {fmtIst(timetable.uploadedAt)}</span>
          </p>
        ) : (
          <p className="mb-3 text-sm text-muted">No timetable uploaded yet.</p>
        )}
        <SubmitForm action={uploadTimetableAction} submitLabel={timetable ? "Replace timetable" : "Upload timetable"}>
          <input type="hidden" name="classroomId" value={classroomId} />
          <input type="file" name="file" accept="application/pdf" required className="text-sm" />
        </SubmitForm>
      </Card>

      <Card>
        <SectionHeading title="📣 Class announcements" />
        <div className="mb-4">
          <AnnouncementForm classroomId={classroomId} canAnnounceSchool={staff.canAnnounce} />
        </div>
        <AnnouncementList items={announcements} signed={signed} canDelete={(a) => a.authorId === user.id || isAdmin} />
      </Card>

      <Card>
        <SectionHeading title={`Students (${approved.length})`} />
        {approved.length === 0 ? (
          <p className="text-sm text-muted">Share the student code above. Kids join from their profile and you approve them here.</p>
        ) : (
          <ul className="divide-y divide-border">
            {approved.map((k) => (
              <li key={k.id} className="flex items-center gap-3 py-2">
                <Avatar seed={k.avatarSeed} size="sm" />
                <Link href={`${base}/students/${k.id}`} className="flex-1 hover:underline">
                  {k.name}
                </Link>
                <form action={removeKidAction.bind(null, k.id)}>
                  <ActionButton variant="ghost" confirm={`Remove ${k.name} from this class? Their homework record here is deleted.`}>
                    Remove
                  </ActionButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {canManage && (
        <Card>
          <SectionHeading title="Manage classroom" subtitle="Rename at the start of a new year, e.g. 5-A → 6-A." />
          <div className="grid gap-6 sm:grid-cols-2">
            <SubmitForm action={renameClassroomAction} submitLabel="Rename">
              <input type="hidden" name="classroomId" value={classroomId} />
              <input name="name" defaultValue={classroom.name} required className={fieldClass} />
            </SubmitForm>
            <SubmitForm action={deleteClassroomAction} submitLabel="Delete classroom">
              <input type="hidden" name="classroomId" value={classroomId} />
              <input name="confirm" placeholder={`Type "${classroom.name}" to delete`} required className={fieldClass} />
            </SubmitForm>
          </div>
          <p className="mt-3 text-xs text-muted">
            <Badge tone="danger">Careful</Badge> Deleting removes all subjects, homework, notes and announcements of this class.
          </p>
        </Card>
      )}
    </div>
  );
}

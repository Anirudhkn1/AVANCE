import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { istDay, pageStaff } from "@/lib/school";
import { studentRows } from "@/lib/school-stats";
import { signSchoolFiles } from "@/lib/school-storage";
import { Card, LinkButton, SectionHeading } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { ActionButton } from "@/components/school-client";
import {
  AnnouncementForm,
  AnnouncementList,
  BackLink,
  NotesTimeline,
  StudentTable,
  fieldClass,
  fmtIst,
} from "@/components/school";
import { createHomeworkAction, deleteHomeworkAction, saveNoteAction, updateHomeworkAction } from "@/actions/school";

export default async function StaffSubjectPage({
  params,
}: PageProps<"/school/staff/classrooms/[classroomId]/subjects/[subjectId]">) {
  const { classroomId, subjectId } = await params;
  const { user, staff, school, isAdmin } = await pageStaff();
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      classroom: true,
      homework: { include: { _count: { select: { completions: true } } }, orderBy: { createdAt: "desc" } },
      notes: { orderBy: { day: "desc" }, take: 30 },
      announcements: {
        include: { author: { select: { name: true } }, subject: { select: { name: true } }, classroom: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (
    !subject ||
    subject.classroomId !== classroomId ||
    subject.classroom.schoolId !== school.id ||
    subject.ownerId !== user.id
  ) {
    notFound();
  }

  const [rows, signed] = await Promise.all([
    studentRows(classroomId, subjectId),
    signSchoolFiles(subject.announcements.map((a) => a.attachmentPath)),
  ]);
  const today = istDay();
  const todayNote = subject.notes.find((n) => n.day === today);
  const classBase = `/school/staff/classrooms/${classroomId}`;

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackLink href="/school/staff?all=1">My classes</BackLink>
        <LinkButton href={classBase} variant="secondary" size="sm">
          Class {subject.classroom.name} overview →
        </LinkButton>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {subject.name} <span className="text-muted font-normal">· Class {subject.classroom.name}</span>
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <SectionHeading title="➕ Create homework" />
          <SubmitForm action={createHomeworkAction} submitLabel="Publish homework">
            <input type="hidden" name="subjectId" value={subjectId} />
            <input name="title" placeholder="Title" required maxLength={120} className={fieldClass} />
            <textarea name="description" rows={3} placeholder="Details (optional)" className={fieldClass} />
            <label className="block text-sm text-muted">
              Due date
              <input type="date" name="dueDate" required defaultValue={today} min={today} className={`${fieldClass} mt-1`} />
            </label>
          </SubmitForm>
        </Card>

        <Card>
          <SectionHeading title="📝 Taught today" subtitle="Parents see this. Editable until midnight." />
          <SubmitForm action={saveNoteAction} submitLabel="Save note">
            <input type="hidden" name="subjectId" value={subjectId} />
            <textarea
              key={todayNote?.updatedAt.toISOString() ?? "new"}
              name="body"
              rows={4}
              defaultValue={todayNote?.body ?? ""}
              placeholder="e.g. Fractions — adding with unlike denominators, pages 42–45."
              className={fieldClass}
            />
          </SubmitForm>
          <div className="mt-4 border-t border-border pt-4">
            <NotesTimeline notes={subject.notes.filter((n) => n.day !== today)} empty="Earlier notes will show here." />
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeading title="Homework" subtitle={`${subject.homework.length} published`} />
        {subject.homework.length === 0 ? (
          <p className="text-sm text-muted">Nothing published yet.</p>
        ) : (
          <ul className="space-y-2">
            {subject.homework.map((h) => (
              <li key={h.id} className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{h.title}</p>
                    <p className="text-xs text-muted">
                      Due {fmtIst(h.dueDate, false)} · {h._count.completions}/{rows.length} done
                    </p>
                  </div>
                  <form action={deleteHomeworkAction.bind(null, h.id)}>
                    <ActionButton
                      variant="ghost"
                      confirm={
                        h._count.completions > 0
                          ? `${h._count.completions} student(s) completed this — they'll lose the XP. Delete anyway?`
                          : "Delete this homework?"
                      }
                    >
                      Delete
                    </ActionButton>
                  </form>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted">Edit</summary>
                  <SubmitForm action={updateHomeworkAction} submitLabel="Save changes" className="mt-2 space-y-2">
                    <input type="hidden" name="homeworkId" value={h.id} />
                    <input name="title" defaultValue={h.title} required maxLength={120} className={fieldClass} />
                    <textarea name="description" rows={2} defaultValue={h.description} className={fieldClass} />
                    <input type="date" name="dueDate" required defaultValue={istDay(h.dueDate)} className={fieldClass} />
                  </SubmitForm>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHeading title="📊 Subject stats" />
        <StudentTable rows={rows} hrefFor={(id) => `${classBase}/students/${id}`} />
      </Card>

      <Card>
        <SectionHeading title="📣 Announcements" subtitle={`Posted as ${subject.name}`} />
        <div className="mb-4">
          <AnnouncementForm classroomId={classroomId} subjectId={subjectId} canAnnounceSchool={staff.canAnnounce} />
        </div>
        <AnnouncementList
          items={subject.announcements}
          signed={signed}
          canDelete={(a) => a.authorId === user.id || isAdmin}
        />
      </Card>
    </div>
  );
}

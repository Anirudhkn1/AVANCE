import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visibleAnnouncements } from "@/lib/school";
import { signSchoolFiles } from "@/lib/school-storage";
import { Badge, Card, LinkButton, SectionHeading } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { ActionButton } from "@/components/school-client";
import { AnnouncementList, BackLink, fieldClass } from "@/components/school";
import {
  cancelStaffRequestAction,
  createClassroomAction,
  createSchoolAction,
  joinClassroomAction,
  joinSchoolAction,
  postAnnouncementAction,
} from "@/actions/school";

export default async function StaffHomePage({ searchParams }: PageProps<"/school/staff">) {
  const userId = await requireSessionUserId();
  const showAll = (await searchParams).all === "1";
  const staff = await prisma.schoolStaff.findUnique({ where: { userId: userId }, include: { school: true } });

  if (!staff) {
    return (
      <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
        <BackLink href="/school/enter">Who are you?</BackLink>
        <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <SectionHeading title="Create a school" subtitle="You'll be the school admin." />
            <SubmitForm action={createSchoolAction} submitLabel="Create school">
              <input name="name" placeholder="School name" required className={fieldClass} />
            </SubmitForm>
          </Card>
          <Card>
            <SectionHeading title="Join a school" subtitle="Use the staff code from your school admin." />
            <SubmitForm action={joinSchoolAction} submitLabel="Request to join">
              <input name="code" placeholder="Staff code" required className={`${fieldClass} uppercase`} />
            </SubmitForm>
          </Card>
        </div>
      </div>
    );
  }

  if (staff.status !== "APPROVED") {
    return (
      <div className="mx-auto max-w-lg w-full px-4 py-16">
        <Card>
          <p className="font-medium">⏳ Waiting for {staff.school.name}&apos;s admin to approve you</p>
          <p className="text-sm text-muted mt-1">You&apos;ll get access as soon as they do.</p>
          <form action={cancelStaffRequestAction} className="mt-4">
            <ActionButton>Cancel request</ActionButton>
          </form>
        </Card>
      </div>
    );
  }

  const school = staff.school;
  const isAdmin = school.adminId === userId;
  const [classrooms, mySubjects, announcements, pendingStaff] = await Promise.all([
    prisma.classroom.findMany({
      where: { schoolId: school.id },
      include: {
        teachers: { where: { userId: userId } },
        _count: { select: { kids: { where: { classroomStatus: "PENDING" } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      where: { ownerId: userId, classroom: { schoolId: school.id } },
      include: { classroom: true },
      orderBy: [{ classroom: { name: "asc" } }, { name: "asc" }],
    }),
    visibleAnnouncements(school.id, null, 10),
    isAdmin ? prisma.schoolStaff.count({ where: { schoolId: school.id, status: "PENDING" } }) : 0,
  ]);
  const joined = classrooms.filter((c) => c.teachers.length > 0);
  const subjectless = joined.filter((c) => !mySubjects.some((s) => s.classroomId === c.id));

  // One class, one subject: skip the list and go straight in.
  if (!showAll && mySubjects.length === 1 && subjectless.length === 0) {
    const s = mySubjects[0];
    redirect(`/school/staff/classrooms/${s.classroomId}/subjects/${s.id}`);
  }

  const signed = await signSchoolFiles(announcements.map((a) => a.attachmentPath));
  const schoolOnly = announcements.filter((a) => !a.classroomId);

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My classes</h1>
          <p className="text-sm text-muted">{school.name}</p>
        </div>
        {isAdmin && (
          <LinkButton href="/school/staff/admin" variant="secondary">
            School admin {pendingStaff > 0 && <Badge tone="danger">{pendingStaff}</Badge>}
          </LinkButton>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mySubjects.map((s) => (
          <Link
            key={s.id}
            href={`/school/staff/classrooms/${s.classroomId}/subjects/${s.id}`}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-accent"
          >
            <p className="text-xs text-muted">Class {s.classroom.name}</p>
            <p className="text-lg font-semibold">{s.name}</p>
          </Link>
        ))}
        {subjectless.map((c) => (
          <Link
            key={c.id}
            href={`/school/staff/classrooms/${c.id}`}
            className="rounded-2xl border border-dashed border-border bg-surface p-5 transition hover:border-accent"
          >
            <p className="text-xs text-muted">Class {c.name}</p>
            <p className="font-medium">Set up your subject →</p>
          </Link>
        ))}
        {mySubjects.length === 0 && subjectless.length === 0 && (
          <p className="col-span-full text-sm text-muted">Join or create a classroom below to get started.</p>
        )}
      </div>

      <Card>
        <SectionHeading title="All classrooms" subtitle="Join any classroom you teach in." />
        <ul className="divide-y divide-border">
          {classrooms.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <span className="flex-1 font-medium">Class {c.name}</span>
              {c.teachers.length > 0 ? (
                <>
                  {c._count.kids > 0 && <Badge tone="warning">{c._count.kids} waiting</Badge>}
                  <LinkButton href={`/school/staff/classrooms/${c.id}`} size="sm" variant="ghost">
                    Open
                  </LinkButton>
                </>
              ) : (
                <form action={joinClassroomAction.bind(null, c.id)}>
                  <ActionButton>Join</ActionButton>
                </form>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-border pt-4">
          <SubmitForm action={createClassroomAction} submitLabel="Create classroom" className="flex flex-wrap gap-2 [&>button]:w-auto">
            <input name="name" placeholder="New classroom, e.g. 5-A" required className={`${fieldClass} flex-1`} />
          </SubmitForm>
        </div>
      </Card>

      <Card>
        <SectionHeading title="📣 School announcements" />
        {staff.canAnnounce && (
          <div className="mb-4">
            <SubmitForm action={postAnnouncementAction} submitLabel="Post to whole school">
              <input type="hidden" name="scope" value="school" />
              <textarea name="body" rows={2} required placeholder="Announcement for the whole school…" className={fieldClass} />
              <input type="file" name="file" accept="application/pdf,image/*" className="text-sm" />
            </SubmitForm>
          </div>
        )}
        <AnnouncementList
          items={schoolOnly}
          signed={signed}
          canDelete={(a) => a.authorId === userId || isAdmin}
        />
      </Card>
    </div>
  );
}

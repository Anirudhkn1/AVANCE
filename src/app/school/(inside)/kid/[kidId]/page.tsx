import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSeen, kidViewer, pageKid, visibleAnnouncements } from "@/lib/school";
import { Card, SectionHeading } from "@/components/ui";
import { KidAvatar } from "@/components/kid-avatar";
import { SubmitForm } from "@/components/forms";
import { DesktopIconLink } from "@/components/desktop-icon";
import { BackLink, LevelBar, NewDot, fieldClass } from "@/components/school";
import { kidJoinClassroomAction, kidJoinSchoolAction } from "@/actions/school";

export default async function KidHomePage({ params }: PageProps<"/school/kid/[kidId]">) {
  const { kidId } = await params;
  const { kid, classroom } = await pageKid(kidId);

  const header = (
    <div className="space-y-4">
      <BackLink href="/school/kids">Switch student</BackLink>
      <div className="flex items-center gap-4">
        <KidAvatar kid={kid} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Hi, {kid.name}!</h1>
          <p className="text-sm text-muted">
            {kid.school ? kid.school.name : "Not in a school yet"}
            {classroom && ` · Class ${classroom.name}`}
          </p>
        </div>
      </div>
      <LevelBar xp={kid.xp} />
    </div>
  );

  if (!kid.school) {
    return (
      <Page>
        {header}
        <Card>
          <SectionHeading title="Join your school" subtitle="Ask your school for the student code." />
          <SubmitForm action={kidJoinSchoolAction} submitLabel="Join school">
            <input type="hidden" name="kidId" value={kid.id} />
            <input name="code" placeholder="e.g. ABCD-2345" required className={`${fieldClass} uppercase`} />
          </SubmitForm>
        </Card>
      </Page>
    );
  }

  // Homework and announcements each open on their own page; the home
  // screen just shows a tile for each with what's waiting inside.
  const viewer = kidViewer(kid.id);
  const [announcements, seenAnnouncements] = await Promise.all([
    visibleAnnouncements(kid.school.id, classroom?.id ?? null),
    getSeen(viewer, ["announcements"]),
  ]);
  const lastSeen = seenAnnouncements.get("announcements") ?? new Date(0);
  const newAnnouncements = announcements.filter((a) => a.createdAt > lastSeen).length;
  const announcementTile = (
    <DesktopIconLink
      href={`/school/kid/${kid.id}/announcements`}
      icon="📣"
      label="Announcements"
      sublabel={newAnnouncements > 0 ? `${newAnnouncements} new` : "All caught up"}
      glyphClassName="bg-warning-soft"
    />
  );

  if (!classroom) {
    const pending = kid.classroomStatus === "PENDING" ? await prisma.classroom.findUnique({ where: { id: kid.classroomId! } }) : null;
    return (
      <Page>
        {header}
        <Tiles>{announcementTile}</Tiles>
        {pending ? (
          <Card>
            <p className="font-medium">⏳ Waiting for your teacher to approve</p>
            <p className="text-sm text-muted mt-1">You asked to join Class {pending.name}.</p>
          </Card>
        ) : (
          <Card>
            <SectionHeading title="Join your classroom" subtitle="Your teacher will give you the classroom code." />
            <SubmitForm action={kidJoinClassroomAction} submitLabel="Ask to join">
              <input type="hidden" name="kidId" value={kid.id} />
              <input name="code" placeholder="e.g. WXYZ-6789" required className={`${fieldClass} uppercase`} />
            </SubmitForm>
          </Card>
        )}
      </Page>
    );
  }

  const [subjects, homeworkToDo, elixirToBrew] = await Promise.all([
    prisma.subject.findMany({
      where: { classroomId: classroom.id },
      include: {
        owner: { select: { name: true } },
        homework: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        notes: { select: { updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 1 },
      },
      orderBy: { name: "asc" },
    }),
    prisma.homework.count({
      where: { subject: { classroomId: classroom.id }, completions: { none: { kidId: kid.id } } },
    }),
    // Elixir cards ready to brew: new ones, plus any whose next review date has come.
    prisma.elixirCard.count({
      where: {
        deck: { subject: { classroomId: classroom.id } },
        NOT: { progress: { some: { kidId: kid.id, dueDate: { gt: new Date() } } } },
      },
    }),
  ]);
  const seen = await getSeen(viewer, subjects.map((s) => `subject:${s.id}`));

  return (
    <Page>
      {header}

      <Tiles>
        <DesktopIconLink
          href={`/school/kid/${kid.id}/homework`}
          icon="🎮"
          label="Homework"
          sublabel={homeworkToDo > 0 ? `${homeworkToDo} to do` : "All done 🎉"}
        />
        {announcementTile}
        <DesktopIconLink
          href={`/school/kid/${kid.id}/elixir`}
          icon="🧪"
          label="Elixir"
          sublabel={elixirToBrew > 0 ? `${elixirToBrew} to brew` : "All caught up"}
          glyphClassName="bg-[#f5d9ff]"
        />
      </Tiles>

      <Card>
        <SectionHeading title="📚 Subjects" />
        {subjects.length === 0 ? (
          <p className="text-sm text-muted">Your teachers haven&apos;t added subjects yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {subjects.map((s) => {
              const latest = Math.max(s.homework[0]?.createdAt.getTime() ?? 0, s.notes[0]?.updatedAt.getTime() ?? 0);
              const lastSeen = seen.get(`subject:${s.id}`)?.getTime() ?? 0;
              return (
                <Link
                  key={s.id}
                  href={`/school/kid/${kid.id}/subjects/${s.id}`}
                  className="rounded-xl border border-border bg-surface-muted p-4 transition hover:border-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.name}</span>
                    {latest > lastSeen && <NewDot />}
                  </div>
                  <p className="mt-1 text-xs text-muted">{s.owner?.name ?? "No teacher yet"}</p>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </Page>
  );
}

function Tiles({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>;
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">{children}</div>;
}

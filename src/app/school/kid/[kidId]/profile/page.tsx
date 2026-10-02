import { prisma } from "@/lib/prisma";
import { istDay, pageKid, visibleAnnouncements } from "@/lib/school";
import { kidStats } from "@/lib/school-stats";
import { signSchoolFiles } from "@/lib/school-storage";
import { Avatar, Card, SectionHeading } from "@/components/ui";
import { AnnouncementList, LevelBar, StudentStatsView } from "@/components/school";

export default async function KidProfilePage({ params }: PageProps<"/school/kid/[kidId]/profile">) {
  const { kidId } = await params;
  const { kid, classroom } = await pageKid(kidId);

  const [stats, todayNotes, announcements] = await Promise.all([
    classroom ? kidStats(kid.id, classroom.id) : null,
    classroom
      ? prisma.teachingNote.findMany({
          where: { day: istDay(), subject: { classroomId: classroom.id } },
          include: { subject: { select: { name: true } } },
        })
      : [],
    kid.schoolId ? visibleAnnouncements(kid.schoolId, classroom?.id ?? null, 50) : [],
  ]);
  const signed = await signSchoolFiles(announcements.map((a) => a.attachmentPath));

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Avatar seed={kid.avatarSeed} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{kid.name}</h1>
          <p className="text-sm text-muted">
            {kid.school?.name ?? "No school"}
            {classroom && ` · Class ${classroom.name}`}
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-tight">👪 Parent&apos;s dashboard</h2>

      <Card>
        <SectionHeading title="Progress" />
        {stats ? <StudentStatsView stats={stats} xp={kid.xp} /> : <LevelBar xp={kid.xp} />}
      </Card>

      <Card>
        <SectionHeading title="Today in class" subtitle="What each teacher covered today" />
        {todayNotes.length === 0 ? (
          <p className="text-sm text-muted">No class notes yet today.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {todayNotes.map((n) => (
              <li key={n.id}>
                <span className="font-medium">{n.subject.name}:</span> <span className="whitespace-pre-wrap">{n.body}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHeading title="All announcements" />
        <AnnouncementList items={announcements} signed={signed} />
      </Card>
    </div>
  );
}

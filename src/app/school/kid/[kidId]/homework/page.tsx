import { prisma } from "@/lib/prisma";
import { istDay, pageKid } from "@/lib/school";
import { signSchoolFiles } from "@/lib/school-storage";
import { Badge, Card, EmptyState, SectionHeading } from "@/components/ui";
import { ActionButton } from "@/components/school-client";
import { BackLink, fmtIst } from "@/components/school";
import { toggleHomeworkAction } from "@/actions/school";

export default async function KidHomeworkPage({ params }: PageProps<"/school/kid/[kidId]/homework">) {
  const { kidId } = await params;
  const { kid, classroom } = await pageKid(kidId);
  const back = <BackLink href={`/school/kid/${kid.id}`}>Back home</BackLink>;

  if (!classroom) {
    return (
      <Page>
        {back}
        <Card>
          <EmptyState title="Join a classroom first" description="Your homework shows up here once your teacher lets you in." />
        </Card>
      </Page>
    );
  }

  const [homework, timetable] = await Promise.all([
    prisma.homework.findMany({
      where: { subject: { classroomId: classroom.id } },
      include: { subject: { select: { name: true } }, completions: { where: { kidId: kid.id } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.timetable.findUnique({ where: { classroomId: classroom.id } }),
  ]);
  const timetableUrl = timetable ? (await signSchoolFiles([timetable.path])).get(timetable.path) : undefined;

  const today = istDay();
  const pendingWork = homework.filter((h) => h.completions.length === 0);
  const doneWork = homework
    .filter((h) => h.completions.length > 0)
    .sort((a, b) => b.completions[0].completedAt.getTime() - a.completions[0].completedAt.getTime())
    .slice(0, 10);

  return (
    <Page>
      {back}
      <Card>
        <SectionHeading
          title="🎮 Homework"
          subtitle={`${pendingWork.length} to do · +10 XP each`}
          action={
            timetableUrl && (
              <a href={timetableUrl} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
                🗓️ Timetable
              </a>
            )
          }
        />
        {pendingWork.length === 0 ? (
          <p className="text-sm text-muted">All done — nice work! 🎉</p>
        ) : (
          <ul className="space-y-2">
            {pendingWork.map((h) => {
              const overdue = h.dueDate < new Date();
              return (
                <li key={h.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{h.title}</p>
                    <p className="text-xs text-muted">
                      {h.subject.name} · due {fmtIst(h.dueDate, false)}
                    </p>
                  </div>
                  {overdue && <Badge tone="danger">Late</Badge>}
                  <form action={toggleHomeworkAction.bind(null, kid.id, h.id)}>
                    <ActionButton variant="primary">Done ✓</ActionButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        {doneWork.length > 0 && (
          <>
            <h3 className="mt-5 mb-2 text-sm font-medium text-muted">Recently finished</h3>
            <ul className="space-y-1.5">
              {doneWork.map((h) => {
                const c = h.completions[0];
                const canUndo = istDay(c.completedAt) === today;
                return (
                  <li key={h.id} className="flex items-center gap-3 text-sm">
                    <span className="text-success">✓</span>
                    <span className="min-w-0 flex-1 truncate">
                      {h.title} <span className="text-muted">· {h.subject.name}</span>
                    </span>
                    {c.late && <Badge tone="warning">Late</Badge>}
                    {canUndo && (
                      <form action={toggleHomeworkAction.bind(null, kid.id, h.id)}>
                        <ActionButton variant="ghost">Undo</ActionButton>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">{children}</div>;
}

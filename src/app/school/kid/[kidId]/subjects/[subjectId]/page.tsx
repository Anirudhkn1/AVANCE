import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { istDay, kidViewer, pageKid, touchSeen } from "@/lib/school";
import { signSchoolFiles } from "@/lib/school-storage";
import { Badge, Card, SectionHeading } from "@/components/ui";
import { ActionButton } from "@/components/school-client";
import { AnnouncementList, BackLink, NewDot, NotesTimeline, fmtIst } from "@/components/school";
import { toggleHomeworkAction } from "@/actions/school";

export default async function KidSubjectPage({ params }: PageProps<"/school/kid/[kidId]/subjects/[subjectId]">) {
  const { kidId, subjectId } = await params;
  const { kid, classroom } = await pageKid(kidId);
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      owner: { select: { name: true } },
      homework: { include: { completions: { where: { kidId } } }, orderBy: { dueDate: "desc" } },
      notes: { orderBy: { day: "desc" }, take: 30 },
      announcements: {
        where: { OR: [{ classroomId: null }, { classroomId: classroom?.id }] },
        include: { author: { select: { name: true } }, subject: { select: { name: true } }, classroom: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!classroom || !subject || subject.classroomId !== classroom.id) notFound();

  const lastSeen = await touchSeen(kidViewer(kid.id), `subject:${subject.id}`);
  const signed = await signSchoolFiles(subject.announcements.map((a) => a.attachmentPath));
  const today = istDay();

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
      <BackLink href={`/school/kid/${kid.id}`}>Home</BackLink>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{subject.name}</h1>
        <p className="text-sm text-muted">{subject.owner?.name ?? "No teacher yet"}</p>
      </div>

      <Card>
        <SectionHeading title="📝 What we covered" />
        <NotesTimeline notes={subject.notes} empty="No class notes yet." />
      </Card>

      <Card>
        <SectionHeading title="🎮 Homework" />
        {subject.homework.length === 0 ? (
          <p className="text-sm text-muted">No homework yet.</p>
        ) : (
          <ul className="space-y-2">
            {subject.homework.map((h) => {
              const c = h.completions[0];
              return (
                <li key={h.id} className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {h.title} {h.createdAt > lastSeen && <NewDot />}
                      </p>
                      <p className="text-xs text-muted">Due {fmtIst(h.dueDate, false)}</p>
                    </div>
                    {c ? (
                      <>
                        <Badge tone={c.late ? "warning" : "success"}>{c.late ? "Done late" : "Done ✓"}</Badge>
                        {istDay(c.completedAt) === today && (
                          <form action={toggleHomeworkAction.bind(null, kid.id, h.id)}>
                            <ActionButton variant="ghost">Undo</ActionButton>
                          </form>
                        )}
                      </>
                    ) : (
                      <form action={toggleHomeworkAction.bind(null, kid.id, h.id)}>
                        <ActionButton variant="primary">Done ✓</ActionButton>
                      </form>
                    )}
                  </div>
                  {h.description && <p className="mt-2 whitespace-pre-wrap text-sm">{h.description}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHeading title="📣 From this subject" />
        <AnnouncementList items={subject.announcements} signed={signed} empty="Nothing announced from this subject." />
      </Card>
    </div>
  );
}

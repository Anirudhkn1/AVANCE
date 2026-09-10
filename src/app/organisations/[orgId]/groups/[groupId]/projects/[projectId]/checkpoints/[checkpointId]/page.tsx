import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireMembership, canManageGroups, isGroupMember } from "@/lib/permissions";
import { getCheckpointStates } from "@/lib/progress";
import { bytesToSize, formatDateTime } from "@/lib/format";
import { Card, SectionHeading, Badge, Avatar, EmptyState } from "@/components/ui";
import { SubmitCheckpointForm, MarkCompleteButton, ReviewSubmissionActions } from "@/components/checkpoint-actions";

export default async function CheckpointPage({
  params,
}: {
  params: Promise<{ orgId: string; groupId: string; projectId: string; checkpointId: string }>;
}) {
  const { orgId, groupId, projectId, checkpointId } = await params;
  const user = await requireSessionUser();
  const membership = await requireMembership(user.id, orgId).catch(() => null);
  if (!membership) notFound();

  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: { project: { include: { group: true, checkpoints: { orderBy: { order: "asc" } } } } },
  });
  if (!checkpoint || checkpoint.projectId !== projectId || checkpoint.project.groupId !== groupId || checkpoint.project.group.organisationId !== orgId) {
    notFound();
  }

  const isHost = canManageGroups(membership.role);
  const backHref = `/organisations/${orgId}/groups/${groupId}/projects/${projectId}`;

  if (isHost) {
    const groupMembers = await prisma.groupMembership.findMany({ where: { groupId }, include: { user: true } });
    const studentMemberships = await prisma.organisationMembership.findMany({
      where: { organisationId: orgId, role: "STUDENT", userId: { in: groupMembers.map((m) => m.userId) } },
    });
    const studentIds = new Set(studentMemberships.map((m) => m.userId));

    const submissions = await prisma.checkpointSubmission.findMany({
      where: { checkpointId },
      orderBy: { submittedAt: "desc" },
    });
    const latestByUser = new Map<string, (typeof submissions)[number]>();
    for (const s of submissions) if (!latestByUser.has(s.userId)) latestByUser.set(s.userId, s);

    const progressRows = await prisma.checkpointProgress.findMany({ where: { checkpointId } });
    const completedByUser = new Map(progressRows.map((p) => [p.userId, p.completed]));

    return (
      <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
        <div>
          <Link href={backHref} className="text-sm text-muted hover:text-foreground">← Back to project</Link>
          <h1 className="text-2xl font-semibold tracking-tight mt-2">
            {checkpoint.order}. {checkpoint.title}
          </h1>
          <p className="text-muted text-sm mt-1">{checkpoint.description}</p>
          <div className="flex gap-2 mt-2">
            <Badge tone="neutral">{checkpoint.submissionRequired ? "PDF required" : "No submission"}</Badge>
            <Badge tone="accent">+{checkpoint.xpValue} XP</Badge>
          </div>
        </div>

        <Card padded={false}>
          <div className="p-5 pb-0">
            <SectionHeading title="Students" />
          </div>
          <ul className="divide-y divide-border">
            {groupMembers.filter((m) => studentIds.has(m.userId)).map((m) => {
              const submission = latestByUser.get(m.userId);
              const completed = completedByUser.get(m.userId) ?? false;
              return (
                <li key={m.userId} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar seed={m.user.avatarSeed} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.user.name}</p>
                      {submission && (
                        <p className="text-xs text-muted truncate">
                          {submission.fileName} · {bytesToSize(submission.fileSize)} · {formatDateTime(submission.submittedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {submission && (
                      <a href={`/api/files/${submission.id}`} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                        View PDF
                      </a>
                    )}
                    {completed ? (
                      <Badge tone="success">Complete</Badge>
                    ) : submission?.status === "PENDING" ? (
                      <ReviewSubmissionActions submissionId={submission.id} />
                    ) : submission?.status === "REJECTED" ? (
                      <Badge tone="danger">Rejected</Badge>
                    ) : (
                      <Badge tone="neutral">Not submitted</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {groupMembers.length === 0 && <div className="p-5"><EmptyState title="No students in this group yet" /></div>}
        </Card>
      </div>
    );
  }

  // --- Student view ---------------------------------------------------
  if (!(await isGroupMember(user.id, groupId))) notFound();

  const allCheckpoints = checkpoint.project.checkpoints;
  const progress = await prisma.checkpointProgress.findMany({
    where: { userId: user.id, checkpointId: { in: allCheckpoints.map((c) => c.id) } },
  });
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.checkpointId));
  const states = getCheckpointStates(allCheckpoints, completedIds);
  const state = states.get(checkpointId)!;

  const submissions = await prisma.checkpointSubmission.findMany({
    where: { checkpointId, userId: user.id },
    orderBy: { submittedAt: "desc" },
  });
  const latest = submissions[0];

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-muted hover:text-foreground">← Back to quest</Link>
        <div className="flex items-center gap-2 mt-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {checkpoint.order}. {checkpoint.title}
          </h1>
          <Badge tone={state === "completed" ? "success" : state === "current" ? "accent" : "neutral"}>
            {state === "completed" ? "Complete" : state === "current" ? "Current" : "Locked"}
          </Badge>
        </div>
        <p className="text-muted text-sm mt-2">{checkpoint.description}</p>
        <p className="text-xs text-muted mt-1">+{checkpoint.xpValue} XP {checkpoint.submissionRequired ? "· PDF submission required" : "· No submission required"}</p>
      </div>

      {state === "locked" && (
        <Card>
          <EmptyState title="This checkpoint is locked" description="Complete the earlier checkpoints first." />
        </Card>
      )}

      {state === "completed" && (
        <Card>
          <p className="text-sm">✅ You completed this checkpoint.</p>
          {latest?.status === "APPROVED" && (
            <a href={`/api/files/${latest.id}`} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline mt-2 inline-block">
              View your submission →
            </a>
          )}
        </Card>
      )}

      {state === "current" && (
        <Card className="space-y-4">
          {!checkpoint.submissionRequired ? (
            <MarkCompleteButton checkpointId={checkpointId} />
          ) : latest?.status === "PENDING" ? (
            <div>
              <p className="text-sm font-medium">⏳ Waiting for host review</p>
              <p className="text-sm text-muted mt-1">
                Submitted {formatDateTime(latest.submittedAt)} · {latest.fileName}
              </p>
            </div>
          ) : (
            <>
              {latest?.status === "REJECTED" && (
                <div className="rounded-lg bg-danger-soft text-danger text-sm px-3 py-2">
                  Not approved: {latest.rejectionReason || "No reason given."} You can resubmit below.
                </div>
              )}
              <SubmitCheckpointForm checkpointId={checkpointId} />
            </>
          )}
        </Card>
      )}
    </div>
  );
}

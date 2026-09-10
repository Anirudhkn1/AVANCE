import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { readSubmissionFile } from "@/lib/storage";

// Submissions are stored outside /public and only ever reachable through
// this authenticated handler (PRD §35 — PDFs must be associated with the
// correct user/project/checkpoint, and access must be checked server-side).
export async function GET(_request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const submission = await prisma.checkpointSubmission.findUnique({
    where: { id: submissionId },
    include: { checkpoint: { include: { project: { include: { group: true } } } } },
  });
  if (!submission) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const organisationId = submission.checkpoint.project.group.organisationId;
  const membership = await prisma.organisationMembership.findUnique({
    where: { userId_organisationId: { userId: user.id, organisationId } },
  });

  const isOwner = submission.userId === user.id;
  const isHost = membership && (membership.role === "HOST" || membership.role === "HEAD");
  if (!isOwner && !isHost) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await readSubmissionFile(submission.filePath);
  } catch {
    return NextResponse.json({ error: "File is missing on disk." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(submission.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

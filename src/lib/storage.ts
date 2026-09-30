import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

// Deliberately outside /public — submissions are only ever served through
// an authenticated route handler, never as static files.
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export async function saveSubmissionFile(params: {
  organisationId: string;
  checkpointId: string;
  userId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<{ relativePath: string }> {
  const dir = path.join(UPLOAD_ROOT, params.organisationId, params.checkpointId);
  await mkdir(dir, { recursive: true });
  const safeName = sanitizeFileName(params.fileName);
  const fileName = `${params.userId}-${Date.now()}-${safeName}`;
  const fullPath = path.join(dir, fileName);
  await writeFile(fullPath, params.buffer);
  return { relativePath: path.join(params.organisationId, params.checkpointId, fileName) };
}

function resolveUploadPath(relativePath: string): string {
  const fullPath = path.join(UPLOAD_ROOT, relativePath);
  if (!fullPath.startsWith(UPLOAD_ROOT + path.sep)) throw new Error("Invalid file path.");
  return fullPath;
}

export async function readSubmissionFile(relativePath: string): Promise<Buffer> {
  return readFile(resolveUploadPath(relativePath));
}

/**
 * Submissions are only kept until a host has reviewed them — the PDF is
 * evidence for the review, not an archive. A file that's already gone is
 * treated as deleted, so this is safe to call repeatedly.
 */
export async function deleteSubmissionFile(relativePath: string): Promise<void> {
  try {
    await unlink(resolveUploadPath(relativePath));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

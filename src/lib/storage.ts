import "server-only";
import { mkdir, writeFile, readFile } from "node:fs/promises";
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

export async function readSubmissionFile(relativePath: string): Promise<Buffer> {
  const fullPath = path.join(UPLOAD_ROOT, relativePath);
  if (!fullPath.startsWith(UPLOAD_ROOT)) throw new Error("Invalid file path.");
  return readFile(fullPath);
}

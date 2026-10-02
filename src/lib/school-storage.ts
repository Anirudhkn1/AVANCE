import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// School files (timetables, announcement attachments) live in a private
// Supabase Storage bucket and are only ever handed out as short-lived signed
// URLs, after the page has checked the viewer belongs to that school/classroom.

const BUCKET = "school-files";
export const MAX_SCHOOL_FILE_BYTES = 5 * 1024 * 1024;
const PDF = ["application/pdf"];
const PDF_OR_IMAGE = [...PDF, "image/png", "image/jpeg", "image/webp"];

let bucketReady: Promise<void> | null = null;

function ensureBucket() {
  bucketReady ??= (async () => {
    const admin = createAdminClient();
    const { error } = await admin.storage.getBucket(BUCKET);
    if (!error) return;
    const created = await admin.storage.createBucket(BUCKET, { public: false });
    if (created.error && !/already exists/i.test(created.error.message)) {
      bucketReady = null;
      throw created.error;
    }
  })();
  return bucketReady;
}

/** Returns an error message, or null when the file is acceptable. */
export function checkSchoolFile(file: File, kind: "pdf" | "pdf-or-image"): string | null {
  if (file.size > MAX_SCHOOL_FILE_BYTES) return "File is too large (max 5MB).";
  const allowed = kind === "pdf" ? PDF : PDF_OR_IMAGE;
  if (!allowed.includes(file.type)) return kind === "pdf" ? "Please upload a PDF." : "Please upload a PDF or an image.";
  return null;
}

export async function uploadSchoolFile(prefix: string, file: File): Promise<string> {
  await ensureBucket();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80) || "file";
  const path = `${prefix}/${Date.now()}-${safeName}`;
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) throw error;
  return path;
}

export async function removeSchoolFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length === 0) return;
  await createAdminClient().storage.from(BUCKET).remove(list);
}

/** path -> signed URL (1 hour). Missing/failed paths are simply absent. */
export async function signSchoolFiles(paths: (string | null | undefined)[]) {
  const list = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const map = new Map<string, string>();
  if (list.length === 0) return map;
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrls(list, 3600);
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  }
  return map;
}

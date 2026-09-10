import "server-only";

/**
 * Extracts readable text from an uploaded assignment file (PRD §12).
 * Falls back gracefully — callers should let the host paste text manually
 * if extraction fails, per the reliability strategy in PRD §40.
 */
export async function extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text ?? "";
    } finally {
      await parser.destroy();
    }
  }

  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  // Plain text or unknown — best-effort decode.
  return buffer.toString("utf-8");
}

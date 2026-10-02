// A tiny hand-rolled PDF writer for the school demo's attachments (class
// timetables, circulars): text, lines and filled boxes in the built-in
// Helvetica fonts, ASCII only. Enough for a timetable grid or a one-page
// letter without adding a PDF library to the project for seed data.

type Rgb = [number, number, number];

function escapeText(text: string) {
  return text.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, "?");
}

const n = (v: number) => Number(v.toFixed(2));

export class PdfPage {
  readonly ops: string[] = [];

  constructor(
    readonly width = 595, // A4 portrait; pass 842, 595 for landscape
    readonly height = 842
  ) {}

  /** Rough Helvetica width — good enough to centre short labels. */
  static textWidth(text: string, size: number) {
    return text.length * size * 0.52;
  }

  text(x: number, y: number, text: string, { size = 11, bold = false, color = [0.1, 0.1, 0.15] as Rgb } = {}) {
    this.ops.push(`${color.map(n).join(" ")} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${n(x)} ${n(y)} Td (${escapeText(text)}) Tj ET`);
  }

  centered(cx: number, y: number, text: string, opts: { size?: number; bold?: boolean; color?: Rgb } = {}) {
    this.text(cx - PdfPage.textWidth(text, opts.size ?? 11) / 2, y, text, opts);
  }

  box(x: number, y: number, w: number, h: number, { fill, stroke = true }: { fill?: Rgb; stroke?: boolean } = {}) {
    if (fill) this.ops.push(`${fill.map(n).join(" ")} rg ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`);
    if (stroke) this.ops.push(`0.55 0.57 0.62 RG 0.6 w ${n(x)} ${n(y)} ${n(w)} ${n(h)} re S`);
  }

  line(x1: number, y1: number, x2: number, y2: number, width = 0.8) {
    this.ops.push(`0.35 0.33 0.75 RG ${width} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`);
  }

  /** Writes a paragraph wrapped to `maxChars`; returns the y below it. */
  paragraph(x: number, y: number, text: string, { size = 11, maxChars = 90, leading = 16 } = {}) {
    let line = "";
    for (const word of text.split(/\s+/)) {
      if (line && line.length + word.length + 1 > maxChars) {
        this.text(x, y, line, { size });
        y -= leading;
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) {
      this.text(x, y, line, { size });
      y -= leading;
    }
    return y;
  }
}

export function renderPdf(pages: PdfPage[]): Buffer {
  const objects: string[] = [];
  const pageIds = pages.map((_, i) => 5 + i * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((page, i) => {
    const id = pageIds[i];
    const content = page.ops.join("\n");
    objects[id] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id + 1} 0 R >>`;
    objects[id + 1] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(out, "latin1");
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

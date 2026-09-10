/**
 * Rule-based, reliable AI Quest Builder (PRD §11-12, §39-40).
 *
 * This is a deterministic, rule-based analyser — no external AI API call.
 * It is the documented fallback the PRD requires regardless of AI
 * availability ("If the AI API is unavailable, normal functionality must
 * continue"), and for this build it is the *only* engine, wired behind the
 * same seam a real model call would use later (see `analyseAssignment`).
 *
 * It NEVER auto-publishes: callers must always route the result through a
 * host-editable preview and an explicit approve/publish step.
 */

export interface ProposedCheckpoint {
  title: string;
  description: string;
  submissionRequired: boolean;
  source: "extracted" | "suggested";
}

export interface QuestProposal {
  title: string;
  description: string;
  requirements: string[]; // each tagged inline with its provenance
  extractedRequirements: string[];
  suggestedDeadline: string | null; // ISO date string, or null if not confidently found
  checkpoints: ProposedCheckpoint[];
  warnings: string[];
}

function clean(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function hasAny(haystack: string, needles: string[]) {
  return needles.some((n) => haystack.includes(n));
}

function guessTitle(raw: string): string {
  const explicit = raw.match(/^(?:title|assignment|project)\s*[:\-]\s*(.+)$/im);
  if (explicit?.[1]) return explicit[1].trim().slice(0, 120);

  const firstLine = raw
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 4 && l.length < 120);
  if (firstLine) return firstLine.replace(/^#+\s*/, "");

  const firstSentence = raw.split(/[.!\n]/).find((s) => s.trim().length > 4);
  return firstSentence ? firstSentence.trim().slice(0, 120) : "Untitled Assignment";
}

function extractRequirementLines(raw: string): string[] {
  const lines = raw.split("\n").map((l) => l.trim());
  const bulletish = lines.filter((l) =>
    /^([-*•]|\d+[.)])\s+/.test(l) || /\b(must|should|need to|required to|shall)\b/i.test(l)
  );
  const deduped = Array.from(new Set(bulletish.map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, ""))));
  return deduped.slice(0, 20);
}

function guessDeadline(raw: string): string | null {
  const patterns = [
    /(?:due|deadline|submit(?:ted)? by|due date)[^\n:.]{0,20}[:\-]?\s*([A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    /(?:due|deadline|submit(?:ted)? by|due date)[^\n:.]{0,20}[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m?.[1]) {
      const d = new Date(m[1]);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}

/**
 * Assembles a linear checkpoint sequence. Order mirrors the worked example
 * in prd.md §11: Understand -> Design -> Implement core -> (conditional
 * feature stages) -> Test -> (conditional docs) -> Final Submission.
 */
function buildCheckpoints(raw: string): ProposedCheckpoint[] {
  const lower = raw.toLowerCase();
  const checkpoints: ProposedCheckpoint[] = [];

  checkpoints.push({
    title: "Understand Requirements",
    description: "Read through the assignment, list all stated requirements and constraints, and confirm scope before writing any code.",
    submissionRequired: false,
    source: "suggested",
  });

  const wantsDesign = hasAny(lower, ["design", "architecture", "schema", "data structure", "erd", "diagram", "database"]);
  if (wantsDesign) {
    checkpoints.push({
      title: hasAny(lower, ["database", "schema"]) ? "Design (Data Model / Schema)" : "Design",
      description: "Produce the design artifacts called for by the assignment (data structures, schema, architecture, or diagrams) before implementation begins.",
      submissionRequired: true,
      source: "suggested",
    });
  }

  checkpoints.push({
    title: "Implementation (Core Functionality)",
    description: "Implement the core functionality described in the assignment.",
    submissionRequired: true,
    source: "suggested",
  });

  const wantsSearchSort = hasAny(lower, ["search"]) && hasAny(lower, ["sort"]);
  if (wantsSearchSort) {
    checkpoints.push({
      title: "Implement Searching & Sorting",
      description: "Implement and verify the searching and sorting functionality called for by the assignment.",
      submissionRequired: true,
      source: "suggested",
    });
  }

  const wantsUI = hasAny(lower, ["user interface", "ui ", " gui", "front-end", "frontend"]);
  if (wantsUI) {
    checkpoints.push({
      title: "Build the Interface",
      description: "Implement the user-facing interface described in the assignment.",
      submissionRequired: true,
      source: "suggested",
    });
  }

  const wantsTest = hasAny(lower, ["test", "testing", "validate", "validation", "edge case"]);
  if (wantsTest) {
    checkpoints.push({
      title: "Testing",
      description: "Test the system against the assignment's requirements and edge cases, and fix any defects found.",
      submissionRequired: true,
      source: "suggested",
    });
  }

  const wantsDocs = hasAny(lower, ["document", "report", "write-up", "writeup", "readme"]);
  if (wantsDocs) {
    checkpoints.push({
      title: "Documentation",
      description: "Write the documentation or report required by the assignment.",
      submissionRequired: true,
      source: "suggested",
    });
  }

  checkpoints.push({
    title: "Final Submission",
    description: "Submit the completed work for grading/verification.",
    submissionRequired: true,
    source: "suggested",
  });

  return checkpoints;
}

export function analyseAssignment(rawText: string): QuestProposal {
  const raw = clean(rawText);
  const warnings: string[] = [];

  if (raw.length < 20) {
    warnings.push("The provided text is very short — the proposal below is a generic fallback. Please review every field carefully.");
  }

  const title = guessTitle(raw);
  const extractedRequirements = extractRequirementLines(raw);
  const suggestedDeadline = guessDeadline(raw);
  if (!suggestedDeadline) {
    warnings.push("No clear deadline was found in the source text — set one manually before publishing.");
  }

  const checkpoints = buildCheckpoints(raw);

  const description =
    raw.length > 400 ? raw.slice(0, 400).trim() + "…" : raw || "No description extracted — please write one.";

  return {
    title,
    description,
    requirements: extractedRequirements.length > 0 ? extractedRequirements : ["No explicit requirement bullets were detected — please add them manually."],
    extractedRequirements,
    suggestedDeadline,
    checkpoints,
    warnings,
  };
}

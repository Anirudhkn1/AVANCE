"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  analyzeAssignmentTextAction,
  analyzeAssignmentFileAction,
  publishProjectAction,
  type PublishProjectInput,
} from "@/actions/projects";
import type { QuestProposal } from "@/lib/questBuilder";
import type { SourceType } from "@/lib/constants";
import { Card, SectionHeading, Button, Badge, EmptyState } from "@/components/ui";

interface EditableCheckpoint {
  title: string;
  description: string;
  submissionRequired: boolean;
  xpValue: number;
  source: "extracted" | "suggested";
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function QuestBuilderWizard({ orgId, groupId }: { orgId: string; groupId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "review">("input");
  const [mode, setMode] = useState<"text" | "file">("text");
  const [rawText, setRawText] = useState("");
  const [analyzing, startAnalyzing] = useTransition();
  const [publishing, startPublishing] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState<SourceType>("TEXT");
  const [sourceExcerpt, setSourceExcerpt] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [deadline, setDeadline] = useState(() => toDatetimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
  const [verificationMode, setVerificationMode] = useState<"AUTO" | "HOST_APPROVAL">("AUTO");
  const [checkpoints, setCheckpoints] = useState<EditableCheckpoint[]>([]);
  const [aiGenerated, setAiGenerated] = useState(false);

  function loadProposal(proposal: QuestProposal, source: SourceType, excerpt: string) {
    setSourceType(source);
    setSourceExcerpt(excerpt.slice(0, 4000));
    setWarnings(proposal.warnings);
    setTitle(proposal.title);
    setDescription(proposal.description);
    setRequirements(proposal.requirements);
    if (proposal.suggestedDeadline) setDeadline(toDatetimeLocal(new Date(proposal.suggestedDeadline)));
    setCheckpoints(
      proposal.checkpoints.map((c) => ({
        title: c.title,
        description: c.description,
        submissionRequired: c.submissionRequired,
        xpValue: 10,
        source: c.source,
      }))
    );
    setAiGenerated(true);
    setStep("review");
  }

  function handleAnalyzeText() {
    setError(null);
    startAnalyzing(async () => {
      const res = await analyzeAssignmentTextAction(groupId, rawText);
      if (!res.ok) return setError(res.error);
      loadProposal(res.proposal, res.sourceType, rawText);
    });
  }

  function handleAnalyzeFile(file: File) {
    setError(null);
    startAnalyzing(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const res = await analyzeAssignmentFileAction(groupId, fd);
      if (!res.ok) return setError(res.error);
      loadProposal(res.proposal, res.sourceType, res.extractedText);
    });
  }

  function startManual() {
    setSourceType("MANUAL");
    setSourceExcerpt("");
    setWarnings([]);
    setTitle("");
    setDescription("");
    setRequirements([]);
    setCheckpoints([
      { title: "Understand Requirements", description: "", submissionRequired: false, xpValue: 10, source: "suggested" },
      { title: "Final Submission", description: "", submissionRequired: true, xpValue: 10, source: "suggested" },
    ]);
    setAiGenerated(false);
    setStep("review");
  }

  function updateCheckpoint(idx: number, patch: Partial<EditableCheckpoint>) {
    setCheckpoints((cps) => cps.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function removeCheckpoint(idx: number) {
    setCheckpoints((cps) => cps.filter((_, i) => i !== idx));
  }

  function moveCheckpoint(idx: number, dir: -1 | 1) {
    setCheckpoints((cps) => {
      const next = [...cps];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return cps;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function addCheckpoint() {
    setCheckpoints((cps) => [
      ...cps,
      { title: "New checkpoint", description: "", submissionRequired: true, xpValue: 10, source: "suggested" },
    ]);
  }

  function updateRequirement(idx: number, value: string) {
    setRequirements((r) => r.map((v, i) => (i === idx ? value : v)));
  }
  function removeRequirement(idx: number) {
    setRequirements((r) => r.filter((_, i) => i !== idx));
  }

  function handlePublish() {
    setError(null);
    const input: PublishProjectInput = {
      groupId,
      title: title.trim(),
      description: description.trim(),
      requirements: requirements.map((r) => r.trim()).filter(Boolean),
      deadline: new Date(deadline).toISOString(),
      verificationMode,
      aiGenerated,
      sourceType,
      sourceExcerpt,
      checkpoints: checkpoints.map((c) => ({
        title: c.title.trim(),
        description: c.description.trim(),
        submissionRequired: c.submissionRequired,
        xpValue: c.xpValue,
      })),
    };
    if (!input.title) return setError("Give the project a title.");
    if (input.checkpoints.length === 0) return setError("Add at least one checkpoint.");

    startPublishing(async () => {
      const res = await publishProjectAction(input);
      if (!res.ok) return setError(res.error);
      router.push(`/organisations/${orgId}/groups/${groupId}/projects/${res.projectId}`);
    });
  }

  if (step === "input") {
    return (
      <Card className="space-y-5">
        <div className="flex gap-2">
          <Button variant={mode === "text" ? "primary" : "secondary"} size="sm" onClick={() => setMode("text")}>
            Paste text
          </Button>
          <Button variant={mode === "file" ? "primary" : "secondary"} size="sm" onClick={() => setMode("file")}>
            Upload PDF / DOCX
          </Button>
        </div>

        {mode === "text" ? (
          <div className="space-y-3">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
              placeholder="Paste the assignment text here, e.g. &quot;Build a C banking management system with account creation, deletion, searching, sorting and testing.&quot;"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <Button onClick={handleAnalyzeText} disabled={analyzing || rawText.trim().length === 0}>
              {analyzing ? "Analyzing…" : "Analyze assignment"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAnalyzeFile(file);
              }}
              disabled={analyzing}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:text-accent file:px-3 file:py-1.5"
            />
            {analyzing && <p className="text-sm text-muted">Extracting and analyzing…</p>}
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="pt-2 border-t border-border">
          <button onClick={startManual} className="text-sm text-muted hover:text-foreground underline">
            Skip AI and build this project manually instead
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {aiGenerated && (
        <Card className="bg-accent-soft border-accent/30">
          <div className="flex items-start gap-3">
            <Badge tone="accent">AI-generated</Badge>
            <p className="text-sm text-muted">
              Review and edit everything below — nothing was published automatically. Fields the AI could not
              confidently extract are marked as suggestions, not confirmed facts.
            </p>
          </div>
          {warnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-warning">
              {warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="space-y-4">
        <SectionHeading title="Project details" />
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Requirements</label>
          <div className="space-y-2">
            {requirements.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={r}
                  onChange={(e) => updateRequirement(i, e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
                <Button variant="ghost" size="sm" onClick={() => removeRequirement(i)}>✕</Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setRequirements((r) => [...r, ""])}>
              + Add requirement
            </Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Verification</label>
            <select
              value={verificationMode}
              onChange={(e) => setVerificationMode(e.target.value as "AUTO" | "HOST_APPROVAL")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="AUTO">Automatic — completes on upload</option>
              <option value="HOST_APPROVAL">Host approval required</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <SectionHeading title="Checkpoints" subtitle="Linear progression — students complete these in order." />
        {checkpoints.length === 0 && <EmptyState title="No checkpoints yet" />}
        <div className="space-y-3">
          {checkpoints.map((cp, i) => (
            <div key={i} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted w-6">{i + 1}.</span>
                <input
                  value={cp.title}
                  onChange={(e) => updateCheckpoint(i, { title: e.target.value })}
                  className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-accent"
                />
                {cp.source === "extracted" ? (
                  <Badge tone="accent">extracted</Badge>
                ) : (
                  <Badge tone="neutral">suggested</Badge>
                )}
                <button onClick={() => moveCheckpoint(i, -1)} disabled={i === 0} className="text-muted hover:text-foreground disabled:opacity-30 px-1">↑</button>
                <button onClick={() => moveCheckpoint(i, 1)} disabled={i === checkpoints.length - 1} className="text-muted hover:text-foreground disabled:opacity-30 px-1">↓</button>
                <button onClick={() => removeCheckpoint(i)} className="text-danger hover:opacity-70 px-1">✕</button>
              </div>
              <textarea
                value={cp.description}
                onChange={(e) => updateCheckpoint(i, { description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={cp.submissionRequired}
                    onChange={(e) => updateCheckpoint(i, { submissionRequired: e.target.checked })}
                  />
                  Requires PDF submission
                </label>
                <label className="flex items-center gap-1.5">
                  XP:
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={cp.xpValue}
                    onChange={(e) => updateCheckpoint(i, { xpValue: Number(e.target.value) })}
                    className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={addCheckpoint}>+ Add checkpoint</Button>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep("input")} disabled={publishing}>
          ← Back
        </Button>
        <Button onClick={handlePublish} disabled={publishing} className="flex-1">
          {publishing ? "Publishing…" : "Approve & Publish"}
        </Button>
      </div>
    </div>
  );
}

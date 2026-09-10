"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitCheckpointAction, markCheckpointCompleteAction, reviewSubmissionAction } from "@/actions/checkpoints";
import { Button } from "@/components/ui";

export function SubmitCheckpointForm({ checkpointId }: { checkpointId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!file) return setError("Choose a PDF first.");
        setError(null);
        const fd = new FormData();
        fd.set("file", file);
        startTransition(async () => {
          const res = await submitCheckpointAction(checkpointId, fd);
          if (!res.ok) return setError(res.error);
          router.refresh();
        });
      }}
      className="space-y-3"
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:text-accent file:px-3 file:py-1.5"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending || !file}>
        {pending ? "Uploading…" : "Submit for review"}
      </Button>
    </form>
  );
}

export function MarkCompleteButton({ checkpointId }: { checkpointId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await markCheckpointCompleteAction(checkpointId);
            if (!res.ok) return setError(res.error);
            router.refresh();
          })
        }
      >
        {pending ? "Marking complete…" : "Mark complete"}
      </Button>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </div>
  );
}

export function ReviewSubmissionActions({ submissionId }: { submissionId: string }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function decide(decision: "APPROVED" | "REJECTED") {
    setError(null);
    startTransition(async () => {
      const res = await reviewSubmissionAction(submissionId, decision, reason || undefined);
      if (!res.ok) return setError(res.error);
      setRejecting(false);
      router.refresh();
    });
  }

  if (rejecting) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejecting"
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
        />
        <Button size="sm" variant="danger" disabled={pending} onClick={() => decide("REJECTED")}>
          Confirm
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
          Cancel
        </Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => decide("APPROVED")}>
        Approve
      </Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => setRejecting(true)}>
        Reject
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

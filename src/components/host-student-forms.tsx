"use client";

import { useActionState, useState, useTransition } from "react";
import { createInterventionAction } from "@/actions/interventions";
import { adjustFairPlayAction } from "@/actions/fairplay";
import { INTERVENTION_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui";

export function InterventionForm({ organisationId, studentId }: { organisationId: string; studentId: string }) {
  const action = createInterventionAction.bind(null, organisationId, studentId);
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <select
        name="type"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        {INTERVENTION_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <textarea
        name="note"
        required
        rows={2}
        placeholder="What's the plan? e.g. Reminder about the Testing checkpoint."
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Sending…" : "Take action"}
      </Button>
    </form>
  );
}

export function FairPlayForm({ organisationId, membershipId }: { organisationId: string; membershipId: string }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
          className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required, auditable)"
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <Button
          size="sm"
          disabled={pending || delta === 0}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await adjustFairPlayAction(organisationId, membershipId, { delta, reason });
              if (!res.ok) return setError(res.error);
              setDelta(0);
              setReason("");
            })
          }
        >
          Apply
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

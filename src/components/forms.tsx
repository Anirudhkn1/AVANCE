"use client";

import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui";

type FormAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

/** Small reusable wrapper for a form whose action returns an error string (or undefined on success/redirect). */
export function SubmitForm({
  action,
  children,
  submitLabel,
  className = "space-y-3",
}: {
  action: FormAction;
  children: ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Working…" : submitLabel}
      </Button>
    </form>
  );
}

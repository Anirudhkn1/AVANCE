"use client";

import { useState, type ReactNode } from "react";
import { createOrganisationAction, joinOrganisationAction } from "@/actions/organisations";
import { DesktopIconButton } from "@/components/desktop-icon";
import { SubmitForm } from "@/components/forms";

type Mode = "join" | "create" | null;

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Front-facing Join/Create organisation icons — these are desktop tiles, not
 *  content buried inside another page. Each opens a small modal wrapping the
 *  existing server actions. */
export function OrgQuickActions() {
  const [mode, setMode] = useState<Mode>(null);

  return (
    <>
      <DesktopIconButton
        onClick={() => setMode("join")}
        icon="🔑"
        label="Join Organisation"
        glyphClassName="bg-success-soft"
      />
      <DesktopIconButton
        onClick={() => setMode("create")}
        icon="🏗️"
        label="Create Organisation"
        glyphClassName="bg-warning-soft"
      />

      {mode === "join" && (
        <Modal title="Join with a code" subtitle="Get this from your organisation head or host." onClose={() => setMode(null)}>
          <SubmitForm action={joinOrganisationAction} submitLabel="Join organisation">
            <input
              name="code"
              placeholder="e.g. CSEA-2025"
              required
              autoFocus
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent uppercase"
            />
          </SubmitForm>
        </Modal>
      )}

      {mode === "create" && (
        <Modal title="Create an organisation" subtitle="You'll become its Organisation Head." onClose={() => setMode(null)}>
          <SubmitForm action={createOrganisationAction} submitLabel="Create organisation">
            <input
              name="name"
              placeholder="e.g. CSE-A"
              required
              autoFocus
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </SubmitForm>
        </Modal>
      )}
    </>
  );
}

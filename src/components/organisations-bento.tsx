"use client";

import { useState } from "react";
import { createOrganisationAction, joinOrganisationAction } from "@/actions/organisations";
import { SubmitForm } from "@/components/forms";
import { Modal } from "@/components/modal";
import { orgTone, ROLE_LABEL } from "@/components/desktop-icon";
import MagicBento from "@/components/MagicBento";
import type { OrgRole } from "@/lib/constants";

type Membership = {
  id: string;
  organisationId: string;
  // Prisma's generated type for this field is a plain string, not the
  // narrower OrgRole union the app uses elsewhere — cast at the read site
  // below, same as desktop-icon.tsx's OrgDesktopIcon did.
  role: string;
  organisation: { name: string };
};

// rgb() triples matching the tone classes in orgTone() / src/app/globals.css,
// so each org card's glow/spotlight/particle color matches its badge color.
const TONE_GLOW: Record<string, string> = {
  accent: "88, 80, 236",
  success: "22, 163, 74",
  warning: "217, 119, 6",
  danger: "220, 38, 38",
};

function glowForTone(tone: string) {
  const name = /bg-(\w+)-soft/.exec(tone)?.[1] ?? "accent";
  return TONE_GLOW[name] ?? TONE_GLOW.accent;
}

type Mode = "join" | "create" | null;

/** Organisations section of the dashboard: membership tiles plus the
 *  Join/Create actions, all rendered through MagicBento so they get the
 *  same spotlight/glow/particle treatment as the Tools section below it. */
export function OrganisationsBento({ memberships }: { memberships: Membership[] }) {
  const [mode, setMode] = useState<Mode>(null);

  const orgItems = memberships.map((m) => {
    const tone = orgTone(m.organisation.name);
    return {
      id: m.id,
      href: `/organisations/${m.organisationId}`,
      icon: m.organisation.name.trim().charAt(0).toUpperCase() || "?",
      label: m.organisation.name,
      description: ROLE_LABEL[m.role as OrgRole],
      glyphClassName: `font-bold ${tone}`,
      glowColor: glowForTone(tone),
    };
  });

  const actionItems = [
    {
      id: "join",
      onClick: () => setMode("join"),
      icon: "🔑",
      label: "Join Organisation",
      glyphClassName: "bg-success-soft",
      glowColor: TONE_GLOW.success,
    },
    {
      id: "create",
      onClick: () => setMode("create"),
      icon: "🏗️",
      label: "Create Organisation",
      glyphClassName: "bg-warning-soft",
      glowColor: TONE_GLOW.warning,
    },
  ];

  const placeholderItems = [
    { id: "placeholder-1", disabled: true, icon: "✨", label: "More coming soon", glyphClassName: "bg-surface-muted" },
    { id: "placeholder-2", disabled: true, icon: "✨", label: "More coming soon", glyphClassName: "bg-surface-muted" },
  ];

  return (
    <>
      <MagicBento
        items={[...orgItems, ...actionItems, ...placeholderItems]}
        textAutoHide
        enableStars
        enableSpotlight
        enableBorderGlow
        enableTilt
        enableMagnetism
        clickEffect
        spotlightRadius={500}
        particleCount={10}
        glowColor="88, 80, 236"
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

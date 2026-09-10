"use client";

import { useState, useTransition } from "react";
import { setMemberRoleAction } from "@/actions/organisations";
import type { OrgRole } from "@/lib/constants";

export function RoleControls({
  organisationId,
  membershipId,
  currentRole,
  isSelf,
}: {
  organisationId: string;
  membershipId: string;
  currentRole: string;
  isSelf: boolean;
}) {
  const [role, setRole] = useState(currentRole);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isSelf) {
    return <span className="text-xs text-muted">{currentRole} (you)</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as OrgRole;
          setRole(next);
          setError(null);
          startTransition(async () => {
            const res = await setMemberRoleAction(organisationId, membershipId, next);
            if (!res.ok) {
              setError(res.error ?? "Could not update role.");
              setRole(currentRole);
            }
          });
        }}
        className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="STUDENT">STUDENT</option>
        <option value="HOST">HOST</option>
        <option value="HEAD">HEAD</option>
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

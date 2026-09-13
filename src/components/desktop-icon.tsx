import Link from "next/link";
import type { ReactNode } from "react";
import type { OrgRole } from "@/lib/constants";

const TILE_SHELL =
  "flex h-full flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-sm transition-transform animate-icon-pop hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md active:translate-y-0";

function Glyph({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${className}`}>
      {children}
    </span>
  );
}

export function DesktopIconLink({
  href,
  icon,
  label,
  sublabel,
  glyphClassName = "bg-accent-soft",
}: {
  href: string;
  icon: ReactNode;
  label: string;
  sublabel?: string;
  glyphClassName?: string;
}) {
  return (
    <Link href={href} className="block h-full">
      <div className={TILE_SHELL}>
        <Glyph className={glyphClassName}>{icon}</Glyph>
        <span className="text-sm font-medium leading-tight">{label}</span>
        {sublabel && <span className="text-xs text-muted">{sublabel}</span>}
      </div>
    </Link>
  );
}

export function DesktopIconButton({
  onClick,
  icon,
  label,
  sublabel,
  glyphClassName = "bg-accent-soft",
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  sublabel?: string;
  glyphClassName?: string;
}) {
  return (
    <button type="button" onClick={onClick} className="block h-full w-full text-left">
      <div className={TILE_SHELL}>
        <Glyph className={glyphClassName}>{icon}</Glyph>
        <span className="text-sm font-medium leading-tight">{label}</span>
        {sublabel && <span className="text-xs text-muted">{sublabel}</span>}
      </div>
    </button>
  );
}

export function DesktopIconPlaceholder({ label = "More coming soon" }: { label?: string }) {
  return (
    <div className="flex h-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-4 text-center opacity-60">
      <Glyph className="bg-surface-muted">✨</Glyph>
      <span className="text-sm font-medium text-muted leading-tight">{label}</span>
    </div>
  );
}

const ORG_TONES = [
  "bg-accent-soft text-accent",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
  "bg-danger-soft text-danger",
];

export function orgTone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ORG_TONES[hash % ORG_TONES.length];
}

export const ROLE_LABEL: Record<OrgRole, string> = { HEAD: "Head", HOST: "Host", STUDENT: "Student" };

export function OrgDesktopIcon({ orgId, name, role }: { orgId: string; name: string; role: OrgRole }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <Link href={`/organisations/${orgId}`} className="block h-full">
      <div className={TILE_SHELL}>
        <Glyph className={`font-bold ${orgTone(name)}`}>{initial}</Glyph>
        <span className="text-sm font-medium leading-tight truncate max-w-full w-full">{name}</span>
        <span className="text-xs text-muted">{ROLE_LABEL[role]}</span>
      </div>
    </Link>
  );
}

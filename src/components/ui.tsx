import type { ReactNode } from "react";
import Link from "next/link";
import type { RiskLevel } from "@/lib/constants";
import { riskEmoji, riskLabel } from "@/lib/risk";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface shadow-sm ${padded ? "p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-accent text-accent-foreground hover:opacity-90",
    secondary: "bg-surface-muted text-foreground hover:bg-border",
    ghost: "text-foreground hover:bg-surface-muted",
    danger: "bg-danger text-white hover:opacity-90",
  };
  return (
    <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-accent text-accent-foreground hover:opacity-90",
    secondary: "bg-surface-muted text-foreground hover:bg-border",
    ghost: "text-foreground hover:bg-surface-muted",
  };
  return (
    <Link href={href} className={`${base} ${sizes} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-muted text-muted",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const tone = level === "ON_TRACK" ? "success" : level === "AT_RISK" ? "warning" : "danger";
  return (
    <Badge tone={tone}>
      {riskEmoji(level)} {riskLabel(level)}
    </Badge>
  );
}

export function ProgressBar({
  percent,
  tone = "accent",
  className = "",
}: {
  percent: number;
  tone?: "accent" | "success" | "warning" | "danger";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const colors: Record<string, string> = {
    accent: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };
  return (
    <div className={`h-2 w-full rounded-full bg-surface-muted overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${colors[tone]} transition-[width]`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Fallback UI for route navigation (src/app/loading.tsx and any nested
// loading.tsx). Centered in whatever Suspense boundary swaps it in, so it
// reads as "the middle of the screen" whichever page is loading — instant,
// visible feedback that a click registered while the next page streams in.
export function PageLoader() {
  return (
    <div
      className="flex flex-1 min-h-[60vh] w-full items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-3">
        <span className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-accent-soft" />
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-loader-spin" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent animate-loader-pulse" />
        </span>
        <span className="text-sm text-muted">Loading…</span>
      </div>
    </div>
  );
}

export function Avatar({ seed, size = "md" }: { seed: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-6 w-6 text-sm", md: "h-9 w-9 text-lg", lg: "h-14 w-14 text-3xl" };
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-accent-soft ${sizes[size]}`}
      aria-hidden
    >
      {seed}
    </div>
  );
}

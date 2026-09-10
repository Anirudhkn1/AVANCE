import type { RiskLevel } from "@/lib/constants";

/**
 * Risk / deadline-health scoring (PRD §17-18).
 *
 * Deliberately built only from objective platform data — checkpoint
 * completion, time remaining, deadlines — never from screen/keyboard/device
 * monitoring, and it never infers motive ("procrastinating"), only progress
 * ("progress may require attention").
 */

export interface RiskInput {
  completed: number;
  total: number;
  startedAt: Date; // project publishedAt (or createdAt as fallback)
  deadline: Date;
  now?: Date;
  lastActivityAt?: Date | null;
}

export interface RiskResult {
  level: RiskLevel;
  actualPct: number;
  expectedPct: number;
  gap: number;
  message: string;
}

export function computeRisk(input: RiskInput): RiskResult {
  const now = input.now ?? new Date();
  const total = Math.max(input.total, 0);
  const actualPct = total === 0 ? 0 : Math.round((input.completed / total) * 100);

  const totalMs = Math.max(input.deadline.getTime() - input.startedAt.getTime(), 1);
  const elapsedMs = Math.min(Math.max(now.getTime() - input.startedAt.getTime(), 0), totalMs);
  const expectedPct = Math.round((elapsedMs / totalMs) * 100);
  const gap = expectedPct - actualPct;
  const pastDeadline = now.getTime() > input.deadline.getTime();
  const inactiveDays = input.lastActivityAt
    ? (now.getTime() - input.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  let level: RiskLevel = "ON_TRACK";
  let message = "Progress is aligned with the remaining time.";

  if (total > 0 && actualPct >= 100) {
    level = "ON_TRACK";
    message = "All checkpoints complete.";
  } else if (pastDeadline) {
    level = "CRITICAL";
    message = "The deadline has passed with checkpoints still incomplete.";
  } else if (input.completed === 0 && expectedPct >= 40) {
    level = "CRITICAL";
    message = "No checkpoints completed yet with under-average time remaining.";
  } else if (gap > 30 || inactiveDays >= 5) {
    level = "CRITICAL";
    message = inactiveDays >= 5
      ? "No project activity in the last 5+ days."
      : "Progress may require attention — well behind the expected pace.";
  } else if (gap > 10 || inactiveDays >= 3) {
    level = "AT_RISK";
    message = "Progress is trailing the expected pace.";
  }

  return { level, actualPct, expectedPct, gap, message };
}

export function riskLabel(level: RiskLevel) {
  switch (level) {
    case "ON_TRACK":
      return "On Track";
    case "AT_RISK":
      return "At Risk";
    case "CRITICAL":
      return "Critical";
  }
}

export function riskEmoji(level: RiskLevel) {
  switch (level) {
    case "ON_TRACK":
      return "🟢";
    case "AT_RISK":
      return "🟡";
    case "CRITICAL":
      return "🔴";
  }
}

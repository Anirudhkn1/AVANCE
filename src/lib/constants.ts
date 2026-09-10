// Shared union types for the string-backed "enum" columns in schema.prisma
// (SQLite has no native enum support in Prisma). Validate against these
// before writing, since the database itself won't enforce them.

export const ORG_ROLES = ["HEAD", "HOST", "STUDENT"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const PROJECT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const VERIFICATION_MODES = ["AUTO", "HOST_APPROVAL"] as const;
export type VerificationMode = (typeof VERIFICATION_MODES)[number];

export const SOURCE_TYPES = ["PDF", "DOCX", "TEXT", "MANUAL"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SUBMISSION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const ACTIVITY_TYPES = [
  "CHECKPOINT_COMPLETED",
  "PROJECT_COMPLETED",
  "STREAK_MILESTONE",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const HABIT_FREQUENCIES = ["DAILY", "WEEKLY"] as const;
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];

export const NOTIFICATION_TYPES = [
  "DEADLINE_REMINDER",
  "PROGRESS_REMINDER",
  "HOST_ALERT",
  "VERIFICATION",
  "REACTION",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const INTERVENTION_TYPES = [
  "REMINDER",
  "MESSAGE",
  "SUPPORT_MATERIAL",
  "DEADLINE_EXTENSION",
  "CONTACT",
] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const RISK_LEVELS = ["ON_TRACK", "AT_RISK", "CRITICAL"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

// Checkpoint difficulty -> XP mapping. Configurable, not hard-coded into the
// schema (PRD §23) — this is just the MVP default table.
export const DIFFICULTY_XP = {
  EASY: 10,
  MEDIUM: 25,
  HARD: 50,
} as const;
export type Difficulty = keyof typeof DIFFICULTY_XP;

export const REACTION_EMOJIS = ["👍", "🔥", "🎉", "💪"] as const;

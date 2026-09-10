// Focus Mode — pure helpers for turning a list of FocusSession rows into the
// daily/weekly totals shown on /focus. No DB access here (see src/actions/focus.ts).

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Week starts Monday.
function startOfWeek(d: Date) {
  const day = d.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  const start = startOfDay(d);
  start.setDate(start.getDate() - diff);
  return start;
}

type FocusSessionLike = { startedAt: Date; actualSeconds: number };

export function summarizeFocusSessions(sessions: FocusSessionLike[], now: Date = new Date()) {
  const today = startOfDay(now);
  const weekStart = startOfWeek(now);

  let todaySeconds = 0;
  let weekSeconds = 0;
  const byDay = new Map<string, number>();

  for (const s of sessions) {
    const day = startOfDay(s.startedAt);
    const key = day.toDateString();
    byDay.set(key, (byDay.get(key) ?? 0) + s.actualSeconds);

    if (day.getTime() === today.getTime()) todaySeconds += s.actualSeconds;
    if (day.getTime() >= weekStart.getTime()) weekSeconds += s.actualSeconds;
  }

  return { todaySeconds, weekSeconds, byDay };
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
  return `${secs}s`;
}

export const FOCUS_PRESETS_MINUTES = [25, 45, 60] as const;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Consecutive-day streak ending today or yesterday (a miss today doesn't zero it until tomorrow). */
export function computeHabitStreak(completionDates: Date[], now: Date = new Date()): number {
  const days = new Set(completionDates.map(dayKey));
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

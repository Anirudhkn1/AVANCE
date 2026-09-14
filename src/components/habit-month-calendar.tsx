"use client";

import { useMemo, useState } from "react";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${month}-${day}`;
}

/**
 * Collapsed-by-default month calendar showing which days a habit was
 * completed, with prev/next navigation through past months (can't navigate
 * past the current month — there's nothing to show yet). Takes completion
 * dates as ISO strings rather than Date objects — habits/page.tsx already
 * fetches every completion for the streak calculation, so no extra query.
 */
export function HabitMonthCalendar({ completionDates }: { completionDates: string[] }) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const completedDays = useMemo(() => {
    const set = new Set<string>();
    for (const iso of completionDates) {
      const d = new Date(iso);
      set.add(dateKey(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    return set;
  }, [completionDates]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const completedCount = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter((day) =>
    completedDays.has(dateKey(viewYear, viewMonth, day))
  ).length;

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-muted hover:text-foreground"
      >
        {open ? "▴ Hide history" : "▾ History"}
      </button>

      {open && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="text-xs text-muted hover:text-foreground px-1.5 py-0.5 rounded hover:bg-surface-muted"
              aria-label="Previous month"
            >
              ←
            </button>
            <p className="text-xs font-medium text-muted">
              {monthLabel} <span className="text-foreground">· {completedCount}/{daysInMonth}</span>
            </p>
            <button
              type="button"
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className="text-xs text-muted hover:text-foreground px-1.5 py-0.5 rounded hover:bg-surface-muted disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Next month"
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} className="text-center text-[10px] text-muted">
                {label}
              </div>
            ))}
            {Array.from({ length: startWeekday }, (_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const done = completedDays.has(dateKey(viewYear, viewMonth, day));
              const isToday = isCurrentMonth && day === today.getDate();
              return (
                <div
                  key={day}
                  title={done ? "Completed" : undefined}
                  className={`aspect-square flex items-center justify-center rounded-md text-[11px] ${
                    done ? "bg-accent text-accent-foreground font-medium" : "bg-surface-muted text-muted"
                  } ${isToday ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

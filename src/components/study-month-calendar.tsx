"use client";

import { useMemo, useState } from "react";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${month}-${day}`;
}

/**
 * Month calendar showing how many cards are due each day — the in-app
 * stand-in for a synced Google Calendar (mirrors HabitMonthCalendar's look).
 * Unlike habit history, this looks forward as often as back, since upcoming
 * due dates are the point, so both directions of navigation are open.
 */
export function StudyMonthCalendar({ dueDatesByDay }: { dueDatesByDay: Record<string, number> }) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="text-xs text-muted hover:text-foreground px-1.5 py-0.5 rounded hover:bg-surface-muted"
          aria-label="Previous month"
        >
          ←
        </button>
        <p className="text-xs font-medium text-muted">{monthLabel}</p>
        <button
          type="button"
          onClick={goToNextMonth}
          className="text-xs text-muted hover:text-foreground px-1.5 py-0.5 rounded hover:bg-surface-muted"
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
          const due = dueDatesByDay[dateKey(viewYear, viewMonth, day)] ?? 0;
          const isToday = isCurrentMonth && day === today.getDate();
          return (
            <div
              key={day}
              title={due > 0 ? `${due} card${due === 1 ? "" : "s"} due` : undefined}
              className={`aspect-square flex flex-col items-center justify-center rounded-md text-[11px] ${
                due > 0 ? "bg-accent text-accent-foreground font-medium" : "bg-surface-muted text-muted"
              } ${isToday ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""}`}
            >
              <span>{day}</span>
              {due > 0 && <span className="text-[9px] leading-none">{due}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

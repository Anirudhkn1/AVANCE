"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startFocusSessionAction, endFocusSessionAction } from "@/actions/focus";
import { Button } from "@/components/ui";
import { FOCUS_PRESETS_MINUTES, formatDuration } from "@/lib/focus";

type RunningSession = {
  sessionId: string;
  targetSeconds: number;
  startedAtMs: number;
};

export function FocusTimer() {
  const router = useRouter();
  const [customMinutes, setCustomMinutes] = useState("");
  const [running, setRunning] = useState<RunningSession | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const finishingRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - running.startedAtMs) / 1000);
      setRemaining(Math.max(0, running.targetSeconds - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && remaining === 0 && !finishingRef.current) {
      finishingRef.current = true;
      void finish(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running]);

  async function start(targetMinutes: number) {
    setError(undefined);
    const targetSeconds = Math.round(targetMinutes * 60);
    setBusy(true);
    const res = await startFocusSessionAction(targetSeconds);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    finishingRef.current = false;
    setRunning({ sessionId: res.sessionId, targetSeconds, startedAtMs: Date.now() });
    setRemaining(targetSeconds);
  }

  async function finish(completed: boolean) {
    if (!running) return;
    const elapsed = Math.floor((Date.now() - running.startedAtMs) / 1000);
    setBusy(true);
    await endFocusSessionAction(running.sessionId, elapsed, completed);
    setBusy(false);
    setRunning(null);
    setRemaining(0);
    router.refresh();
  }

  if (running) {
    const pct = Math.round(((running.targetSeconds - remaining) / running.targetSeconds) * 100);
    return (
      <div className="flex flex-col items-center gap-6 py-6">
        <div className="text-5xl sm:text-6xl font-semibold tabular-nums tracking-tight">
          {formatDuration(remaining)}
        </div>
        <div className="h-2 w-full max-w-xs rounded-full bg-surface-muted overflow-hidden">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-muted">Stay with it — leaving this page won&apos;t stop the clock, but closing the tab will.</p>
        <Button variant="secondary" disabled={busy} onClick={() => finish(false)}>
          {busy ? "Saving…" : "Stop session"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FOCUS_PRESETS_MINUTES.map((m) => (
          <Button key={m} variant="secondary" disabled={busy} onClick={() => start(m)}>
            {m} min
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={240}
          value={customMinutes}
          onChange={(e) => setCustomMinutes(e.target.value)}
          placeholder="Custom minutes"
          className="w-36 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <Button
          disabled={busy || !customMinutes || Number(customMinutes) <= 0}
          onClick={() => start(Number(customMinutes))}
        >
          Start
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

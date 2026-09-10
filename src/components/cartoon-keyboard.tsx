"use client";

// A small decorative "cartoon keyboard" mascot that bounces and lights up a
// key whenever the user types in a nearby field — pure CSS/emoji, no assets.

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];
const KEY_COUNT = ROWS.reduce((s, r) => s + r.length, 0);
// Cumulative key count before each row, computed once at module load, so
// rendering never has to mutate a running counter.
const ROW_OFFSETS = ROWS.reduce<number[]>((offsets, row, i) => {
  offsets.push(i === 0 ? 0 : offsets[i - 1] + ROWS[i - 1].length);
  return offsets;
}, []);

export type KeyActivity = { nonce: number } | null;

export function CartoonKeyboard({ activity }: { activity: KeyActivity }) {
  const activeFlatIndex = activity ? activity.nonce % KEY_COUNT : -1;

  return (
    <div aria-hidden className="flex flex-col items-center gap-1.5 select-none">
      {/* remounting on nonce change restarts the CSS bounce animation */}
      <div key={activity?.nonce ?? "idle"} className="flex flex-col items-center gap-1.5 animate-kbd-bounce">
        <div className="flex gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/70" />
        </div>
        <div className={`h-1 rounded-full bg-foreground/50 transition-all duration-150 ${activity ? "w-6" : "w-3.5"}`} />

        <div className="mt-1 rounded-xl border-2 border-border bg-surface px-2 py-2 shadow-sm">
          {ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1 mb-1 last:mb-0" style={{ paddingLeft: ri * 5 }}>
              {row.map((k, ki) => {
                const isActive = ROW_OFFSETS[ri] + ki === activeFlatIndex;
                return (
                  <span
                    key={k}
                    className={`flex h-4 w-4 items-center justify-center rounded-[3px] text-[6px] font-bold transition-colors ${
                      isActive ? "bg-accent text-accent-foreground scale-110" : "bg-surface-muted text-muted"
                    }`}
                  >
                    {k}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted">{activity ? "beep boop! 🐣" : "zzz…"}</p>
    </div>
  );
}

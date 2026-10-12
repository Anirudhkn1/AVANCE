"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { brewElixirCardAction } from "@/actions/elixir";
import { CARD_GRADES, type CardGrade } from "@/lib/constants";
import { DROPS_BY_GRADE, DROPS_PER_FLASK, GRADE_UI, elixirInfo } from "@/lib/elixir";
import { ElixirFlask } from "@/components/elixir-flask";

type BrewCard = { id: string; front: string; back: string; deckTitle: string; subjectName: string };

type SessionProps = {
  kidId: string;
  cards: BrewCard[];
  startDrops: number;
  /** Due cards that didn't fit in this session. */
  moreWaiting: number;
};

/**
 * Brewing: flip a card, say how it went, and a drop falls into the flask.
 * Each round freezes the queue it started with, so the page re-rendering
 * underneath (router.refresh at the end of a round) never disturbs a
 * session; "Brew more" starts a new round from the refreshed props.
 */
export function ElixirSession(props: SessionProps) {
  const [round, setRound] = useState(0);
  return <Round key={round} {...props} onMore={() => setRound((r) => r + 1)} />;
}

// How long the card takes to flip back before the next one is swapped in.
const FLIP_MS = 330;

function Round({ kidId, cards: startCards, startDrops, moreWaiting, onMore }: SessionProps & { onMore: () => void }) {
  const router = useRouter();
  const [cards] = useState(startCards);
  const [refreshing, startRefresh] = useTransition();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [advancing, setAdvancing] = useState(false); // the card is flipping away
  const [bump, setBump] = useState(0);
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  // Optimistic: a grade counts the moment it's tapped and the server confirms
  // in the background (the database is a slow round trip away). `saving`
  // counts saves still in flight; `failed` holds the ones the server refused.
  const [earned, setEarned] = useState(0);
  const [saving, setSaving] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const card = cards[index];
  const reviewed = index >= cards.length;
  const done = reviewed && saving === 0;
  const info = elixirInfo(startDrops + earned);
  const flasksFilled = info.flasks - elixirInfo(startDrops).flasks;

  // Round over and everything saved: refetch the page once so the next batch
  // (and every other page's cached copy) reflects what was just brewed.
  useEffect(() => {
    if (done && cards.length > 0) startRefresh(() => router.refresh());
  }, [done, cards.length, router]);

  const grade = useCallback(
    (g: CardGrade) => {
      if (!card || !flipped || advancing) return;
      const gained = DROPS_BY_GRADE[g];
      setEarned((n) => n + gained);
      setBump((b) => b + 1);
      setGain({ n: gained, key: Date.now() });
      setSaving((n) => n + 1);
      setFlipped(false);
      setAdvancing(true);
      timer.current = setTimeout(() => {
        setIndex((i) => i + 1);
        setAdvancing(false);
      }, FLIP_MS);

      brewElixirCardAction(kidId, card.id, g)
        .then((res) => {
          if (!res.ok) throw new Error(res.error);
        })
        .catch((e: unknown) => {
          // Take the optimistic drops back and say so.
          setEarned((n) => n - gained);
          setFailed((f) => [...f, e instanceof Error && e.message ? e.message : "Couldn't save that one."]);
        })
        .finally(() => setSaving((n) => n - 1));
    },
    [card, flipped, advancing, kidId]
  );

  // Space/Enter reveals, 1–4 grade.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (!card || advancing) return;
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped && /^[1-4]$/.test(e.key)) {
        grade(CARD_GRADES[Number(e.key) - 1]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, flipped, advancing, grade]);

  const flaskPanel = (
    <div className="mx-auto w-28 sm:w-40 md:w-48">
      <ElixirFlask fill={info.fill} bump={bump} />
      <div className="mt-3 elixir-meter" aria-hidden>
        <span style={{ width: `${info.fill * 100}%` }} />
      </div>
      <p className="mt-1.5 text-center text-sm font-semibold">
        {info.into} / {DROPS_PER_FLASK} drops
      </p>
    </div>
  );

  if (cards.length === 0) {
    return (
      <div className="elixir-stage p-6 sm:p-8 text-center">
        <h2 className="schools-name text-2xl">Nothing to brew right now</h2>
        <p className="elixir-muted mt-1">Every card is scheduled for a later day. Come back tomorrow! ✨</p>
        <Link href={`/school/kid/${kidId}/elixir`} className="elixir-cta mt-5">
          Back to Elixir
        </Link>
      </div>
    );
  }

  if (reviewed) {
    const kept = cards.length - failed.length;
    return (
      <div className="elixir-stage p-6 sm:p-8 text-center">
        <h2 className="schools-name text-2xl sm:text-3xl">{!done ? "Saving your drops…" : earned > 0 ? "Brew complete!" : "Nothing brewed"}</h2>
        <p className="elixir-muted mt-1">
          {earned > 0 ? (
            <>
              You earned <strong className="text-white">+{earned} drops</strong> from {kept} card{kept === 1 ? "" : "s"}.
            </>
          ) : done ? (
            "Those cards weren't ready — try again later."
          ) : (
            "Hang on a moment."
          )}
        </p>
        {failed.length > 0 && done && (
          <p className="mt-2 text-sm font-semibold text-[#ffb4a2]">
            {failed.length} card{failed.length === 1 ? "" : "s"} couldn&apos;t be saved ({failed[0]}) — you can brew{" "}
            {failed.length === 1 ? "it" : "them"} again.
          </p>
        )}
        {flasksFilled > 0 && (
          <p className="elixir-burst mt-3 text-lg font-extrabold text-[#ffd2f7]">
            🧪 You filled {flasksFilled === 1 ? "a flask" : `${flasksFilled} flasks`}! ({info.flasks} on your shelf)
          </p>
        )}
        <div className="my-5">{flaskPanel}</div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {moreWaiting > 0 && (
            <button type="button" className="elixir-cta" onClick={onMore} disabled={!done || refreshing}>
              Brew more ({moreWaiting} ready)
            </button>
          )}
          <Link href={`/school/kid/${kidId}/elixir`} className={moreWaiting > 0 ? "elixir-ghost" : "elixir-cta"}>
            Back to Elixir
          </Link>
        </div>
        {moreWaiting === 0 && done && <p className="elixir-muted mt-4 text-sm">All caught up — come back tomorrow for the next batch. ✨</p>}
      </div>
    );
  }

  return (
    <div className="elixir-stage p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3 text-sm">
        <span className="elixir-muted truncate">
          {card.subjectName} · {card.deckTitle}
        </span>
        <span className="shrink-0 font-semibold">
          {index + 1} / {cards.length}
        </span>
      </div>
      <div className="elixir-meter mb-5" aria-hidden>
        <span style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>

      <div className="grid items-center gap-6 md:grid-cols-[13rem_1fr]">
        {flaskPanel}

        <div className="space-y-4">
          <div className="relative">
            {gain && (
              <span key={gain.key} className="elixir-plus left-1/2 top-2 -translate-x-1/2" aria-hidden>
                +{gain.n} 💧
              </span>
            )}
            <div className={`elixir-card ${flipped ? "is-flipped" : ""}`}>
              <div className="elixir-card__inner">
                <div className="elixir-card__face" aria-hidden={flipped}>
                  <span className="elixir-card__tag">Question</span>
                  <p className="elixir-card__text">{card.front}</p>
                </div>
                <div className="elixir-card__face elixir-card__face--back" aria-hidden={!flipped}>
                  <span className="elixir-card__tag">Answer</span>
                  <p className="elixir-card__text">{card.back}</p>
                </div>
              </div>
            </div>
          </div>

          {failed.length > 0 && (
            <p className="text-center text-sm font-semibold text-[#ffb4a2]">One card couldn&apos;t be saved — {failed[failed.length - 1]}</p>
          )}

          {flipped ? (
            <div>
              <p className="elixir-muted mb-2 text-center text-sm">How did it go?</p>
              <div className="grid grid-cols-4 gap-2">
                {CARD_GRADES.map((g, i) => (
                  <button
                    key={g}
                    type="button"
                    disabled={advancing}
                    onClick={() => grade(g)}
                    className={`elixir-grade elixir-grade--${g}`}
                    aria-keyshortcuts={String(i + 1)}
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {GRADE_UI[g].emoji}
                    </span>
                    <span className="text-sm">{GRADE_UI[g].label}</span>
                    <small>{GRADE_UI[g].hint}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" className="elixir-cta w-full" onClick={() => setFlipped(true)} disabled={advancing}>
              Show answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

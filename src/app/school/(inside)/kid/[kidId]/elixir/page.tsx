import Link from "next/link";
import { pageKid } from "@/lib/school";
import { DROPS_PER_FLASK, SESSION_SIZE, elixirInfo } from "@/lib/elixir";
import { kidElixirCards } from "@/lib/elixir-server";
import { Card, EmptyState, ProgressBar, SectionHeading } from "@/components/ui";
import { ElixirFlask, FlaskShelf } from "@/components/elixir-flask";

// The kid's brewing room: the flask they're filling, today's batch, and the
// decks their teachers have written for the class.
export default async function KidElixirPage({ params }: PageProps<"/school/kid/[kidId]/elixir">) {
  const { kidId } = await params;
  const { kid, classroom } = await pageKid(kidId);

  if (!classroom) {
    return (
      <Page>
        <Card>
          <EmptyState title="Join a classroom first" description="Elixir cards come from your teachers, so you'll see them once you're in a class." />
        </Card>
      </Page>
    );
  }

  const cards = await kidElixirCards(kid.id, classroom.id);
  const info = elixirInfo(kid.elixirPoints);
  const dueCount = cards.filter((c) => c.due).length;
  const batch = Math.min(dueCount, SESSION_SIZE);

  const byDeck = new Map<string, typeof cards>();
  for (const c of cards) byDeck.set(c.deckId, [...(byDeck.get(c.deckId) ?? []), c]);
  const decks = [...byDeck.values()].map((list) => ({
    id: list[0].deckId,
    title: list[0].deckTitle,
    subject: list[0].subjectName,
    total: list.length,
    due: list.filter((c) => c.due).length,
    mastered: list.filter((c) => c.mastered).length,
  }));

  return (
    <Page>
      <section className="elixir-stage p-5 sm:p-7">
        <div className="grid items-center gap-6 sm:grid-cols-[11rem_1fr]">
          <div className="mx-auto w-36 sm:w-44">
            <ElixirFlask fill={info.fill} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl">Elixir</h1>
            <p className="elixir-muted mt-1 text-sm">
              Brew your teachers&apos; cards, a few each day. Every card you remember adds drops to your flask.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="elixir-stat">
                <div className="text-2xl font-extrabold tabular-nums">{kid.elixirPoints}</div>
                <div className="elixir-muted text-xs">drops</div>
              </div>
              <div className="elixir-stat">
                <div className="text-2xl font-extrabold tabular-nums">{info.flasks}</div>
                <div className="elixir-muted text-xs">flasks brewed</div>
              </div>
              <div className="elixir-stat">
                <div className="text-2xl font-extrabold tabular-nums">{info.toNext}</div>
                <div className="elixir-muted text-xs">to next flask</div>
              </div>
            </div>

            <div className="elixir-meter mt-3" aria-hidden>
              <span style={{ width: `${info.fill * 100}%` }} />
            </div>
            <p className="elixir-muted mt-1 text-xs">
              {info.into} / {DROPS_PER_FLASK} drops in this flask
            </p>

            <div className="mt-5">
              {dueCount > 0 ? (
                <Link href={`/school/kid/${kid.id}/elixir/brew`} className="elixir-cta">
                  🧪 Start brewing · {batch} card{batch === 1 ? "" : "s"}
                </Link>
              ) : (
                <p className="font-semibold">
                  {cards.length === 0 ? "Your teachers haven't added any cards yet." : "All caught up — come back tomorrow! ✨"}
                </p>
              )}
              {dueCount > SESSION_SIZE && <p className="elixir-muted mt-2 text-xs">{dueCount} cards are ready — you can brew them in rounds of {SESSION_SIZE}.</p>}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide opacity-80">Your shelf</h2>
          <FlaskShelf count={info.flasks} />
        </div>
      </section>

      <Card>
        <SectionHeading title="📚 Decks from your teachers" subtitle="Cards come back on a schedule: the better you know one, the longer it waits." />
        {decks.length === 0 ? (
          <p className="text-sm text-muted">Nothing here yet. When a teacher adds an Elixir deck for your class, it shows up here.</p>
        ) : (
          <ul className="space-y-2">
            {decks.map((d) => (
              <li key={d.id} className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{d.title}</p>
                    <p className="text-xs text-muted">{d.subject}</p>
                  </div>
                  <p className="text-xs text-muted tabular-nums">
                    {d.due > 0 ? <span className="font-semibold text-accent">{d.due} ready</span> : "none ready"} · {d.total} card{d.total === 1 ? "" : "s"}
                  </p>
                </div>
                <ProgressBar percent={(d.mastered / d.total) * 100} tone="success" className="mt-2" />
                <p className="mt-1 text-xs text-muted">{d.mastered} of {d.total} mastered</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">{children}</div>;
}

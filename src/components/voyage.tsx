import Link from "next/link";
import "./voyage.css";
import { VoyageScroll } from "@/components/voyage-scroll";
import { ProgressBar } from "@/components/ui";
import { WAYPOINTS, characterById, isUnlocked, levelInfo, nextWaypoint, routePosition } from "@/lib/voyage";

// The Voyage: the kid's ship sails a route of islands as XP comes in. Islands
// that hand out a crew member show them (a dark silhouette until they join);
// unlocked ones open that hero's animated stage. Pure server-rendered HTML +
// CSS (voyage.css) apart from the little scroller that centres the ship.

const GAP = 124; // px between islands
const PAD = 76;
const WIDTH = PAD * 2 + GAP * (WAYPOINTS.length - 1);
const HEIGHT = 262;
const YS = [176, 104, 168, 92, 168, 104, 176]; // gentle zig-zag, one per waypoint

const pointX = (i: number) => PAD + GAP * i;
const pctX = (px: number) => `${(px / WIDTH) * 100}%`;
const pctY = (px: number) => `${(px / HEIGHT) * 100}%`;

export function Voyage({
  kidId,
  xp,
  equippedId,
}: {
  kidId: string;
  xp: number;
  /** The hero currently worn as the profile picture. */
  equippedId: string | null;
}) {
  const { level } = levelInfo(xp);
  const next = nextWaypoint(xp);
  const pos = routePosition(xp);
  const i = Math.min(Math.floor(pos), WAYPOINTS.length - 1);
  const f = pos - i;
  const j = Math.min(i + 1, WAYPOINTS.length - 1);
  const shipX = pointX(i) + (pointX(j) - pointX(i)) * f;
  const shipY = YS[i] + (YS[j] - YS[i]) * f;

  // Leg progress for the bar: how far between the last island and the next.
  const prevXp = [...WAYPOINTS].reverse().find((w) => w.xp <= xp)?.xp ?? 0;
  const legPct = next ? ((xp - prevXp) / (next.xp - prevXp)) * 100 : 100;

  const sailed = [`M ${pointX(0)} ${YS[0]}`];
  for (let k = 1; k <= i; k++) sailed.push(`L ${pointX(k)} ${YS[k]}`);
  if (f > 0) sailed.push(`L ${shipX} ${shipY}`);
  const route = WAYPOINTS.map((_, k) => `${k === 0 ? "M" : "L"} ${pointX(k)} ${YS[k]}`).join(" ");

  return (
    <section className="voyage" aria-label="Voyage">
      <header className="voyage__head">
        <div>
          <h2 className="voyage__title">⛵ Voyage</h2>
          <p className="voyage__sub">
            {next ? (
              <>
                <b>{next.xp - xp} XP</b> to {next.characterId ? "meet a new crewmate at" : "reach"} <b>{next.name}</b>
              </>
            ) : (
              "You've sailed the whole route — more crew is on the way!"
            )}
          </p>
        </div>
        <div className="voyage__level">
          <span>Level</span>
          <b>{level}</b>
          <small>{xp} XP</small>
        </div>
      </header>

      <ProgressBar percent={legPct} className="voyage__bar" />

      <VoyageScroll focusPct={(shipX / WIDTH) * 100}>
        <div className="voyage__map" style={{ minWidth: WIDTH, height: HEIGHT }}>
          <div className="voyage__waves" aria-hidden />
          <span className="voyage__cloud voyage__cloud--a" aria-hidden />
          <span className="voyage__cloud voyage__cloud--b" aria-hidden />
          <svg className="voyage__route" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden>
            <path d={route} className="voyage__route-ahead" />
            <path d={sailed.join(" ")} className="voyage__route-sailed" />
          </svg>

          {WAYPOINTS.map((w, k) => {
            const reached = xp >= w.xp;
            const hero = characterById(w.characterId);
            const isNext = next?.xp === w.xp;
            const style = { left: pctX(pointX(k)), top: pctY(YS[k]) };
            const label = (
              <span className="voyage__label">
                <b>{hero && !isUnlocked(hero, xp) ? "???" : hero ? hero.name : w.name}</b>
                <small>{reached ? (hero ? w.name : "Reached") : `${w.xp} XP`}</small>
              </span>
            );

            if (hero && isUnlocked(hero, xp)) {
              const worn = equippedId === hero.id;
              return (
                <Link
                  key={w.xp}
                  href={`/school/kid/${kidId}/voyage/${hero.id}`}
                  className="voyage__node voyage__node--hero"
                  style={{ ...style, ["--accent-hero" as string]: hero.accent }}
                  aria-label={`${hero.name} — open`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- a 256px static crop */}
                  <img src={hero.face} alt="" />
                  {worn && <em className="voyage__worn">★</em>}
                  {label}
                </Link>
              );
            }
            return (
              <div
                key={w.xp}
                className={`voyage__node ${hero ? "voyage__node--locked" : "voyage__node--mile"} ${reached ? "is-reached" : ""} ${isNext ? "is-next" : ""}`}
                style={style}
              >
                {hero ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- a 256px static crop, shown as a silhouette */}
                    <img src={hero.face} alt="" className="voyage__silhouette" />
                    <em className="voyage__lock">🔒</em>
                  </>
                ) : (
                  <span className="voyage__icon">{w.icon}</span>
                )}
                {label}
              </div>
            );
          })}

          <div className="voyage__ship" style={{ left: pctX(shipX), top: pctY(shipY) }} aria-label={`Your ship, at ${xp} XP`}>
            <span className="voyage__ship-hull">⛵</span>
            <span className="voyage__wake" aria-hidden />
          </div>
        </div>
      </VoyageScroll>
    </section>
  );
}

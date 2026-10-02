// The canvas simulation behind <CornerSpider> (see corner-spider.tsx): an orb
// web strung across the top-right corner of the screen, and a garden spider
// living on it. Plain 2D canvas, no dependencies.
//
// The same scene is painted onto two full-screen canvases: one behind the
// page content (so the web only shows in the empty space around cards and
// the spider slips behind them), and one above the nav, clipped to the nav's
// band, so the web still drapes over the menu.
//
// The web is a real orb: ~21 radials from a hub out to an irregular frame
// (anchored to the top and right edges of the screen), with one continuous
// capture spiral wound between them. Its intersections form a graph the
// spider walks on, so it only ever travels along silk.
//
// The spider's behaviour is a small state machine that loops forever:
//
//   wander ─(N random hops, with pauses)─▶ toDrop ─(shortest path to a low
//   node)─▶ turnDown ─▶ drop ─(pays out silk, far down the screen)─▶ hang
//   ─(pendulum, 2.5–5.5s)─▶ climb ─(reels the silk back in)─▶ wander …
//
// Touching it interrupts whatever it's doing: it climbs back up if it was
// hanging, then sprints along the threads to the top edge and off the
// screen (flee), stays gone for 10 seconds (away), and walks back down the
// same thread (enter).
//
// Legs are procedural: each foot is planted in world space and steps when
// the body has moved far enough from it, in alternating groups of four
// (the tetrapod gait real spiders use), with two-bone IK for the knee.

type Vec = { x: number; y: number };
/** A route point: a web node (follows the web as it sways) or a fixed point. */
type Waypoint = number | Vec;

type WebNode = {
  bx: number; // rest position
  by: number;
  x: number; // live position (wind, the spider's weight, vibration)
  y: number;
  sway: number; // 1 at the hub, 0 on the frame
  phase: number;
  frame: boolean;
  reachable: boolean; // inside the canvas, so fine to wander to
  next: number[];
};

type Thread = { a: number; b: number; spiral: boolean; ang: number; order: number };
type Dew = { a: number; b: number; u: number; r: number; ang: number };

type Web = {
  nodes: WebNode[];
  threads: Thread[];
  spiralCount: number;
  dews: Dew[];
  frame: Vec[];
  hubMesh: Vec[][];
  exits: number[];
};

type Leg = {
  group: 0 | 1;
  idx: number;
  side: 1 | -1;
  hip: Vec;
  rest: Vec;
  fold: Vec;
  femur: number;
  shin: number;
  foot: Vec; // world space
  from: Vec;
  stepping: boolean;
  t: number;
  dur: number;
  lift: number;
};

type Mode =
  | "wander"
  | "pause"
  | "toDrop"
  | "turnDown"
  | "drop"
  | "hang"
  | "climb"
  | "fleeClimb"
  | "flee"
  | "away"
  | "enter";

type Palette = {
  dark: boolean;
  accent: string;
  silk: string;
  silkAlpha: number;
  leg: string;
  band: string;
  shine: string;
  rim: number;
};

const S = 1.25; // spider scale: CSS px per body unit (~40px leg span)
const TIP = 15.6; // abdomen tip, body units behind the cephalothorax centre
const HANG = TIP * S;
const AWAY_SECONDS = 10;
const RADIALS = 21;
const LOOPS = 14;
const BUILD_SECONDS = 2.4;
const LIGHT = { x: -0.45, y: -0.89 }; // world-space light, from the top left

// Per leg pair, front to back: where it joins the cephalothorax, where its
// foot rests while walking, and where it's tucked while hanging.
const HIP = [[2.6, 2.3], [1.2, 3.0], [-0.2, 3.1], [-1.4, 2.5]];
const REST = [[14.5, 9.5], [6.5, 13.5], [-4.5, 12.5], [-13.5, 9]];
const FOLD = [[10.5, 5.5], [4.5, 8], [-2.5, 7.5], [-8.5, 5.5]];

const ABDOMEN_HAIRS = Array.from({ length: 64 }, (_, i) => ({
  a: (i / 64) * Math.PI * 2 + Math.sin(i * 7.3) * 0.05,
  len: 0.6 + ((i * 37) % 11) / 18,
}));
// Fixed (not random) so the markings don't change between visits.
const ABDOMEN_MOTTLE = Array.from({ length: 26 }, (_, i) => {
  const a = i * 2.39996; // golden angle: an even scatter
  const r = Math.sqrt((i + 0.5) / 26);
  return { x: Math.cos(a) * r * 6.2, y: Math.sin(a) * r * 4.8, r: 0.35 + ((i * 13) % 7) / 14 };
});
// Setae along each leg segment: [position along it, side, length].
const LEG_SETAE: [number, number, number][][] = [
  [[0.3, 1, 1.0], [0.45, -1, 0.9], [0.6, 1, 1.1], [0.75, -1, 1.0], [0.9, 1, 0.9]],
  [[0.25, -1, 1.0], [0.45, 1, 1.1], [0.65, -1, 1.0], [0.85, 1, 0.9]],
  [[0.3, 1, 0.8], [0.6, -1, 0.7], [0.85, 1, 0.6]],
  [],
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function angDiff(a: number, b: number) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function rayHit(o: Vec, ang: number, poly: Vec[]): Vec {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const ex = q.x - p.x;
    const ey = q.y - p.y;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((p.x - o.x) * ey - (p.y - o.y) * ex) / den;
    const u = ((p.x - o.x) * dy - (p.y - o.y) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
  }
  return { x: o.x + dx * best, y: o.y + dy * best };
}

/**
 * Lays the web out in the screen's top-right corner, sized to the viewport.
 * Frame points at y < 0 / x > W are anchored just off-screen. On a wide
 * screen the hub lands in the empty margin right of the page column.
 */
function buildWeb(W: number, H: number): Web {
  const size = clamp(W * 0.36, 230, 440);
  const hub = { x: W - size * 0.42, y: size * 0.32 };
  const frame: Vec[] = [
    { x: W - size * 1.05, y: -3 },
    { x: W - size * 0.25, y: -3 },
    { x: W + 3, y: size * 0.05 },
    { x: W + 3, y: size * 0.88 },
    { x: W - size * 0.16, y: size * 0.98 },
    { x: W - size * 0.66, y: size * 0.82 },
    { x: W - size * 1.12, y: size * 0.36 },
  ];

  const nodes: WebNode[] = [];
  const add = (x: number, y: number, sway: number, isFrame: boolean) => {
    nodes.push({
      bx: x,
      by: y,
      x,
      y,
      sway,
      phase: Math.random() * Math.PI * 2,
      frame: isFrame,
      reachable: !isFrame && x > 10 && x < W - 10 && y > 7 && y < H - 12,
      next: [],
    });
    return nodes.length - 1;
  };
  const threads: Thread[] = [];
  const link = (a: number, b: number, spiral: boolean) => {
    nodes[a].next.push(b);
    nodes[b].next.push(a);
    const mx = (nodes[a].bx + nodes[b].bx) / 2;
    const my = (nodes[a].by + nodes[b].by) / 2;
    threads.push({ a, b, spiral, ang: Math.atan2(my - hub.y, mx - hub.x), order: 0 });
  };

  add(hub.x, hub.y, 1, false);
  const ends: Vec[] = [];
  for (let j = 0; j < RADIALS; j++) {
    const ang = -Math.PI + (j / RADIALS) * Math.PI * 2 + rand(-0.07, 0.07);
    ends.push(rayHit(hub, ang, frame));
  }

  // One continuous spiral: the fraction of the way out along each radial
  // grows a little with every radial passed, not just with every loop.
  const T0 = 0.12;
  const DT = 0.056;
  const spiralId: number[][] = [];
  for (let i = 0; i < LOOPS; i++) {
    spiralId.push([]);
    for (let j = 0; j < RADIALS; j++) {
      const t = (T0 + (i + j / RADIALS) * DT) * rand(0.985, 1.015);
      const e = ends[j];
      spiralId[i].push(add(hub.x + (e.x - hub.x) * t, hub.y + (e.y - hub.y) * t, 1 - t, false));
    }
  }
  const frameId = ends.map((e) => add(e.x, e.y, 0, true));

  for (let j = 0; j < RADIALS; j++) {
    link(0, spiralId[0][j], false);
    for (let i = 0; i < LOOPS - 1; i++) link(spiralId[i][j], spiralId[i + 1][j], false);
    link(spiralId[LOOPS - 1][j], frameId[j], false);
  }
  let spiralCount = 0;
  for (let i = 0; i < LOOPS; i++) {
    for (let j = 0; j < RADIALS; j++) {
      const a = spiralId[i][j];
      const b = j < RADIALS - 1 ? spiralId[i][j + 1] : i < LOOPS - 1 ? spiralId[i + 1][0] : -1;
      if (b < 0) continue;
      // A few broken strands, as on any real web — never near the hub.
      if (i > 2 && Math.random() < 0.05) continue;
      link(a, b, true);
      spiralCount++;
    }
  }
  // Orb weavers lay the capture spiral from the outside in; number the
  // strands that way so the build-in animation can follow it.
  let k = 0;
  for (let i = threads.length - 1; i >= 0; i--) if (threads[i].spiral) threads[i].order = k++;

  const spirals = threads.filter((t) => t.spiral);
  const dews: Dew[] = Array.from({ length: 34 }, () => {
    const t = spirals[Math.floor(Math.random() * spirals.length)];
    return { a: t.a, b: t.b, u: rand(0.2, 0.8), r: rand(0.7, 1.7), ang: t.ang };
  });

  // The hub's own little mesh of irregular rings.
  const hubMesh = [0.035, 0.065, 0.095].map((f) =>
    ends.map((e) => {
      const t = f * rand(0.8, 1.25);
      return { x: (e.x - hub.x) * t, y: (e.y - hub.y) * t };
    })
  );

  const exits = frameId.filter((id) => nodes[id].by < 4);
  return { nodes, threads, spiralCount, dews, frame, hubMesh, exits };
}

/** Dijkstra over the web graph to the nearest node matching `goal`. */
function shortestPath(nodes: WebNode[], from: number, goal: (i: number) => boolean, allow: (i: number) => boolean) {
  const n = nodes.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  dist[from] = 0;
  for (;;) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!done[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u < 0) return [from];
    if (u !== from && goal(u)) {
      const path: number[] = [];
      for (let v = u; v >= 0; v = prev[v]) path.unshift(v);
      return path;
    }
    done[u] = 1;
    for (const v of nodes[u].next) {
      if (done[v] || !(allow(v) || goal(v))) continue;
      const w = Math.hypot(nodes[u].bx - nodes[v].bx, nodes[u].by - nodes[v].by);
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;
      }
    }
  }
}

/** Two-bone IK, with the knee bent away from the body like a real spider's. */
function solveKnee(h: Vec, f: Vec, a: number, b: number): Vec {
  const dx = f.x - h.x;
  const dy = f.y - h.y;
  const d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 0.01, a + b - 0.01);
  const base = Math.atan2(dy, dx);
  const bend = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const k1 = { x: h.x + a * Math.cos(base + bend), y: h.y + a * Math.sin(base + bend) };
  const k2 = { x: h.x + a * Math.cos(base - bend), y: h.y + a * Math.sin(base - bend) };
  return k1.x * k1.x + k1.y * k1.y > k2.x * k2.x + k2.y * k2.y ? k1 : k2;
}

function makeLegs(): Leg[] {
  const legs: Leg[] = [];
  for (const side of [1, -1] as const) {
    for (let idx = 0; idx < 4; idx++) {
      const hip = { x: HIP[idx][0], y: HIP[idx][1] * side };
      const rest = { x: REST[idx][0], y: REST[idx][1] * side };
      const reach = Math.hypot(rest.x - hip.x, rest.y - hip.y);
      legs.push({
        group: ((idx + (side > 0 ? 0 : 1)) % 2) as 0 | 1,
        idx,
        side,
        hip,
        rest,
        fold: { x: FOLD[idx][0], y: FOLD[idx][1] * side },
        femur: reach * 0.62,
        shin: reach * 0.62,
        foot: { x: 0, y: 0 },
        from: { x: 0, y: 0 },
        stepping: false,
        t: 0,
        dur: 0.12,
        lift: 0,
      });
    }
  }
  return legs;
}

function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const accent = cs.getPropertyValue("--accent").trim() || (dark ? "#8b85ff" : "#5850ec");
  return dark
    ? { dark, accent, silk: "#dcd8ff", silkAlpha: 0.34, leg: "#33262f", band: "#6a5566", shine: "#9a86a0", rim: 0.26 }
    : { dark, accent, silk: "#6f7590", silkAlpha: 0.5, leg: "#2b1f27", band: "#56434f", shine: "#8a7584", rim: 0 };
}

/**
 * `back` sits behind the page content, `front` above the nav; both cover the
 * viewport. `band()` returns how far down the screen the nav currently
 * reaches (0 while it's scrolled away): `front` paints only above that line.
 */
export function createCornerSpider(
  back: HTMLCanvasElement,
  front: HTMLCanvasElement,
  hit: HTMLElement,
  band: () => number
) {
  const backCtx = back.getContext("2d");
  const frontCtx = front.getContext("2d");
  if (!backCtx || !frontCtx) return { shoo() {}, destroy() {} };
  // The canvas every draw call below goes to — draw() paints each in turn.
  let ctx: CanvasRenderingContext2D = backCtx;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const darkQuery = matchMedia("(prefers-color-scheme: dark)");

  let W = 0;
  let H = 0;
  let dpr = 1;
  let geometry = "";
  let web: Web = { nodes: [], threads: [], spiralCount: 0, dews: [], frame: [], hubMesh: [], exits: [] };
  let pal = readPalette(back);
  let time = 0;
  let vib = 0;
  let raf = 0;
  let last = 0;
  let awayTimer: ReturnType<typeof setTimeout> | undefined;

  const legs = makeLegs();
  const sp = {
    x: 0,
    y: 0,
    heading: Math.PI / 2,
    vx: 0,
    vy: 0,
    mode: "away" as Mode,
    timer: reduceMotion ? 0 : BUILD_SECONDS - 0.4,
    route: [] as Waypoint[],
    seg: 0,
    along: 0,
    speed: 0,
    turnRate: 8,
    curNode: 0,
    prevNode: -1,
    hopsLeft: 0,
    anchor: 0,
    L: 0,
    Lt: 0,
    theta: 0,
    omega: 0,
    dropV: 0,
    bounce: 0,
    bounceV: 0,
    exit: -1,
    visible: false,
    gaitPhase: 0,
    abdSway: 0,
  };

  const pt = (w: Waypoint): Vec => (typeof w === "number" ? web.nodes[w] : w);
  const toWorld = (l: Vec): Vec => {
    const c = Math.cos(sp.heading);
    const s = Math.sin(sp.heading);
    return { x: sp.x + S * (l.x * c - l.y * s), y: sp.y + S * (l.x * s + l.y * c) };
  };
  const toLocal = (w: Vec): Vec => {
    const c = Math.cos(sp.heading);
    const s = Math.sin(sp.heading);
    const dx = (w.x - sp.x) / S;
    const dy = (w.y - sp.y) / S;
    return { x: dx * c + dy * s, y: -dx * s + dy * c };
  };
  const onThread = () => ["turnDown", "drop", "hang", "climb", "fleeClimb"].includes(sp.mode);

  // ---------- Layout ----------

  function measure() {
    const nextW = back.clientWidth;
    const nextH = back.clientHeight;
    if (!nextW || !nextH) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (nextW !== W || nextH !== H || back.width !== Math.round(nextW * dpr)) {
      W = nextW;
      H = nextH;
      for (const c of [back, front]) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
      }
    }
    // Only the width shapes the web; height changes (a phone's address bar
    // sliding away) shouldn't tear it down and send the spider off.
    const key = `${W}`;
    if (key === geometry) return;
    geometry = key;
    web = buildWeb(W, H);
    // A rebuilt web invalidates every node id the spider was holding on to.
    if (sp.mode !== "away") goAway(reduceMotion ? AWAY_SECONDS : 0.6);
    if (reduceMotion) parkAtHub();
  }

  // ---------- Behaviour ----------

  function startRoute(route: Waypoint[], mode: Mode, speed: number, turnRate: number) {
    sp.route = route;
    sp.seg = 0;
    sp.along = 0;
    sp.mode = mode;
    sp.speed = speed;
    sp.turnRate = turnRate;
  }

  const wanderable = (i: number) => web.nodes[i].reachable;

  function hop(from: number) {
    const near = web.nodes[from].next;
    let options = near.filter((n) => wanderable(n) && n !== sp.prevNode);
    if (!options.length) options = near.filter(wanderable);
    if (!options.length) options = near.filter((n) => !web.nodes[n].frame);
    const to = options[Math.floor(Math.random() * options.length)] ?? from;
    sp.prevNode = from;
    startRoute([from, to], "wander", rand(34, 72), 8);
  }

  function planDrop(from: number) {
    const hubY = web.nodes[0].by;
    const low = web.nodes.map((_, i) => i).filter((i) => wanderable(i) && web.nodes[i].by > hubY + 14);
    const target = low[Math.floor(Math.random() * low.length)];
    if (target === undefined || target === from) return startTurnDown(from);
    startRoute(shortestPath(web.nodes, from, (i) => i === target, wanderable), "toDrop", 55, 8);
  }

  function startTurnDown(node: number) {
    sp.mode = "turnDown";
    sp.anchor = node;
    sp.L = -HANG;
    sp.theta = 0;
    sp.omega = rand(-0.25, 0.25);
    sp.bounce = 0;
    sp.bounceV = 0;
  }

  function onArrive() {
    const end = sp.route[sp.route.length - 1];
    if (sp.mode === "flee") return goAway(AWAY_SECONDS);
    if (typeof end !== "number") return goAway(AWAY_SECONDS);
    sp.curNode = end;
    if (sp.mode === "toDrop") return startTurnDown(end);
    if (sp.mode === "enter") {
      sp.hopsLeft = Math.round(rand(3, 7));
      sp.prevNode = -1;
      return hop(end);
    }
    if (--sp.hopsLeft <= 0) return planDrop(end);
    if (Math.random() < 0.35) {
      sp.mode = "pause";
      sp.timer = rand(0.4, 1.8);
      return;
    }
    hop(end);
  }

  function goAway(seconds: number) {
    sp.mode = "away";
    sp.visible = false;
    sp.timer = seconds;
  }

  function enter() {
    if (!web.exits.length) return;
    if (sp.exit < 0 || !web.exits.includes(sp.exit)) {
      sp.exit = web.exits[Math.floor(Math.random() * web.exits.length)];
    }
    const exit = web.nodes[sp.exit];
    const off = { x: exit.bx, y: -40 };
    const path = shortestPath(web.nodes, sp.exit, wanderable, (i) => !web.nodes[i].frame);
    sp.x = off.x;
    sp.y = off.y;
    sp.heading = Math.PI / 2;
    sp.visible = true;
    startRoute([off, ...path], "enter", 70, 10);
  }

  function nearestNode(p: Vec) {
    let best = 0;
    let bestD = Infinity;
    web.nodes.forEach((n, i) => {
      if (n.frame) return;
      const d = (n.x - p.x) ** 2 + (n.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  function startFlee(start: Vec, node: number) {
    const isExit = (i: number) => web.exits.includes(i);
    const path = shortestPath(web.nodes, node, isExit, (i) => !web.nodes[i].frame);
    const exit = path[path.length - 1];
    if (!isExit(exit)) return startRoute([start, { x: start.x, y: -50 }], "flee", 330, 24);
    sp.exit = exit;
    startRoute([start, ...path, { x: web.nodes[exit].bx, y: -50 }], "flee", 330, 24);
  }

  function shoo() {
    if (!sp.visible || sp.mode === "flee" || sp.mode === "fleeClimb" || sp.mode === "away") return;
    vib = 1;
    if (reduceMotion) {
      goAway(AWAY_SECONDS);
      draw();
      clearTimeout(awayTimer);
      awayTimer = setTimeout(() => {
        parkAtHub();
        draw();
      }, AWAY_SECONDS * 1000);
      return;
    }
    if (onThread()) {
      sp.mode = "fleeClimb";
      return;
    }
    const ahead = sp.mode === "pause" ? sp.curNode : sp.route[sp.seg + 1];
    startFlee({ x: sp.x, y: sp.y }, typeof ahead === "number" ? ahead : nearestNode(sp));
  }

  function parkAtHub() {
    const hub = web.nodes[0];
    if (!hub) return;
    sp.mode = "pause";
    sp.timer = Infinity;
    sp.curNode = 0;
    sp.visible = true;
    sp.x = hub.x;
    sp.y = hub.y;
    sp.heading = -Math.PI / 2 + 0.3;
    for (const leg of legs) {
      leg.foot = toWorld(leg.rest);
      leg.stepping = false;
    }
  }

  // ---------- Simulation ----------

  function updateWeb(dt: number) {
    const wx = 1.3 * Math.sin(time * 0.7) + 0.5 * Math.sin(time * 1.9 + 1.3);
    const wy = 0.6 * Math.sin(time * 0.93 + 0.4);
    vib *= Math.exp(-dt * 2.2);
    let pull = 0;
    let px = 0;
    let py = 0;
    if (sp.visible && sp.mode !== "flee" && sp.mode !== "enter") {
      const hanging = onThread() && sp.L > 0;
      const anchor = web.nodes[sp.anchor];
      pull = hanging ? 2.6 : 0.9;
      px = hanging ? anchor.bx : sp.x;
      py = hanging ? anchor.by : sp.y;
    }
    for (const n of web.nodes) {
      const a = n.sway;
      n.x = n.bx + a * (wx + vib * 1.8 * Math.sin(time * 29 + n.phase));
      n.y = n.by + a * (wy + vib * 1.2 * Math.cos(time * 23 + n.phase));
      if (pull) {
        const d2 = (n.bx - px) ** 2 + (n.by - py) ** 2;
        n.y += pull * Math.exp(-d2 / 700) * (0.35 + 0.65 * a);
      }
    }
  }

  function followRoute(dt: number) {
    while (sp.seg < sp.route.length - 1) {
      const p0 = pt(sp.route[sp.seg]);
      const p1 = pt(sp.route[sp.seg + 1]);
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      if (len < 0.01) {
        sp.seg++;
        continue;
      }
      const want = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const diff = angDiff(want, sp.heading);
      sp.heading += clamp(diff, -sp.turnRate * dt, sp.turnRate * dt);
      // Pivot on the spot before setting off in a new direction.
      sp.along += sp.speed * clamp(1.25 - Math.abs(diff) * 0.9, 0.12, 1) * dt;
      if (sp.along >= len) {
        sp.seg++;
        sp.along = 0;
        sp.x = p1.x;
        sp.y = p1.y;
        if (sp.seg >= sp.route.length - 1) return true;
        return false;
      }
      sp.x = p0.x + ((p1.x - p0.x) * sp.along) / len;
      sp.y = p0.y + ((p1.y - p0.y) * sp.along) / len;
      return false;
    }
    return true;
  }

  function placeOnThread() {
    const a = web.nodes[sp.anchor];
    const dirX = Math.sin(sp.theta);
    const dirY = Math.cos(sp.theta);
    const r = sp.L + sp.bounce + HANG;
    sp.x = a.x + dirX * r;
    sp.y = a.y + dirY * r;
    sp.heading = Math.atan2(dirY, dirX);
  }

  function swing(dt: number, damping: number) {
    const len = Math.max(sp.L + HANG, 14);
    sp.omega += (-(900 / len) * Math.sin(sp.theta) - damping * sp.omega) * dt;
    if (Math.random() < dt * 0.5) sp.omega += rand(-0.35, 0.35); // a gust
    sp.theta = clamp(sp.theta + sp.omega * dt, -0.9, 0.9);
    sp.bounceV += (-140 * sp.bounce - 5 * sp.bounceV) * dt;
    sp.bounce += sp.bounceV * dt;
  }

  function updateSpider(dt: number) {
    const ox = sp.x;
    const oy = sp.y;

    switch (sp.mode) {
      case "away":
        sp.timer -= dt;
        if (sp.timer <= 0) enter();
        break;
      case "pause": {
        sp.timer -= dt;
        const n = web.nodes[sp.curNode];
        sp.x = n.x;
        sp.y = n.y;
        if (sp.timer <= 0) hop(sp.curNode);
        break;
      }
      case "wander":
      case "toDrop":
      case "enter":
      case "flee":
        if (followRoute(dt)) onArrive();
        break;
      case "turnDown": {
        const n = web.nodes[sp.anchor];
        sp.x = n.x;
        sp.y = n.y;
        const diff = angDiff(Math.PI / 2, sp.heading);
        sp.heading += clamp(diff, -7 * dt, 7 * dt);
        if (Math.abs(diff) < 0.04) {
          const anchorY = web.nodes[sp.anchor].by;
          // Anywhere from mid-screen to near the bottom, behind the page.
          const target = rand(H * 0.45, H * 0.92);
          sp.Lt = clamp(target - anchorY - HANG, 24, H - 30 - anchorY - HANG);
          sp.dropV = 0;
          sp.mode = "drop";
        }
        break;
      }
      case "drop":
        // Pays silk out quickly, then brakes as it nears the chosen depth.
        sp.dropV = Math.min(sp.dropV + 240 * dt, 18 + (sp.Lt - sp.L) * 2.2, 170);
        sp.L += sp.dropV * dt;
        swing(dt, 0.6);
        if (sp.L >= sp.Lt - 0.5) {
          sp.L = sp.Lt;
          sp.bounceV = sp.dropV * 0.8 + 18;
          sp.mode = "hang";
          sp.timer = rand(2.5, 5.5);
        }
        placeOnThread();
        break;
      case "hang":
        swing(dt, 0.22);
        sp.timer -= dt;
        if (sp.timer <= 0) sp.mode = "climb";
        placeOnThread();
        break;
      case "climb":
      case "fleeClimb": {
        // Reels in hand over hand — a pulse in the speed, not a smooth winch.
        const v = sp.mode === "fleeClimb" ? 700 : 95 * (0.55 + 0.45 * Math.sin(time * 13));
        sp.L -= v * dt;
        swing(dt, sp.mode === "fleeClimb" ? 6 : 1.2);
        placeOnThread();
        if (sp.L <= -HANG) {
          sp.L = -HANG;
          placeOnThread();
          if (sp.mode === "fleeClimb") {
            const n = web.nodes[sp.anchor];
            startFlee({ x: n.x, y: n.y }, sp.anchor);
          } else {
            sp.mode = "pause";
            sp.timer = rand(0.3, 0.9);
            sp.curNode = sp.anchor;
            sp.prevNode = -1;
            sp.hopsLeft = Math.round(rand(4, 9));
          }
        }
        break;
      }
    }

    if (!sp.visible) return;
    const k = Math.min(1, dt * 20);
    sp.vx += ((sp.x - ox) / dt - sp.vx) * k;
    sp.vy += ((sp.y - oy) / dt - sp.vy) * k;
    const speed = Math.hypot(sp.vx, sp.vy);
    sp.gaitPhase += speed * dt * 0.35;
    sp.abdSway = speed > 4 ? 0.07 * Math.sin(sp.gaitPhase) : 0.025 * Math.sin(time * 1.6);
    updateLegs(dt, speed);
  }

  function updateLegs(dt: number, speed: number) {
    if (onThread() && sp.mode !== "turnDown") {
      // Hanging: legs drawn in, front pair feeling the air; climbing, the
      // back legs take turns hauling the silk in.
      const climbing = sp.mode === "climb" || sp.mode === "fleeClimb";
      const k = 1 - Math.exp(-dt * (sp.mode === "fleeClimb" ? 40 : 14));
      for (const leg of legs) {
        const wave = leg.idx === 0 ? Math.sin(time * 2.6 + leg.side) * 1.4 : 0;
        const haul = climbing && leg.idx >= 2 ? Math.sin(time * 13 + (leg.side > 0 ? 0 : Math.PI)) * 2.2 : 0;
        const target = toWorld({ x: leg.fold.x + wave + haul, y: leg.fold.y + Math.cos(time * 2.1 + leg.idx) * 0.4 });
        leg.foot.x += (target.x - leg.foot.x) * k;
        leg.foot.y += (target.y - leg.foot.y) * k;
        leg.stepping = false;
        leg.lift = 0;
      }
      return;
    }

    const threshold = Math.max(5.5 * S, speed * 0.06);
    const dur = clamp(0.15 - speed * 0.0003, 0.05, 0.15);
    const lead = 0.09;
    const ideal = legs.map((leg) => {
      const w = toWorld(leg.rest);
      return { x: w.x + sp.vx * lead, y: w.y + sp.vy * lead };
    });
    const busy = [false, false];
    for (const leg of legs) if (leg.stepping) busy[leg.group] = true;

    legs.forEach((leg, i) => {
      if (!leg.stepping) return;
      leg.t += dt / leg.dur;
      const e = leg.t < 1 ? leg.t * leg.t * (3 - 2 * leg.t) : 1;
      leg.foot.x = leg.from.x + (ideal[i].x - leg.from.x) * e;
      leg.foot.y = leg.from.y + (ideal[i].y - leg.from.y) * e;
      leg.lift = Math.sin(Math.PI * Math.min(leg.t, 1));
      if (leg.t >= 1) {
        leg.stepping = false;
        leg.lift = 0;
      }
    });

    for (const group of [0, 1] as const) {
      if (busy[1 - group]) continue;
      const mine = legs.map((leg, i) => ({ leg, d: Math.hypot(leg.foot.x - ideal[i].x, leg.foot.y - ideal[i].y) }));
      const needs = mine.some(({ leg, d }) => leg.group === group && !leg.stepping && (d > threshold || (speed < 3 && d > 1.4 * S)));
      if (!needs) continue;
      for (const { leg, d } of mine) {
        if (leg.group !== group || leg.stepping) continue;
        if (d > threshold * 5) {
          const i = legs.indexOf(leg);
          leg.foot = { ...ideal[i] };
        } else if (d > threshold * 0.35 || speed < 3) {
          leg.stepping = true;
          leg.t = 0;
          leg.dur = dur;
          leg.from = { ...leg.foot };
        }
      }
      busy[group] = true;
    }

    // Standing still, now and then a front leg lifts and taps the silk.
    if (sp.mode === "pause" && Math.random() < dt * 0.7) {
      const leg = legs[Math.random() < 0.5 ? 0 : 4];
      if (!leg.stepping) {
        leg.stepping = true;
        leg.t = 0;
        leg.dur = 0.22;
        leg.from = { ...leg.foot };
      }
    }
  }

  // ---------- Drawing ----------

  function drawWeb(reveal: number) {
    const { nodes, threads, frame, hubMesh, dews } = web;
    if (!nodes.length) return;
    const hub = nodes[0];
    const frameIn = clamp(reveal / 0.3, 0, 1);
    const spiralIn = clamp((reveal - 0.3) / 0.7, 0, 1) * web.spiralCount;
    const sheenAt = time * 0.45;
    const sheen = (ang: number) => (reduceMotion ? 0 : Math.max(0, Math.cos(angDiff(ang, sheenAt))) ** 10);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = pal.silk;

    // Frame lines and radials, under tension: dead straight.
    ctx.globalAlpha = pal.silkAlpha * frameIn;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    frame.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();

    ctx.lineWidth = 0.75;
    ctx.beginPath();
    for (const t of threads) {
      if (t.spiral) continue;
      ctx.moveTo(nodes[t.a].x, nodes[t.a].y);
      ctx.lineTo(nodes[t.b].x, nodes[t.b].y);
    }
    ctx.stroke();

    ctx.lineWidth = 0.6;
    for (const ring of hubMesh) {
      ctx.beginPath();
      ring.forEach((p, i) => {
        const x = hub.x + p.x;
        const y = hub.y + p.y;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }

    // Capture spiral: finer, sagging a touch toward the hub.
    const spiralPath = (t: Thread) => {
      const a = nodes[t.a];
      const b = nodes[t.b];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx + (hub.x - mx) * 0.04, my + (hub.y - my) * 0.04, b.x, b.y);
    };
    ctx.globalAlpha = pal.silkAlpha * 0.8;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    for (const t of threads) if (t.spiral && t.order < spiralIn) spiralPath(t);
    ctx.stroke();

    // Light catching the silk, sweeping slowly round in the accent colour.
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 0.9;
    for (const t of threads) {
      if (t.spiral && t.order >= spiralIn) continue;
      const w = sheen(t.ang) * frameIn;
      if (w < 0.04) continue;
      ctx.globalAlpha = w * (pal.dark ? 0.6 : 0.45);
      ctx.beginPath();
      if (t.spiral) spiralPath(t);
      else {
        ctx.moveTo(nodes[t.a].x, nodes[t.a].y);
        ctx.lineTo(nodes[t.b].x, nodes[t.b].y);
      }
      ctx.stroke();
    }

    // Dew.
    if (reveal >= 1) {
      for (const d of dews) {
        const a = nodes[d.a];
        const b = nodes[d.b];
        const x = a.x + (b.x - a.x) * d.u;
        const y = a.y + (b.y - a.y) * d.u;
        const glint = sheen(d.ang);
        ctx.globalAlpha = pal.dark ? 0.35 : 0.5;
        ctx.fillStyle = pal.silk;
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = glint > 0.2 ? pal.accent : "#ffffff";
        ctx.beginPath();
        ctx.arc(x - d.r * 0.35, y - d.r * 0.35, d.r * (0.32 + glint * 0.25), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawDragline() {
    if (!onThread() || sp.L <= 0.5) return;
    const a = web.nodes[sp.anchor];
    const tip = toWorld({ x: -TIP, y: 0 });
    ctx.strokeStyle = pal.silk;
    ctx.globalAlpha = Math.min(1, pal.silkAlpha * 1.8);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function seg(p: Vec, q: Vec, width: number, color: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }

  const lerp = (p: Vec, q: Vec, u: number): Vec => ({ x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u });

  let light: Vec = LIGHT; // the light direction in body space, set per frame

  /** One leg in body-local units: coxa/femur, patella+tibia, metatarsus, tarsus. */
  function drawLeg(leg: Leg, shadow: string | null) {
    const h = leg.hip;
    let foot = toLocal(leg.foot);
    if (leg.lift) {
      // A lifted foot reads as reaching outward from the hip.
      const dx = foot.x - h.x;
      const dy = foot.y - h.y;
      const d = Math.hypot(dx, dy) || 1;
      foot = { x: foot.x + (dx / d) * leg.lift * 1.6, y: foot.y + (dy / d) * leg.lift * 1.6 };
    }
    // Sprinting, a planted foot can fall behind further than the leg reaches.
    const reach = (leg.femur + leg.shin) * 0.97;
    const fd = Math.hypot(foot.x - h.x, foot.y - h.y);
    if (fd > reach) foot = lerp(h, foot, reach / fd);
    const k = solveKnee(h, foot, leg.femur, leg.shin * (1 + leg.lift * 0.05));
    const fx = foot.x - k.x;
    const fy = foot.y - k.y;
    const len = Math.hypot(fx, fy) || 1;
    let nx = -fy / len;
    let ny = fx / len;
    if (nx * (k.x + fx / 2) + ny * (k.y + fy / 2) < 0) {
      nx = -nx;
      ny = -ny;
    }
    const m = { x: k.x + fx * 0.52 + nx * len * 0.07, y: k.y + fy * 0.52 + ny * len * 0.07 };
    const tj = lerp(m, foot, 0.74);
    const parts: [Vec, Vec, number][] = [
      [h, k, 1.35],
      [k, m, 1.0],
      [m, tj, 0.62],
      [tj, foot, 0.42],
    ];

    if (shadow) {
      for (const [p, q, w] of parts) seg(p, q, w, shadow);
      return;
    }
    parts.forEach(([p, q, w], i) => {
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      seg(p, q, w, pal.leg);
      seg(p, lerp(p, q, 0.22), w * 0.9, pal.band); // muted band at each joint
      // A thin highlight along the lit side makes each segment read as round.
      let ox = -dy / d;
      let oy = dx / d;
      if (ox * light.x + oy * light.y < 0) {
        ox = -ox;
        oy = -oy;
      }
      const o = { x: ox * w * 0.22, y: oy * w * 0.22 };
      ctx.globalAlpha = 0.45;
      seg({ x: p.x + o.x, y: p.y + o.y }, { x: lerp(p, q, 0.85).x + o.x, y: lerp(p, q, 0.85).y + o.y }, w * 0.28, pal.shine);
      ctx.globalAlpha = 0.75;
      // Setae, raked toward the foot.
      for (const [u, side, len] of LEG_SETAE[i]) {
        const b = lerp(p, q, u);
        const ex = (dx / d) * 0.75 * len + (-dy / d) * side * 0.7 * len;
        const ey = (dy / d) * 0.75 * len + (dx / d) * side * 0.7 * len;
        seg(b, { x: b.x + ex, y: b.y + ey }, 0.13, pal.leg);
      }
      ctx.globalAlpha = 1;
    });
    ctx.fillStyle = pal.leg;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 0.95, 0, Math.PI * 2);
    ctx.fill();
  }

  function ellipse(x: number, y: number, rx: number, ry: number) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }

  function drawSpider() {
    if (!sp.visible) return;
    const c = Math.cos(-sp.heading);
    const s = Math.sin(-sp.heading);
    light = { x: LIGHT.x * c - LIGHT.y * s, y: LIGHT.x * s + LIGHT.y * c };

    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(sp.heading);
    ctx.scale(S, S);
    ctx.lineCap = "round";

    // Cast shadow: a fixed world-space offset (light from the top left),
    // turned into body space so it can reuse the same leg geometry.
    const sh = { x: (1.6 * c - 2.6 * s) / S, y: (1.6 * s + 2.6 * c) / S };
    ctx.save();
    ctx.translate(sh.x, sh.y);
    ctx.globalAlpha = pal.dark ? 0.35 : 0.14;
    for (const leg of legs) drawLeg(leg, "#000");
    ctx.fillStyle = "#000";
    ellipse(-8.6, 0, 7.2, 5.7);
    ctx.fill();
    ellipse(1.6, 0, 4.5, 3.7);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;

    for (const leg of legs) drawLeg(leg, null);

    // Pedipalps, twitching while it waits.
    const twitch = sp.mode === "pause" ? Math.sin(time * 5) * 0.25 : 0;
    for (const side of [1, -1]) {
      const a = { x: 5.0, y: 1.7 * side };
      const b = { x: 6.5, y: (2.9 + twitch) * side };
      const e = { x: 8.0, y: (2.5 + twitch * 1.5) * side };
      seg(a, b, 0.8, pal.leg);
      seg(b, e, 0.65, pal.leg);
      seg(b, lerp(b, e, 0.3), 0.6, pal.band);
    }

    // Abdomen: glossy, with the leaf-shaped folium and the pale cross of a
    // garden spider (tinted lilac to sit in the app's palette).
    ctx.save();
    ctx.translate(-8.6, 0);
    ctx.rotate(sp.abdSway);
    const breathe = 1 + Math.sin(time * 2) * 0.012;
    ctx.scale(breathe, breathe);
    const g = ctx.createRadialGradient(light.x * 3, light.y * 2.4, 0.4, 0, 0, 7.6);
    g.addColorStop(0, "#6c5262");
    g.addColorStop(0.45, "#34252f");
    g.addColorStop(1, "#140d12");
    ctx.fillStyle = g;
    ellipse(0, 0, 7.2, 5.7);
    ctx.fill();

    const folium = [
      [5.2, 0], [3.5, 2.6], [1.8, 2.0], [0.3, 3.0], [-1.4, 2.2], [-2.8, 2.7], [-4.4, 1.6], [-6.4, 0],
    ];
    // Mottling under the pattern.
    ctx.fillStyle = "rgba(8, 4, 7, 0.35)";
    for (const m of ABDOMEN_MOTTLE) {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // The folium's scalloped edge, smoothed through the midpoints.
    const outline = [...folium, ...folium.slice(1, -1).reverse().map(([x, y]) => [x, -y])];
    ctx.beginPath();
    outline.forEach(([x, y], i) => {
      const [nx, ny] = outline[(i + 1) % outline.length];
      const mx = (x + nx) / 2;
      const my = (y + ny) / 2;
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.quadraticCurveTo(x, y, mx, my);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(12, 7, 10, 0.42)";
    ctx.fill();
    ctx.strokeStyle = "rgba(214, 196, 226, 0.22)";
    ctx.lineWidth = 0.35;
    ctx.stroke();

    ctx.fillStyle = "#eadfff";
    ctx.globalAlpha = 0.9;
    for (const [x, y, r] of [
      [3.1, 0, 0.55], [1.6, 0, 0.62], [0.1, 0, 0.5], [1.6, 1.45, 0.5], [1.6, -1.45, 0.5],
      [-1.9, 1.0, 0.38], [-1.9, -1.0, 0.38], [-3.7, 0.7, 0.32], [-3.7, -0.7, 0.32],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Fine hairs fringing the outline.
    ctx.strokeStyle = "#0e090c";
    ctx.lineWidth = 0.17;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    for (const { a, len } of ABDOMEN_HAIRS) {
      const x = Math.cos(a) * 7.0;
      const y = Math.sin(a) * 5.5;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len - 0.35, y + Math.sin(a) * len);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Specular sheen where the light hits.
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.beginPath();
    ctx.ellipse(light.x * 3.4, light.y * 2.6, 2.8, 1.3, Math.atan2(light.y, light.x) + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();

    if (pal.rim) {
      ctx.strokeStyle = pal.accent;
      ctx.globalAlpha = pal.rim;
      ctx.lineWidth = 0.3;
      ellipse(0, 0, 7.2, 5.7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#1a1116";
    ellipse(-7.1, 0, 0.9, 0.7); // spinnerets
    ctx.fill();
    ctx.restore();

    // Pedicel and cephalothorax.
    ctx.fillStyle = "#1a1116";
    ellipse(-1.7, 0, 1.2, 0.9);
    ctx.fill();

    const cg = ctx.createRadialGradient(1.6 + light.x * 1.8, light.y * 1.6, 0.3, 1.6, 0, 4.8);
    cg.addColorStop(0, "#614856");
    cg.addColorStop(0.6, "#2e2029");
    cg.addColorStop(1, "#160e13");
    ctx.fillStyle = cg;
    ellipse(1.6, 0, 4.5, 3.7);
    ctx.fill();
    ctx.strokeStyle = "rgba(205, 185, 205, 0.28)";
    ctx.lineWidth = 0.35;
    ellipse(1.6, 0, 4.0, 3.2);
    ctx.stroke();
    // Thoracic grooves radiating from the fovea.
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 0.25;
    ctx.beginPath();
    for (const a of [0.7, 1.4, 2.1, 2.7]) {
      for (const side of [1, -1]) {
        ctx.moveTo(0.9, 0);
        ctx.lineTo(0.9 + Math.cos(a) * -2.6, Math.sin(a) * 2.6 * side);
      }
    }
    ctx.moveTo(-0.2, 0);
    ctx.lineTo(1.4, 0);
    ctx.stroke();
    if (pal.rim) {
      ctx.strokeStyle = pal.accent;
      ctx.globalAlpha = pal.rim;
      ctx.lineWidth = 0.3;
      ellipse(1.6, 0, 4.5, 3.7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Chelicerae.
    for (const side of [1, -1]) {
      ctx.fillStyle = "#24171e";
      ellipse(5.7, 0.85 * side, 1.25, 0.75);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ellipse(5.7 + light.x * 0.4, 0.85 * side + light.y * 0.3, 0.5, 0.25);
      ctx.fill();
    }

    // Eight eyes, glossy black with a pinpoint highlight.
    for (const [x, y, r] of [[5.25, 0.5, 0.48], [4.35, 0.55, 0.36], [4.85, 1.35, 0.32], [4.1, 1.65, 0.3]]) {
      for (const side of [1, -1]) {
        ctx.fillStyle = "#050305";
        ctx.beginPath();
        ctx.arc(x, y * side, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.dark ? pal.accent : "#ffffff";
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(x + light.x * r * 0.4, y * side + light.y * r * 0.4, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  function paint(target: CanvasRenderingContext2D, clipBottom: number) {
    ctx = target;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (clipBottom <= 0) return;
    ctx.save();
    if (clipBottom < H) {
      ctx.beginPath();
      ctx.rect(0, 0, W, clipBottom);
      ctx.clip();
    }
    drawWeb(reduceMotion ? 1 : clamp(time / BUILD_SECONDS, 0, 1));
    drawDragline();
    drawSpider();
    ctx.restore();
  }

  let navLine = 0;
  const touchable = () => sp.visible && sp.mode !== "flee" && sp.mode !== "fleeClimb" && sp.y > 4;

  function draw() {
    navLine = band();
    paint(backCtx!, H);
    paint(frontCtx!, navLine);

    // Over the nav the spider is on top of the menu, so it gets its own
    // touch target there; elsewhere it's behind the page (see onPagePointer).
    const onTop = touchable() && sp.y < navLine;
    hit.style.visibility = onTop ? "visible" : "hidden";
    if (onTop) hit.style.transform = `translate(${sp.x.toFixed(1)}px, ${sp.y.toFixed(1)}px)`;
  }

  // Behind the page, a touch near the spider shoos it — unless it landed
  // on something interactive, which keeps working as normal.
  const onPagePointer = (e: PointerEvent) => {
    if (!touchable() || e.clientY < navLine) return;
    if (Math.hypot(e.clientX - sp.x, e.clientY - sp.y) > 26) return;
    const el = e.target instanceof Element ? e.target : null;
    if (el?.closest("a, button, input, textarea, select, label, summary, [role='button']")) return;
    shoo();
  };

  function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    time += dt;
    updateWeb(dt);
    updateSpider(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  // ---------- Lifecycle ----------

  const onTheme = () => {
    pal = readPalette(back);
    if (reduceMotion) draw();
  };
  const resize = new ResizeObserver(() => {
    measure();
    if (reduceMotion) draw();
  });
  resize.observe(back);
  window.addEventListener("resize", measure);
  darkQuery.addEventListener("change", onTheme);
  document.addEventListener("pointerdown", onPagePointer, { passive: true });

  measure();
  if (reduceMotion) {
    parkAtHub();
    draw();
  } else {
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  return {
    shoo,
    destroy() {
      cancelAnimationFrame(raf);
      clearTimeout(awayTimer);
      resize.disconnect();
      window.removeEventListener("resize", measure);
      darkQuery.removeEventListener("change", onTheme);
      document.removeEventListener("pointerdown", onPagePointer);
    },
  };
}

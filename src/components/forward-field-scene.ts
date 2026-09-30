import type * as ThreeNS from "three";
import { MARK_PATHS } from "@/lib/brand";

// The WebGL half of the landing hero (see ForwardFieldHero, which owns the
// scroll/pointer state and the DOM copy, and calls render() once per frame).
// World units are CSS pixels with y pointing down, so anything placed here
// lines up with DOM elements positioned from the same Stage math.

export const CHECKPOINTS = ["Requirements", "Design", "Implementation", "Testing", "Documentation"] as const;
export const GATE_AT = [0.12, 0.31, 0.5, 0.69, 0.88];

const MAX_CHEVRONS = 900;
const MAX_SPARKS = 240;
const RISK_SHARE = 0.035;
export const CURSOR_RADIUS = 130;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export type Stage = {
  w: number;
  h: number;
  cy: number;
  spread: number;
  pathMid: number;
  pathAmp: number;
  gateX: number[];
};

export const laneY = (s: Stage, x: number, lane: number, t: number) =>
  s.cy +
  lane * s.spread +
  Math.sin(x * 0.0042 + lane * 2.3 + t * 0.22) * s.h * 0.028 +
  Math.sin(x * 0.0011 - t * 0.09 + lane * 0.8) * s.h * 0.06;

export const pathY = (s: Stage, x: number) => s.pathMid + Math.sin((x / s.w) * Math.PI * 1.5 - 0.6) * s.pathAmp;

// How far the lanes have folded into the single path at x. Sweeps left →
// right, so the fold itself reads as forward motion.
export const foldAt = (s: Stage, x: number, c: number) =>
  easeInOutCubic(clamp01((c - 0.08 - 0.16 * clamp01(x / s.w)) / 0.42));

// A slow camera push that peaks mid-fold and is fully settled (zoom 1) before
// the DOM checkpoint labels fade in, so they still line up with the nodes.
const cameraZoom = (c: number) => 1 + 0.1 * Math.sin(Math.PI * clamp01((c - 0.04) / 0.42));

export type FieldFrame = {
  t: number;
  dt: number;
  c: number;
  /** 0 → 1 as the field launches. */
  fade: number;
  /** Launch boost × scroll warp. */
  speedMul: number;
  /** 0 → 1 with scroll speed; stretches trails and lifts brightness. */
  warp: number;
  textVis: number;
  progressX: number;
  fills: number[];
  current: number;
  pointer: { x: number; y: number; hover: number };
  mask: { x: number; y: number; rx: number; ry: number };
  reduced: boolean;
};

function makeTexture(THREE: typeof ThreeNS, w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  paint(canvas.getContext("2d")!);
  return new THREE.CanvasTexture(canvas);
}

export function createForwardField(THREE: typeof ThreeNS, host: HTMLElement, stage: Stage) {
  const dpr = window.devicePixelRatio || 1;
  // MSAA only where it's needed: on high-DPI screens the extra pixels already
  // smooth the edges, and full-screen MSAA is a real per-frame GPU cost.
  const renderer = new THREE.WebGLRenderer({ antialias: dpr < 1.5, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(dpr, 1.75));
  renderer.setClearColor(0x000000, 0);
  Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
  camera.position.z = 5;

  const LAVENDER = new THREE.Color("#8b85ff");
  const WHITE = new THREE.Color("#ffffff");
  const AMBER = new THREE.Color("#fbbf24");
  const INDIGO = new THREE.Color("#5850ec");

  const additive = (extra: ThreeNS.MeshBasicMaterialParameters = {}) =>
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      ...extra,
    });

  // Soft textures, painted once.
  const trailTex = makeTexture(THREE, 128, 8, (g) => {
    const grad = g.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(255,255,255,1)");
    g.fillStyle = grad;
    g.fillRect(0, 2, 128, 4);
    g.globalAlpha = 0.35;
    g.fillRect(0, 1, 128, 6);
  });
  const glowTex = makeTexture(THREE, 128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
  const gateTex = makeTexture(THREE, 32, 256, (g) => {
    const img = g.createImageData(32, 256);
    for (let y = 0; y < 256; y++) {
      const v = Math.sin((y / 255) * Math.PI);
      for (let x = 0; x < 32; x++) {
        const u = (x - 15.5) / 5;
        const k = (y * 32 + x) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
        img.data[k + 3] = Math.round(Math.exp(-u * u) * v * v * 255);
      }
    }
    g.putImageData(img, 0, 0);
  });

  // The chevron is the logo's arrow, normalised to 1 unit wide.
  const nums = (MARK_PATHS.arrow.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pts: ThreeNS.Vector2[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push(new THREE.Vector2(nums[i], nums[i + 1]));
  const box = new THREE.Box2().setFromPoints(pts);
  const size = box.getSize(new THREE.Vector2());
  const center = box.getCenter(new THREE.Vector2());
  const chevronGeo = new THREE.ShapeGeometry(new THREE.Shape(pts));
  chevronGeo.translate(-center.x, -center.y, 0);
  chevronGeo.scale(1 / size.x, 1 / size.x, 1);

  const trailGeo = new THREE.PlaneGeometry(1, 1);
  trailGeo.translate(-0.5, 0, 0);
  const quadGeo = new THREE.PlaneGeometry(1, 1);

  const dynamicInstances = (geo: ThreeNS.BufferGeometry, mat: ThreeNS.Material, count: number) => {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, WHITE);
    mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  };
  const trails = dynamicInstances(trailGeo, additive({ map: trailTex }), MAX_CHEVRONS);
  const chevrons = dynamicInstances(chevronGeo, additive(), MAX_CHEVRONS);
  const sparks = dynamicInstances(quadGeo, additive({ map: glowTex }), MAX_SPARKS);
  const cm = chevrons.instanceMatrix.array as Float32Array;
  const tm = trails.instanceMatrix.array as Float32Array;
  const sm = sparks.instanceMatrix.array as Float32Array;
  const cc = chevrons.instanceColor!.array as Float32Array;
  const tc = trails.instanceColor!.array as Float32Array;
  const sc = sparks.instanceColor!.array as Float32Array;

  // Writes a 2D rotate+scale+translate into a column-major instance matrix.
  const put2D = (m: Float32Array, i: number, x: number, y: number, cos: number, sin: number, sx: number, sy: number) => {
    const o = i * 16;
    m[o] = cos * sx;
    m[o + 1] = sin * sx;
    m[o + 4] = -sin * sy;
    m[o + 5] = cos * sy;
    m[o + 10] = 1;
    m[o + 12] = x;
    m[o + 13] = y;
    m[o + 15] = 1;
  };

  // Per-chevron state.
  const px = new Float32Array(MAX_CHEVRONS);
  const lane = new Float32Array(MAX_CHEVRONS);
  const depth = new Float32Array(MAX_CHEVRONS);
  const speed = new Float32Array(MAX_CHEVRONS);
  const phase = new Float32Array(MAX_CHEVRONS);
  const riskDir = new Float32Array(MAX_CHEVRONS);
  const rescue = new Float32Array(MAX_CHEVRONS);
  const risk = new Uint8Array(MAX_CHEVRONS);

  const spawn = (i: number, x: number) => {
    risk[i] = Math.random() < RISK_SHARE ? 1 : 0;
    depth[i] = risk[i] ? 0.5 + Math.random() * 0.5 : Math.pow(Math.random(), 1.5);
    lane[i] = (Math.random() + Math.random() - 1) * 1.1;
    speed[i] = lerp(22, 92, depth[i]) * (0.85 + Math.random() * 0.3);
    phase[i] = Math.random() * Math.PI * 2;
    riskDir[i] = Math.random() < 0.5 ? -1 : 1;
    rescue[i] = 0;
    px[i] = x;
  };
  for (let i = 0; i < MAX_CHEVRONS; i++) spawn(i, -60 + Math.random() * (window.innerWidth + 120));

  // Spark pool for checkpoint bursts.
  const spX = new Float32Array(MAX_SPARKS);
  const spY = new Float32Array(MAX_SPARKS);
  const spVX = new Float32Array(MAX_SPARKS);
  const spVY = new Float32Array(MAX_SPARKS);
  const spLife = new Float32Array(MAX_SPARKS);
  const spMax = new Float32Array(MAX_SPARKS).fill(1);
  const spSize = new Float32Array(MAX_SPARKS);
  let spNext = 0;

  // Checkpoint gates (field phase), nodes + shockwaves (path phase).
  const ringGeo = new THREE.RingGeometry(0.8, 1, 48);
  const waveGeo = new THREE.RingGeometry(0.975, 1, 96);
  const dotGeo = new THREE.CircleGeometry(1, 32);
  const gates = GATE_AT.map(() => {
    const line = new THREE.Mesh(quadGeo, additive({ map: gateTex, color: LAVENDER }));
    const halo = new THREE.Mesh(quadGeo, additive({ map: glowTex, color: INDIGO }));
    const ring = new THREE.Mesh(ringGeo, additive({ color: LAVENDER }));
    const dot = new THREE.Mesh(dotGeo, additive({ color: WHITE }));
    const wave = new THREE.Mesh(waveGeo, additive({ color: WHITE, opacity: 0 }));
    scene.add(line, halo, ring, dot, wave);
    return { line, halo, ring, dot, wave, energy: 0, waveT: 9, waveBig: false };
  });

  // The path: a faint full-length line and a brighter "done" line sharing
  // one position buffer, each with its own draw range.
  const PATH_POINTS = 220;
  const pathPos = new THREE.BufferAttribute(new Float32Array(PATH_POINTS * 3), 3);
  const pathGeo = new THREE.BufferGeometry().setAttribute("position", pathPos);
  const doneGeo = new THREE.BufferGeometry().setAttribute("position", pathPos);
  const lineMat = (color: ThreeNS.Color) =>
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
  const pathLine = new THREE.Line(pathGeo, lineMat(LAVENDER));
  const doneLine = new THREE.Line(doneGeo, lineMat(WHITE));
  pathLine.frustumCulled = doneLine.frustumCulled = false;
  scene.add(pathLine, doneLine);

  const cursorGlow = new THREE.Mesh(quadGeo, additive({ map: glowTex, color: INDIGO }));
  scene.add(cursorGlow);

  let active = MAX_CHEVRONS;
  let flash = 0;
  const opacityOf = (m: ThreeNS.Mesh | ThreeNS.Line) => m.material as ThreeNS.MeshBasicMaterial;
  // Weaker machines get a thinner field rather than a choppy one.
  const budget = (navigator.hardwareConcurrency || 8) <= 4 ? 0.6 : 1;

  const layout = () => {
    renderer.setSize(stage.w, stage.h, false);
    camera.right = stage.w;
    camera.bottom = stage.h;
    active = Math.round(Math.min(MAX_CHEVRONS, Math.max(260, (stage.w * stage.h) / 1400)) * budget);
    chevrons.count = trails.count = active;
    for (let i = 0; i < PATH_POINTS; i++) {
      const x = -10 + ((stage.w + 20) * i) / (PATH_POINTS - 1);
      pathPos.setXYZ(i, x, pathY(stage, x), 0);
    }
    pathPos.needsUpdate = true;
  };

  /** A checkpoint completes: shockwave + sparks. `big` for the final one. */
  const burst = (gi: number, big = false) => {
    const x = stage.gateX[gi];
    const y = pathY(stage, x);
    const g = gates[gi];
    g.waveT = 0;
    g.waveBig = big;
    const n = big ? 90 : 34;
    for (let k = 0; k < n; k++) {
      const i = spNext;
      spNext = (spNext + 1) % MAX_SPARKS;
      const a = Math.random() * Math.PI * 2;
      const v = (big ? 120 : 70) + Math.random() * (big ? 320 : 170);
      spX[i] = x;
      spY[i] = y;
      spVX[i] = Math.cos(a) * v;
      spVY[i] = Math.sin(a) * v;
      spMax[i] = spLife[i] = 0.55 + Math.random() * (big ? 0.9 : 0.5);
      spSize[i] = 5 + Math.random() * (big ? 12 : 8);
    }
    if (big) flash = 1;
  };

  const render = (f: FieldFrame) => {
    const s = stage;
    const { t, dt, c, fade, pointer, mask } = f;
    const move = f.reduced ? 0 : dt * f.speedMul;
    const k = Math.pow(Math.min(1, s.w / 1100), 0.35);
    const mid = foldAt(s, s.w / 2, c);
    // On phones the headline spans nearly the full width, so a deep quiet
    // zone would blank the whole field — go gentler there.
    const quietDepth = s.w < 640 ? 0.5 : 0.8;

    // Screen → world under the camera push (it zooms about the centre).
    const zoom = f.reduced ? 1 : cameraZoom(c);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    const toWorldX = (x: number) => s.w / 2 + (x - s.w / 2) / zoom;
    const toWorldY = (y: number) => s.h / 2 + (y - s.h / 2) / zoom;
    const pX = toWorldX(pointer.x);
    const pY = toWorldY(pointer.y);
    const mX = toWorldX(mask.x);
    const mY = toWorldY(mask.y);

    for (let i = 0; i < active; i++) {
      const d = depth[i];
      const prevX = px[i];
      const rescued = risk[i] ? Math.max(rescue[i], foldAt(s, prevX, c)) : 1;
      const sp = speed[i] * (risk[i] ? lerp(0.42, 1, rescued) : 1);
      let x = prevX + sp * move * lerp(0.7, 1.15, d);
      if (x > s.w + 60) {
        spawn(i, -60 - Math.random() * 60);
        x = px[i];
      }
      px[i] = x;

      // Resting position (before the cursor), plus a probe just ahead for heading.
      const rest = (xx: number) => {
        const e = foldAt(s, xx, c);
        const off = risk[i]
          ? (1 - rescued) * (riskDir[i] * s.spread * 0.18 + Math.sin(t * 0.8 + phase[i]) * s.h * 0.02)
          : 0;
        const free = laneY(s, xx, lane[i], t) + off;
        const onPath = pathY(s, xx) + lane[i] * s.h * 0.016 * (0.4 + d);
        return lerp(free, onPath, e);
      };
      const e = foldAt(s, x, c);
      let y = rest(x);
      let angle = Math.atan2(rest(x + 3) - y, 3);
      if (risk[i]) angle += (1 - rescued) * Math.sin(t * 1.7 + phase[i]) * 0.35;

      // Cursor: lift chevrons aside, brighten them, and rescue stragglers.
      const dxp = x - pX;
      const dyp = y - pY;
      const infl = pointer.hover * Math.exp(-(dxp * dxp + dyp * dyp) / (CURSOR_RADIUS * CURSOR_RADIUS));
      y += (dyp / (Math.abs(dyp) + 14)) * infl * 30 * (1 - e * 0.5);
      if (risk[i] && infl > 0.2) rescue[i] = Math.min(1, rescue[i] + dt * 2.2);

      // Brightness: depth, a quiet zone behind the headline, the unlit
      // stretch of path ahead of the progress front, and the launch fade.
      const mx = (x - mX) / mask.rx;
      const my = (y - mY) / mask.ry;
      const quiet = 1 - quietDepth * Math.exp(-(mx * mx + my * my)) * f.textVis;
      const ahead = 1 - 0.65 * e * smoothstep(f.progressX - 10, f.progressX + 90, x);
      let b = lerp(0.16, 1, d) * quiet * ahead * lerp(1, 0.55, e) * fade * (1 + f.warp * 0.35);
      if (risk[i]) b *= lerp(0.85, 1, rescued);

      const base = risk[i] ? rescued : 1;
      const hi = Math.min(1, infl * 0.75 + d * 0.12 + f.warp * 0.2);
      const r = lerp(lerp(AMBER.r, LAVENDER.r, base), WHITE.r, hi) * b;
      const g = lerp(lerp(AMBER.g, LAVENDER.g, base), WHITE.g, hi) * b;
      const bl = lerp(lerp(AMBER.b, LAVENDER.b, base), WHITE.b, hi) * b;

      const sz = lerp(4.5, 13, d) * k * (1 + infl * 0.3);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      put2D(cm, i, x, y, cos, sin, sz, sz);
      const len = Math.min(220, sp * (f.reduced ? 0.25 : 0.22 * f.speedMul) * (0.6 + d) * (1 + f.warp * 1.5)) * k;
      put2D(tm, i, x - cos * sz * 0.3, y - sin * sz * 0.3, cos, sin, len, sz * 0.22);

      const ci = i * 3;
      cc[ci] = r;
      cc[ci + 1] = g;
      cc[ci + 2] = bl;
      tc[ci] = r * 0.45;
      tc[ci + 1] = g * 0.45;
      tc[ci + 2] = bl * 0.45;

      // Gates flare faintly as the stream passes through them.
      for (let gi = 0; gi < s.gateX.length; gi++) {
        if (prevX < s.gateX[gi] && x >= s.gateX[gi]) gates[gi].energy += 0.012 * b;
      }
    }
    chevrons.instanceMatrix.needsUpdate = trails.instanceMatrix.needsUpdate = true;
    chevrons.instanceColor!.needsUpdate = trails.instanceColor!.needsUpdate = true;

    // Sparks.
    const drag = Math.exp(-dt * 2.6);
    for (let i = 0; i < MAX_SPARKS; i++) {
      if (spLife[i] <= 0) {
        put2D(sm, i, -999, -999, 1, 0, 0, 0);
        continue;
      }
      spLife[i] -= dt;
      spVX[i] *= drag;
      spVY[i] *= drag;
      spX[i] += spVX[i] * dt;
      spY[i] += spVY[i] * dt;
      const life = clamp01(spLife[i] / spMax[i]);
      const sz = spSize[i] * (0.4 + 0.6 * life) * k;
      put2D(sm, i, spX[i], spY[i], 1, 0, sz, sz);
      const a = life * life * fade;
      sc[i * 3] = lerp(LAVENDER.r, WHITE.r, life) * a;
      sc[i * 3 + 1] = lerp(LAVENDER.g, WHITE.g, life) * a;
      sc[i * 3 + 2] = lerp(LAVENDER.b, WHITE.b, life) * a;
    }
    sparks.instanceMatrix.needsUpdate = true;
    sparks.instanceColor!.needsUpdate = true;

    gates.forEach((gate, i) => {
      const x = s.gateX[i];
      const e = foldAt(s, x, c);
      gate.energy *= Math.exp(-dt * 1.6);
      const lit = f.fills[i];
      const isCurrent = i === f.current;
      const pulse = isCurrent && !f.reduced ? 0.5 + 0.5 * Math.sin(t * 2.4) : 0;

      const mx = (x - mX) / mask.rx;
      const quiet = 1 - 0.85 * Math.exp(-mx * mx) * f.textVis;
      gate.line.position.set(x, lerp(s.cy, pathY(s, x), e), 0);
      gate.line.scale.set(26 * k, lerp(s.spread * 2.4, 8, e), 1);
      opacityOf(gate.line).opacity = (0.07 + Math.min(1, gate.energy) * 0.16 + f.warp * 0.08) * (1 - e) * quiet * fade;

      const y = pathY(s, x);
      const nodeVis = smoothstep(0.35, 1, e) * fade;
      gate.ring.position.set(x, y, 0);
      gate.ring.scale.setScalar((9 + pulse * 1.5) * k);
      opacityOf(gate.ring).opacity = nodeVis * lerp(0.45, 0.95, Math.max(lit, isCurrent ? 0.5 : 0));
      gate.dot.position.set(x, y, 0);
      gate.dot.scale.setScalar(Math.max(0.001, 5.5 * lit * k));
      opacityOf(gate.dot).opacity = nodeVis * lit;
      gate.halo.position.set(x, y, 0);
      gate.halo.scale.setScalar(90 * k);
      opacityOf(gate.halo).opacity = nodeVis * (lit * 0.45 + pulse * 0.25);

      gate.waveT += dt;
      const wd = gate.waveBig ? 1.3 : 0.9;
      const wp = clamp01(gate.waveT / wd);
      gate.wave.position.set(x, y, 0);
      gate.wave.scale.setScalar((10 + easeOutCubic(wp) * (gate.waveBig ? 190 : 80)) * k);
      opacityOf(gate.wave).opacity = wp < 1 ? (1 - wp) * (1 - wp) * 0.85 * fade : 0;
    });

    flash *= Math.exp(-dt * 1.8);
    opacityOf(pathLine).opacity = (0.16 + flash * 0.4) * mid * fade;
    const doneCount = Math.round(clamp01((f.progressX + 10) / (s.w + 20)) * (PATH_POINTS - 1)) + 1;
    doneGeo.setDrawRange(0, doneCount);
    opacityOf(doneLine).opacity = Math.min(1, 0.55 + flash * 0.45) * mid * fade;

    cursorGlow.position.set(pX, pY, 0);
    cursorGlow.scale.setScalar(CURSOR_RADIUS * 2.6);
    opacityOf(cursorGlow).opacity = 0.09 * pointer.hover * fade;

    renderer.render(scene, camera);
  };

  const dispose = () => {
    renderer.dispose();
    renderer.domElement.remove();
    scene.traverse((o) => {
      const m = o as ThreeNS.Mesh;
      m.geometry?.dispose();
      (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((mat) => mat.dispose());
    });
    [trailTex, glowTex, gateTex].forEach((tex) => tex.dispose());
  };

  return { render, layout, burst, dispose };
}

// The Avance mark — a typewriter-style "A" (slab feet, flat apex serif) whose
// crossbar is a forward arrow "›" that pierces the right leg. Drawn on a 64×64
// grid. Kept as raw path data (not a component) because three consumers need
// the same geometry: the <LogoMark> SVG, the intro's stroke-draw animation, and
// the intro's particle handoff, which rasterises these via Path2D.
export const MARK_VIEWBOX = "0 0 64 64";

export const MARK_PATHS = {
  leftLeg: "M26.4 9H30.8L17.4 52H13Z",
  rightLeg: "M27.2 9H35.4L50.8 52H42.2Z",
  apex: "M22.5 7.6H35.4V11.4H22.5Z",
  leftFoot: "M8 50.6H22V55H8Z",
  rightFoot: "M37.5 50.6H56V55H37.5Z",
  arrow: "M21.38 25.09L49.29 36.32L14.45 47.33L16.49 40.82L32.71 35.68L19.71 30.46Z",
} as const;

// Everything except the arrow — the part the intro draws first.
export const MARK_FRAME_PATHS = [
  MARK_PATHS.leftLeg,
  MARK_PATHS.rightLeg,
  MARK_PATHS.apex,
  MARK_PATHS.leftFoot,
  MARK_PATHS.rightFoot,
];

export const BRAND_TAGLINE = "A game layer for real-world work";

// sessionStorage key + <html data-intro> contract shared by the inline
// pre-paint script (layout.tsx) and the intro overlay.
export const INTRO_STORAGE_KEY = "avance:intro-played";
export const INTRO_DONE_EVENT = "avance:intro-done";

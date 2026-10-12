import type { CSSProperties, ReactNode } from "react";
import "./classroom-scene.css";

// The Avance Schools classroom — total chaos the moment the bell rings: a
// giant teacher lunging through the room with a kid dangling from one fist,
// a show-off dancing on a desk, a brawl, a science experiment, a puppy in a
// cap, a sleeper blowing a snot bubble, and one calm girl still writing.
// Ink-outlined, cel-shaded anime style, seen from the back of the room with
// the corridor through the glass wall on the right.
//
// Everything moves slowly, in CSS (classroom-scene.css). Every arm and leg is
// a joint swinging between two angles, so hands travel the way each pose
// points. Angles are degrees in SVG terms: a hanging limb is 0; positive
// swings it toward the viewer's left, 180 is straight up.
//
// The art is 1600×900 (16:9). Pass a viewBox to show a crop of it.

const INK = "#23180c";
const SHIRT = "#fdfcf6";
const SHIRT_SHADE = "#dfe4ee";
const NAVY = "#24345a";
const SKIN = ["#f1c9a5", "#d9a074", "#c68a5a", "#a86b43", "#e8b896"];

type Swing = [number, number];

function swing(range: Swing, dur: number, delay = 0): CSSProperties {
  return {
    "--r0": `${range[0]}deg`,
    "--r1": `${range[1]}deg`,
    "--dur": `${dur}s`,
    "--delay": `${delay}s`,
  } as CSSProperties;
}

/** A limb segment from the joint (0,0) straight down, inked by a fatter stroke underneath. */
function Segment({ len, width, fill }: { len: number; width: number; fill: string }) {
  return (
    <>
      <path d={`M0 0V${len}`} stroke={INK} strokeWidth={width + 6} strokeLinecap="round" />
      <path d={`M0 0V${len}`} stroke={fill} strokeWidth={width} strokeLinecap="round" />
    </>
  );
}

type ArmPose = { a: Swing; e: Swing; dur: number; delay?: number; hold?: ReactNode; fist?: boolean };

function Arm({
  x,
  y,
  pose,
  skin,
  sleeve = SHIRT,
  upper = 46,
  fore = 42,
  width = 18,
}: {
  x: number;
  y: number;
  pose: ArmPose;
  skin: string;
  sleeve?: string;
  upper?: number;
  fore?: number;
  width?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="cs-swing" style={swing(pose.a, pose.dur, pose.delay)}>
        <Segment len={upper} width={width} fill={skin} />
        <Segment len={upper * 0.62} width={width + 2} fill={sleeve} />
        <g transform={`translate(0 ${upper})`}>
          <g className="cs-swing" style={swing(pose.e, pose.dur * 0.85, (pose.delay ?? 0) - 0.4)}>
            <Segment len={fore} width={width - 2} fill={skin} />
            <circle cy={fore + 3} r={width * (pose.fist ? 0.85 : 0.62)} fill={skin} stroke={INK} strokeWidth={3} />
            {pose.hold && <g transform={`translate(0 ${fore + 6})`}>{pose.hold}</g>}
          </g>
        </g>
      </g>
    </g>
  );
}

// ---------- Faces and hair (facing the viewer) ----------

type Expr = "laugh" | "yell" | "calm" | "focus" | "shock" | "smug" | "bliss";

function OpenEye({ x, look = 0, small }: { x: number; look?: number; small?: boolean }) {
  return (
    <g transform={`translate(${x} 4)`}>
      <ellipse rx={7.5} ry={9.5} fill="#ffffff" stroke={INK} strokeWidth={2.5} />
      <ellipse cx={look} cy={1.5} rx={small ? 2.6 : 5} ry={small ? 3 : 6.5} fill="#2a1d14" />
      {!small && <circle cx={look - 1.8} cy={-1.5} r={2} fill="#ffffff" />}
      <path d="M-9 -7Q0 -13 9 -7" stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </g>
  );
}

/** A face centred on (0,0); dir turns it toward the viewer's right (+) or left (−). */
function Face({ skin, dir = 0, expr, blush }: { skin: string; dir?: number; expr: Expr; blush?: boolean }) {
  const ex = dir * 9;
  const l = -15 + ex;
  const r = 15 + ex;
  const look = dir * 2.5;
  const closed = (x: number) => <path d={`M${x - 7} 6Q${x} -3 ${x + 7} 6`} stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
  const down = (x: number) => (
    <path d={`M${x - 8} 3Q${x} 9 ${x + 8} 3M${x - 8} 3l-3 -3M${x + 8} 3l3 -3`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
  );
  let eyes: ReactNode;
  let mouth: ReactNode;
  let brows: ReactNode = null;
  switch (expr) {
    case "laugh":
      eyes = (
        <>
          {closed(l)}
          {closed(r)}
        </>
      );
      mouth = (
        <g transform={`translate(${ex} 0)`}>
          <path d="M-17 20Q0 48 17 20Z" fill="#7a2424" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <path d="M-15 21H15L13 26H-13Z" fill="#ffffff" />
          <ellipse cy={36} rx={7} ry={4} fill="#e8707a" />
        </g>
      );
      break;
    case "yell":
      brows = <path d={`M${l - 10} -14L${l + 7} -6M${r + 10} -14L${r - 7} -6`} stroke={INK} strokeWidth={4.5} strokeLinecap="round" />;
      eyes = (
        <>
          <OpenEye x={l} look={look} small />
          <OpenEye x={r} look={look} small />
        </>
      );
      mouth = (
        <g transform={`translate(${ex} 0)`}>
          <path d="M-15 20Q0 14 15 20Q13 46 0 48Q-13 46 -15 20Z" fill="#7a2424" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <path d="M-13 20Q0 16 13 20L12 25H-12Z" fill="#ffffff" />
        </g>
      );
      break;
    case "calm":
      eyes = (
        <>
          <OpenEye x={l} look={look} />
          <OpenEye x={r} look={look} />
          <path d={`M${l - 8} -2H${l + 8}M${r - 8} -2H${r + 8}`} stroke={skin} strokeWidth={9} />
          <path d={`M${l - 9} 1Q${l} -3 ${l + 9} 1M${r - 9} 1Q${r} -3 ${r + 9} 1`} stroke={INK} strokeWidth={3.5} fill="none" />
        </>
      );
      mouth = <path d={`M${ex - 7} 26Q${ex} 31 ${ex + 7} 26`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />;
      break;
    case "focus":
      eyes = (
        <>
          {down(l)}
          {down(r)}
        </>
      );
      mouth = <path d={`M${ex - 5} 28H${ex + 5}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />;
      break;
    case "shock":
      brows = <path d={`M${l - 8} -14Q${l} -20 ${l + 8} -14M${r - 8} -14Q${r} -20 ${r + 8} -14`} stroke={INK} strokeWidth={3.5} fill="none" />;
      eyes = (
        <>
          <OpenEye x={l} small />
          <OpenEye x={r} small />
        </>
      );
      mouth = <ellipse cx={ex} cy={30} rx={7} ry={9} fill="#7a2424" stroke={INK} strokeWidth={3} />;
      break;
    case "smug":
      brows = <path d={`M${l - 9} -10L${l + 7} -12M${r - 7} -14L${r + 9} -8`} stroke={INK} strokeWidth={4} strokeLinecap="round" />;
      eyes = (
        <>
          {closed(l)}
          <OpenEye x={r} look={look} />
        </>
      );
      mouth = <path d={`M${ex - 9} 26Q${ex + 4} 32 ${ex + 11} 22`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />;
      break;
    case "bliss":
      eyes = (
        <>
          {closed(l)}
          {closed(r)}
        </>
      );
      mouth = <circle cx={ex} cy={28} r={4} fill="#7a2424" stroke={INK} strokeWidth={2.5} />;
      break;
  }
  return (
    <g>
      <circle cx={-38} cy={6} r={8} fill={skin} stroke={INK} strokeWidth={3} />
      <circle cx={38} cy={6} r={8} fill={skin} stroke={INK} strokeWidth={3} />
      <path
        d={`M-38 -4C-38 -46 38 -46 38 -4C38 22 ${18 + ex} 40 ${ex} 43C${-18 + ex} 40 -38 22 -38 -4Z`}
        fill={skin}
        stroke={INK}
        strokeWidth={3}
      />
      {blush && (
        <g fill="#f08a8a" opacity={0.55}>
          <ellipse cx={l - 4} cy={18} rx={7} ry={4} />
          <ellipse cx={r + 4} cy={18} rx={7} ry={4} />
        </g>
      )}
      {brows}
      {eyes}
      <path d={`M${ex * 1.5} 12l${dir < 0 ? -4 : 4} 7h${dir < 0 ? 4 : -4}`} stroke={INK} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
      {mouth}
    </g>
  );
}

type FrontHair = "messy" | "long" | "bob" | "afro" | "curly" | "buzz" | "twin";

/** Hair behind the head (drawn before the body) and in front of it (after the face). */
function hairFor(style: FrontHair, color: string): { back: ReactNode; front: ReactNode } {
  const ink = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const };
  const shine = (
    <path d="M-20 -40Q-4 -48 14 -42" stroke="#ffffff" strokeOpacity={0.3} strokeWidth={5} fill="none" strokeLinecap="round" />
  );
  switch (style) {
    case "messy":
      return {
        back: null,
        front: (
          <>
            <path
              d="M-42 -2L-48 -28L-32 -34L-38 -56L-14 -46L-8 -66L8 -48L24 -62L26 -42L46 -46L40 -24L44 -2Q34 -24 18 -18L10 -30L0 -18L-10 -30L-20 -16Q-32 -22 -42 -2Z"
              fill={color}
              {...ink}
            />
            {shine}
          </>
        ),
      };
    case "long":
      return {
        back: <path d="M-46 -6C-52 -62 52 -62 46 -6L58 110Q0 124 -58 110Z" fill={color} {...ink} />,
        front: (
          <>
            <path d="M-42 -4C-46 -54 46 -54 42 -4L34 -12L26 -2L16 -14L4 -4L-6 -16L-16 -4L-26 -14L-34 -2Z" fill={color} {...ink} />
            <path d="M-42 -6Q-50 40 -42 82L-30 80Q-36 40 -32 0Z" fill={color} {...ink} />
            <path d="M42 -6Q50 40 42 82L30 80Q36 40 32 0Z" fill={color} {...ink} />
            {shine}
          </>
        ),
      };
    case "bob":
      return {
        back: <path d="M-46 -8C-52 -62 52 -62 46 -8Q58 34 44 50Q0 58 -44 50Q-58 34 -46 -8Z" fill={color} {...ink} />,
        front: (
          <>
            <path d="M-42 -2C-48 -56 44 -58 44 -6Q20 -30 -6 -22Q-26 -18 -42 -2Z" fill={color} {...ink} />
            {shine}
          </>
        ),
      };
    case "afro":
      return {
        back: (
          <g fill={color} {...ink}>
            {[
              [-56, -30],
              [-40, -62],
              [-8, -78],
              [28, -70],
              [54, -42],
              [58, -8],
              [-60, 4],
            ].map(([cx, cy]) => (
              <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={30} />
            ))}
            <circle cy={-30} r={52} stroke="none" />
          </g>
        ),
        front: <path d="M-38 -6Q-30 -30 0 -32Q30 -30 38 -6Q30 -16 0 -18Q-30 -16 -38 -6Z" fill={color} {...ink} />,
      };
    case "curly":
      return {
        back: null,
        front: (
          <g fill={color} {...ink}>
            {[-34, -18, 0, 18, 34].map((cx, i) => (
              <circle key={cx} cx={cx} cy={-34 - (i % 2) * 8} r={16} />
            ))}
            <path d="M-40 -4Q-44 -26 -30 -34H30Q44 -26 40 -4Q24 -20 0 -20Q-24 -20 -40 -4Z" />
          </g>
        ),
      };
    case "buzz":
      return {
        back: null,
        front: (
          <>
            <path d="M-40 -6C-44 -52 44 -52 40 -6Q30 -22 0 -24Q-30 -22 -40 -6Z" fill={color} {...ink} />
            <path d="M-26 -38l4 -8M-8 -44l2 -8M10 -44l2 -8M26 -38l4 -6" stroke={INK} strokeWidth={2.5} />
          </>
        ),
      };
    case "twin":
      return {
        back: (
          <g fill={color} {...ink}>
            <path d="M-40 -34Q-80 -20 -76 40Q-62 10 -46 -6Z" />
            <path d="M40 -34Q80 -20 76 40Q62 10 46 -6Z" />
          </g>
        ),
        front: (
          <>
            <path d="M-42 -4C-46 -54 46 -54 42 -4Q30 -26 6 -20L0 -30L-6 -20Q-30 -26 -42 -4Z" fill={color} {...ink} />
            <circle cx={-44} cy={-32} r={7} fill="#d6453d" stroke={INK} strokeWidth={2.5} />
            <circle cx={44} cy={-32} r={7} fill="#d6453d" stroke={INK} strokeWidth={2.5} />
          </>
        ),
      };
  }
}

// ---------- Desks and clutter ----------

/** A school desk facing the viewer (light top, steel frame, yellow name tag). */
function DeskFront({ items }: { items?: ReactNode }) {
  return (
    <g>
      <path d="M-88 -12V46M88 -12V46" stroke={INK} strokeWidth={10} strokeLinecap="round" />
      <path d="M-88 -12V46M88 -12V46" stroke="#9aa3b2" strokeWidth={5} strokeLinecap="round" />
      <path d="M-90 -32H90V-12H-90Z" fill="#6d7686" stroke={INK} strokeWidth={3} />
      <path d="M-96 -40H96V-32H-96Z" fill="#d9a35f" stroke={INK} strokeWidth={3} />
      <path d="M-84 -54H84L96 -40H-96Z" fill="#f0c27b" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <rect x={-14} y={-30} width={28} height={10} fill="#ffe14d" stroke={INK} strokeWidth={2} />
      {items}
    </g>
  );
}

/** A desk seen from behind its sitter: just the top and front lip peeking past them. */
function DeskBack({ items }: { items?: ReactNode }) {
  return (
    <g>
      <path d="M-118 -84H118V-58H-118Z" fill="#d9a35f" stroke={INK} strokeWidth={3} />
      <path d="M-105 -100H105L118 -84H-118Z" fill="#f0c27b" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      {items}
    </g>
  );
}

const Books = ({ x = 40, y = -54, tall }: { x?: number; y?: number; tall?: boolean }) => (
  <g transform={`translate(${x} ${y})`}>
    {(tall ? ["#d6453d", "#2f7fb8", "#f5a915", "#4fa35a", "#9b59b6", "#2f7fb8"] : ["#d6453d", "#2f7fb8", "#f5a915"]).map((c, i) => (
      <rect key={i} x={(i % 2) * 4 - 2} y={-12 - i * 11} width={38 - (i % 3) * 3} height={11} fill={c} stroke={INK} strokeWidth={2.5} />
    ))}
  </g>
);

const Bento = ({ x = -70, y = -54 }: { x?: number; y?: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={0} y={-16} width={40} height={16} rx={3} fill="#e85d8a" stroke={INK} strokeWidth={2.5} />
    <path d="M20 -16V0" stroke={INK} strokeWidth={2} />
    <path d="M-4 -22L44 -10" stroke="#7a4d24" strokeWidth={3} />
  </g>
);

const Orange = ({ x = 0, y = 0, r = 9 }: { x?: number; y?: number; r?: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r={r} fill="#f28c28" stroke={INK} strokeWidth={2.5} />
    <path d={`M0 ${-r}q4 -6 9 -4q-4 5 -9 4`} fill="#4fa35a" stroke={INK} strokeWidth={1.5} />
  </g>
);

const Paper = ({ x = -40, y = -54, score }: { x?: number; y?: number; score?: string }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 0L8 -9H52L46 0Z" fill="#ffffff" stroke={INK} strokeWidth={2} />
    {score && <path d="M24 -4h12" stroke="#d6453d" strokeWidth={2} />}
  </g>
);

const Palette = ({ x = 30, y = -56 }: { x?: number; y?: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse rx={24} ry={8} fill="#f6e7c8" stroke={INK} strokeWidth={2.5} />
    {["#d6453d", "#2f7fb8", "#f5a915", "#4fa35a"].map((c, i) => (
      <circle key={c} cx={-14 + i * 9} cy={-1} r={3} fill={c} />
    ))}
  </g>
);

// ---------- Kids ----------

/** Seated behind a desk, facing the viewer. Local (0,0) is the floor under the desk's front. */
function KidFront({
  x,
  y,
  s,
  skin,
  hair,
  hairColor = "#1d1a24",
  expr,
  dir = 0,
  girl,
  left,
  right,
  desk,
  extra,
  headTilt,
  overHead,
}: {
  x: number;
  y: number;
  s: number;
  skin: string;
  hair: FrontHair;
  hairColor?: string;
  expr: Expr;
  dir?: number;
  girl?: boolean;
  left: ArmPose;
  right: ArmPose;
  desk?: ReactNode;
  extra?: ReactNode;
  headTilt?: Swing;
  overHead?: ReactNode;
}) {
  const { back, front } = hairFor(hair, hairColor);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g transform="translate(0 -160)">{back}</g>
      <path d="M-46 -112Q0 -124 46 -112Q56 -100 56 -84L54 -20H-54L-56 -84Q-56 -100 -46 -112Z" fill={SHIRT} stroke={INK} strokeWidth={3} />
      <path d={dir < 0 ? "M-46 -112Q-56 -100 -56 -84L-54 -20H-20Z" : "M46 -112Q56 -100 56 -84L54 -20H20Z"} fill={SHIRT_SHADE} />
      <rect x={-11} y={-138} width={22} height={28} fill={skin} stroke={INK} strokeWidth={3} />
      <path d="M-18 -120L0 -104L18 -120L10 -126L0 -114L-10 -126Z" fill={SHIRT} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {girl ? (
        <path d="M0 -104l-15 -8v16zM0 -104l15 -8v16z" fill="#d6453d" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      ) : (
        <path d="M-5 -106H5L8 -70L0 -62L-8 -70Z" fill={NAVY} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      )}
      <g transform="translate(0 -160)">
        <g className={headTilt ? "cs-swing" : undefined} style={headTilt ? swing(headTilt, 3.2) : undefined}>
          <Face skin={skin} dir={dir} expr={expr} blush={girl} />
          {front}
          {overHead}
        </g>
      </g>
      <DeskFront items={desk} />
      <Arm x={-48} y={-106} pose={left} skin={skin} />
      <Arm x={48} y={-106} pose={right} skin={skin} />
      {extra}
    </g>
  );
}

type BackHair = "short" | "spiky" | "long" | "ponytail";

/** Seated facing the board, seen from behind. Local (0,0) is the floor under the chair. */
function KidBack({
  x,
  y,
  s,
  hair,
  hairColor = "#1d1a24",
  skin,
  girl,
  left,
  right,
  desk,
  extra,
}: {
  x: number;
  y: number;
  s: number;
  hair: BackHair;
  hairColor?: string;
  skin: string;
  girl?: boolean;
  left: ArmPose;
  right: ArmPose;
  desk?: ReactNode;
  extra?: ReactNode;
}) {
  const cap = "M-42 -168C-49 -228 49 -228 42 -168C34 -150 14 -146 0 -146C-14 -146 -34 -150 -42 -168Z";
  const ink = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const };
  const hairShape = {
    short: (
      <>
        <path d={cap} fill={hairColor} {...ink} />
        <path d="M-30 -214l6 -12 6 10 8 -14 6 12 8 -10 4 14" fill={hairColor} {...ink} />
      </>
    ),
    spiky: (
      <path
        d="M-43 -166L-52 -196L-35 -205L-37 -230L-16 -218L-7 -241L7 -221L24 -236L27 -213L48 -215L41 -192L51 -178L42 -166C30 -150 -30 -150 -43 -166Z"
        fill={hairColor}
        {...ink}
      />
    ),
    long: (
      <g className="cs-swing" style={swing([-2, 2], 4.5)}>
        <path d="M-44 -170C-50 -232 50 -232 44 -170L52 -40Q0 -26 -52 -40Z" fill={hairColor} {...ink} />
        <path d="M-20 -150Q-24 -100 -18 -50M14 -150Q18 -100 12 -50" stroke="#ffffff" strokeOpacity={0.15} strokeWidth={4} fill="none" />
      </g>
    ),
    ponytail: (
      <>
        <path d={cap} fill={hairColor} {...ink} />
        <path d="M-11 -196C-28 -150 -15 -108 0 -94C15 -108 28 -150 11 -196Z" fill={hairColor} {...ink} />
        <circle cy={-192} r={7} fill="#d6453d" stroke={INK} strokeWidth={2.5} />
      </>
    ),
  }[hair];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <DeskBack items={desk} />
      <path d="M-50 -124Q0 -136 50 -124Q60 -116 60 -100L58 -30H-58L-60 -100Q-60 -116 -50 -124Z" fill={SHIRT} stroke={INK} strokeWidth={3} />
      <path d="M12 -131Q40 -128 50 -124Q60 -116 60 -100L58 -30H24Z" fill={SHIRT_SHADE} />
      <path d="M-18 -131L0 -118L18 -131" stroke={INK} strokeWidth={3} fill="none" strokeLinejoin="round" />
      {girl && <path d="M-58 -40H58L62 -10H-62Z" fill="url(#cs-plaid)" stroke={INK} strokeWidth={3} />}
      {/* Chair: steel frame, wooden back */}
      <path d="M-40 -30V44M40 -30V44" stroke={INK} strokeWidth={9} />
      <path d="M-40 -30V44M40 -30V44" stroke="#9aa3b2" strokeWidth={4} />
      <rect x={-50} y={-74} width={100} height={36} rx={5} fill="#c98a4f" stroke={INK} strokeWidth={3} />
      <Arm x={-52} y={-116} pose={left} skin={skin} />
      <Arm x={52} y={-116} pose={right} skin={skin} />
      <rect x={-12} y={-152} width={24} height={30} fill={skin} stroke={INK} strokeWidth={3} />
      <circle cx={-41} cy={-174} r={9} fill={skin} stroke={INK} strokeWidth={3} />
      <circle cx={41} cy={-174} r={9} fill={skin} stroke={INK} strokeWidth={3} />
      <circle cy={-178} r={40} fill={skin} stroke={INK} strokeWidth={3} />
      {hairShape}
      {extra}
    </g>
  );
}

/** The show-off dancing on top of a desk, waving a perfect score. Local (0,0) is the desk top. */
function DeskDancer({ x, y, s }: { x: number; y: number; s: number }) {
  const skin = SKIN[2];
  const { front } = hairFor("messy", "#e0b63a");
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g transform="translate(0 54)">
        <DeskFront />
      </g>
      <g className="cs-swing" style={swing([-5, 5], 2.6)}>
        {[-14, 14].map((hx, i) => (
          <g key={hx} transform={`translate(${hx} -88)`}>
            <g className="cs-swing" style={swing(i ? [-4, 8] : [-8, 4], 2.6, -1.3 * i)}>
              <Segment len={86} width={16} fill={skin} />
              <path d="M0 52V86" stroke={NAVY} strokeWidth={18} strokeLinecap="round" />
              <ellipse cx={i ? 8 : -8} cy={92} rx={16} ry={8} fill="#2a2018" stroke={INK} strokeWidth={3} />
            </g>
          </g>
        ))}
        <path d="M-32 -120H32L36 -82H-36Z" fill={NAVY} stroke={INK} strokeWidth={3} />
        <path d="M-44 -206Q0 -218 44 -206Q52 -194 50 -176L40 -118H-40L-50 -176Q-52 -194 -44 -206Z" fill={SHIRT} stroke={INK} strokeWidth={3} />
        <path d="M-5 -198H5L8 -160L0 -152L-8 -160Z" fill="#d6453d" stroke={INK} strokeWidth={2.5} />
        <rect x={-11} y={-230} width={22} height={28} fill={skin} stroke={INK} strokeWidth={3} />
        <Arm
          x={-46}
          y={-200}
          skin={skin}
          pose={{ a: [150, 172], e: [20, -10], dur: 2.6 }}
        />
        <Arm
          x={46}
          y={-200}
          skin={skin}
          pose={{
            a: [-176, -150],
            e: [-20, 14],
            dur: 2.6,
            delay: -1.3,
            hold: (
              <g transform="rotate(180)">
                <rect x={-26} y={-34} width={52} height={64} fill="#ffffff" stroke={INK} strokeWidth={2.5} />
                <text x={0} y={6} textAnchor="middle" fontSize={22} fontWeight={700} fill="#d6453d" fontFamily="var(--font-schools-heading), sans-serif">
                  100!
                </text>
                <ellipse cy={-1} rx={22} ry={15} fill="none" stroke="#d6453d" strokeWidth={2.5} />
              </g>
            ),
          }}
        />
        <g transform="translate(0 -262)">
          <Face skin={skin} dir={0.4} expr="laugh" />
          {front}
        </g>
      </g>
    </g>
  );
}

/** The ringleader: rocking back on his chair, feet up on the desk, laughing. */
function ChairRocker({ x, y, s }: { x: number; y: number; s: number }) {
  const skin = SKIN[1];
  const { front } = hairFor("messy", "#1d1a24");
  const rock = swing([-4, -12], 3.6);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g transform="translate(50 30)">
        <g className="cs-swing" style={rock}>
          <g transform="translate(-50 -30)">
            {/* Chair back behind him */}
            <rect x={-46} y={-170} width={92} height={60} rx={6} fill="#c98a4f" stroke={INK} strokeWidth={3} />
            <path d="M-40 -110V30M40 -110V30" stroke={INK} strokeWidth={9} />
            <path d="M-40 -110V30M40 -110V30" stroke="#9aa3b2" strokeWidth={4} />
            <path d="M-46 -112Q0 -124 46 -112Q56 -100 56 -84L54 -20H-54L-56 -84Q-56 -100 -46 -112Z" fill={SHIRT} stroke={INK} strokeWidth={3} />
            <path d="M-46 -112Q0 -120 0 -104L-54 -20Z" fill={SHIRT_SHADE} opacity={0.6} />
            <rect x={-11} y={-138} width={22} height={28} fill={skin} stroke={INK} strokeWidth={3} />
            <path d="M-18 -120L0 -104L18 -120" stroke={INK} strokeWidth={3} fill="none" />
            <Arm x={-48} y={-106} skin={skin} pose={{ a: [150, 170], e: [30, 6], dur: 3.6 }} />
            <Arm x={48} y={-106} skin={skin} pose={{ a: [-150, -170], e: [-30, -6], dur: 3.6 }} />
            <g transform="translate(0 -160) rotate(-6)">
              <Face skin={skin} expr="laugh" />
              {front}
              <rect x={14} y={6} width={18} height={9} rx={2} transform="rotate(-20 23 10)" fill="#f6e2c2" stroke={INK} strokeWidth={2} />
            </g>
          </g>
        </g>
      </g>
      <DeskFront items={<Orange x={-60} y={-62} />} />
      {/* His feet, soles toward us, rocking with him */}
      <g transform="translate(50 30)">
        <g className="cs-swing" style={rock}>
          <g transform="translate(-50 -30)">
            {[-30, 30].map((fx) => (
              <g key={fx} transform={`translate(${fx} -70)`}>
                <path d="M0 18V40" stroke={NAVY} strokeWidth={22} />
                <rect x={-17} y={-24} width={34} height={44} rx={14} fill="#2a2018" stroke={INK} strokeWidth={3} />
                <path d="M-10 -12H10M-10 -2H10M-10 8H10" stroke="#5a4a3a" strokeWidth={3} />
              </g>
            ))}
          </g>
        </g>
      </g>
    </g>
  );
}

/** Asleep on the desk, snot bubble swelling and shrinking. */
function Sleeper({ x, y, s }: { x: number; y: number; s: number }) {
  const skin = SKIN[0];
  const { front } = hairFor("buzz", "#5fae4a");
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="cs-breathe">
        <path d="M-50 -92Q0 -104 50 -92L54 -20H-54Z" fill={SHIRT} stroke={INK} strokeWidth={3} />
      </g>
      <DeskFront items={<Books x={50} />} />
      <g className="cs-breathe">
        <ellipse cx={-30} cy={-62} rx={44} ry={16} fill={SHIRT} stroke={INK} strokeWidth={3} />
        <ellipse cx={30} cy={-62} rx={44} ry={16} fill={SHIRT} stroke={INK} strokeWidth={3} />
        <g transform="translate(-6 -98) rotate(-70)">
          <Face skin={skin} expr="bliss" />
          {front}
        </g>
        <circle className="cs-bubble" cx={-30} cy={-82} r={16} fill="#dff4ff" fillOpacity={0.75} stroke={INK} strokeWidth={2.5} />
      </g>
    </g>
  );
}

/** A kid hanging by the collar from the teacher's fist, legs kicking. Local (0,0) is the collar. */
function Dangler() {
  const skin = SKIN[3];
  const { front } = hairFor("curly", "#3a2416");
  return (
    <g className="cs-swing" style={swing([-9, 9], 3.4)}>
      {[-12, 12].map((lx, i) => (
        <g key={lx} transform={`translate(${lx} 92)`}>
          <g className="cs-swing" style={swing(i ? [-30, 18] : [24, -24], 1.5, -0.7 * i)}>
            <Segment len={66} width={15} fill={skin} />
            <path d="M0 36V64" stroke={NAVY} strokeWidth={17} strokeLinecap="round" />
            <ellipse cy={72} rx={12} ry={8} fill="#2a2018" stroke={INK} strokeWidth={3} />
          </g>
        </g>
      ))}
      <path d="M-30 70H30L34 100H-34Z" fill={NAVY} stroke={INK} strokeWidth={3} />
      <path d="M-40 6Q0 -4 40 6L34 74H-34Z" fill={SHIRT} stroke={INK} strokeWidth={3} />
      <Arm x={-40} y={14} skin={skin} upper={40} fore={36} width={15} pose={{ a: [120, 160], e: [40, -20], dur: 1.7 }} />
      <Arm x={40} y={14} skin={skin} upper={40} fore={36} width={15} pose={{ a: [-160, -120], e: [20, -40], dur: 1.9, delay: -0.8 }} />
      <g transform="translate(0 -36) scale(0.85)">
        <Face skin={skin} expr="shock" />
        {front}
      </g>
      <path d="M44 -60q8 -10 16 0M50 -72q8 -10 16 0" stroke="#6ab8e0" strokeWidth={3} fill="none" />
    </g>
  );
}

function Puppy({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <DeskFront />
      <g transform="translate(0 -54)">
        <g transform="translate(34 -26)">
          <g className="cs-swing" style={swing([-150, -110], 1.3)}>
            <path d="M0 0Q6 30 -2 44" stroke={INK} strokeWidth={13} fill="none" strokeLinecap="round" />
            <path d="M0 0Q6 30 -2 44" stroke="#f3dfb8" strokeWidth={7} fill="none" strokeLinecap="round" />
          </g>
        </g>
        <ellipse cy={-34} rx={40} ry={36} fill="#f3dfb8" stroke={INK} strokeWidth={3} />
        <ellipse cx={-18} cy={-4} rx={12} ry={8} fill="#f3dfb8" stroke={INK} strokeWidth={3} />
        <ellipse cx={18} cy={-4} rx={12} ry={8} fill="#f3dfb8" stroke={INK} strokeWidth={3} />
        <g transform="translate(0 -84)">
          <g className="cs-swing" style={swing([-8, 8], 2.8)}>
            <path d="M-34 -10Q-50 10 -38 34Q-28 20 -24 2Z" fill="#a8743f" stroke={INK} strokeWidth={3} />
            <path d="M34 -10Q50 10 38 34Q28 20 24 2Z" fill="#a8743f" stroke={INK} strokeWidth={3} />
            <ellipse rx={36} ry={32} fill="#f3dfb8" stroke={INK} strokeWidth={3} />
            <circle cx={-13} cy={-2} r={5} fill={INK} />
            <circle cx={13} cy={-2} r={5} fill={INK} />
            <circle cx={-14.5} cy={-3.5} r={1.6} fill="#ffffff" />
            <circle cx={11.5} cy={-3.5} r={1.6} fill="#ffffff" />
            <ellipse cy={10} rx={7} ry={5} fill={INK} />
            <path d="M-8 18Q0 24 8 18" stroke={INK} strokeWidth={2.5} fill="none" />
            <path d="M-4 20Q0 34 4 20Z" fill="#e8707a" stroke={INK} strokeWidth={2} />
            {/* Pink cap with a star */}
            <path d="M-34 -16Q-34 -56 0 -58Q34 -56 34 -16Z" fill="#f28fb0" stroke={INK} strokeWidth={3} />
            <path d="M-42 -16H42Q38 -8 0 -8Q-38 -8 -42 -16Z" fill="#f6b6cb" stroke={INK} strokeWidth={3} />
            <path d="M0 -48l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="#ffffff" stroke={INK} strokeWidth={2} />
          </g>
        </g>
      </g>
    </g>
  );
}

// ---------- Teacher ----------

function Teacher({ x, y, s }: { x: number; y: number; s: number }) {
  const skin = "#d39a6c";
  const suit = "#eef0f4";
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(4)`}>
      <ellipse cy={-330} rx={210} ry={320} fill="url(#cs-aura)" className="cs-aura" />
      <g className="cs-loom">
        <rect x={-62} y={-200} width={54} height={190} fill="#3a3f52" stroke={INK} strokeWidth={4} />
        <rect x={8} y={-200} width={54} height={190} fill="#3a3f52" stroke={INK} strokeWidth={4} />
        {/* Long white coat over a dark shirt */}
        <path d="M-130 -398Q0 -430 130 -398Q146 -350 124 -280L112 -150H-112L-124 -280Q-146 -350 -130 -398Z" fill={suit} stroke={INK} strokeWidth={4} />
        <path d="M-40 -414L0 -300L40 -414Z" fill="#7a1f2e" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path d="M-40 -414L-8 -300L-70 -250M40 -414L8 -300L70 -250" stroke={INK} strokeWidth={4} fill="none" />
        <path d="M40 -414Q96 -410 130 -398Q146 -350 124 -280L112 -150H70Z" fill="#cfd5e0" />
        <path d="M0 -300V-150" stroke={INK} strokeWidth={4} />
        {/* Pointer arm raised overhead; the other fist holds a kid by the collar */}
        <Arm
          x={-118}
          y={-388}
          skin={skin}
          sleeve={suit}
          upper={96}
          fore={88}
          width={36}
          pose={{
            a: [140, 168],
            e: [16, -8],
            dur: 4.2,
            hold: (
              <g>
                <path d="M0 0V220" stroke={INK} strokeWidth={13} strokeLinecap="round" />
                <path d="M0 0V220" stroke="#7a4d24" strokeWidth={7} strokeLinecap="round" />
                <path className="cs-glint" d="M0 206l6 16 16 6-16 6-6 16-6-16-16-6 16-6z" fill="#fff6c8" />
              </g>
            ),
          }}
        />
        <Arm
          x={118}
          y={-388}
          skin={skin}
          sleeve={suit}
          upper={96}
          fore={88}
          width={36}
          pose={{
            a: [-96, -102],
            e: [-4, 2],
            dur: 5,
            fist: true,
            hold: (
              <g transform="rotate(100) translate(0 24) scale(1.25)">
                <Dangler />
              </g>
            ),
          }}
        />
        {/* Head */}
        <rect x={-28} y={-436} width={56} height={34} fill={skin} stroke={INK} strokeWidth={4} />
        <circle cx={-70} cy={-478} r={16} fill={skin} stroke={INK} strokeWidth={4} />
        <circle cx={70} cy={-478} r={16} fill={skin} stroke={INK} strokeWidth={4} />
        <path d="M-68 -500Q-72 -414 0 -400Q72 -414 68 -500Q62 -548 0 -552Q-62 -548 -68 -500Z" fill={skin} stroke={INK} strokeWidth={4} />
        <path
          d="M-70 -496L-84 -530L-66 -538L-92 -604L-46 -560L-30 -586L-12 -560L6 -590L20 -562L44 -584L46 -560L92 -604L66 -538L84 -530L70 -496Q60 -536 0 -536Q-60 -536 -70 -496Z"
          fill="#e9e6df"
          stroke={INK}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <path d="M-66 -508Q0 -520 66 -508L64 -466Q0 -476 -64 -466Z" fill="#1a1030" opacity={0.72} />
        <path d="M-58 -522L-10 -504L-12 -494L-60 -510Z" fill="#e9e6df" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M58 -522L10 -504L12 -494L60 -510Z" fill="#e9e6df" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path className="cs-glint" d="M-48 -486L-16 -480L-20 -474L-46 -479Z" fill="#fffbe0" />
        <path className="cs-glint" d="M48 -486L16 -480L20 -474L46 -479Z" fill="#fffbe0" />
        <path d="M0 -472L-8 -452H6" stroke={INK} strokeWidth={4} fill="none" strokeLinejoin="round" />
        {/* Huge white moustache swept up at the ends */}
        <path
          d="M-4 -446Q-40 -462 -84 -472Q-70 -446 -40 -436Q-18 -432 -4 -440Q0 -436 4 -440Q18 -432 40 -436Q70 -446 84 -472Q40 -462 4 -446Z"
          fill="#f4f1ea"
          stroke={INK}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
        <path d="M-46 -428Q0 -396 46 -428Q0 -414 -46 -428Z" fill="#ffffff" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path d="M-30 -424V-414M-14 -420V-407M2 -419V-406M18 -420V-408" stroke={INK} strokeWidth={2.5} />
        <g transform="translate(44 -530)">
          <path className="cs-pulse" d="M-12 -4Q-4 -4 -4 -12M4 -12Q4 -4 12 -4M12 4Q4 4 4 12M-4 12Q-4 4 -12 4" stroke="#e0263a" strokeWidth={5} fill="none" strokeLinecap="round" />
        </g>
      </g>
      <g fontFamily="var(--font-schools-heading), 'Yu Gothic', 'Noto Sans JP', sans-serif" fontWeight={700} fontSize={58} fill="#5b3fb0" stroke={INK} strokeWidth={3} paintOrder="stroke">
        <text x={-280} y={-470} className="cs-menace">
          ゴ
        </text>
        <text x={-310} y={-392} className="cs-menace" style={{ animationDelay: "-1s" }}>
          ゴ
        </text>
        <text x={-276} y={-314} className="cs-menace" style={{ animationDelay: "-2s" }}>
          ゴ
        </text>
      </g>
    </g>
  );
}

// ---------- Effects ----------

/** Something lobbed across the room on a slow arc (end/peak are offsets from the start). */
function Flyer({ x, y, end, peak, dur, delay = 0, spin = 540, children }: { x: number; y: number; end: [number, number]; peak: [number, number]; dur: number; delay?: number; spin?: number; children: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        className="cs-fly"
        style={
          {
            "--ex": `${end[0]}px`,
            "--ey": `${end[1]}px`,
            "--mx": `${peak[0]}px`,
            "--my": `${peak[1]}px`,
            "--spin": `${spin}deg`,
            "--dur": `${dur}s`,
            "--delay": `${delay}s`,
          } as CSSProperties
        }
      >
        {children}
      </g>
    </g>
  );
}

function Puffs({ x, y, color, count = 4, spread = 30 }: { x: number; y: number; color: string; count?: number; spread?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          className="cs-puff"
          cx={((i * 37) % (spread * 2)) - spread}
          r={12 + (i % 3) * 5}
          fill={color}
          stroke={INK}
          strokeWidth={2}
          style={{ animationDelay: `${(-i * 3.2) / count}s` } as CSSProperties}
        />
      ))}
    </g>
  );
}

function Pow({ x, y, s }: { x: number; y: number; s: number }) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const r = i % 2 ? 46 : 78 + (i % 4) * 8;
    const a = (i / 24) * Math.PI * 2;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r * 0.8).toFixed(1)}`;
  }).join(" ");
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="cs-pow">
        {[
          [-70, 30],
          [70, 34],
          [-40, 60],
          [50, -50],
          [-60, -40],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={34} fill="#f1ede4" stroke={INK} strokeWidth={3} />
        ))}
        <polygon points={pts} fill="#ffd23f" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <text y={14} textAnchor="middle" fontSize={40} fontWeight={700} fill="#d6453d" stroke={INK} strokeWidth={2.5} paintOrder="stroke" fontFamily="var(--font-schools-heading), sans-serif">
          POW!
        </text>
      </g>
    </g>
  );
}

// ---------- Room ----------

// One-point perspective toward the board: the back wall is flat, the glass
// wall on the right recedes toward VP.
const VP = { x: 700, y: 300 };
const WALL_TOP = 110;
const WALL_BOTTOM = 470;
const GLASS_X = 1150;
const sideTop = (x: number) => VP.y + ((WALL_TOP - VP.y) / (GLASS_X - VP.x)) * (x - VP.x);
const sideBottom = (x: number) => VP.y + ((WALL_BOTTOM - VP.y) / (GLASS_X - VP.x)) * (x - VP.x);
const sideAt = (x: number, t: number) => sideTop(x) + t * (sideBottom(x) - sideTop(x));
const quad = (x0: number, x1: number, t0: number, t1: number) =>
  `M${x0} ${sideAt(x0, t0)}L${x1} ${sideAt(x1, t0)}L${x1} ${sideAt(x1, t1)}L${x0} ${sideAt(x0, t1)}Z`;

function Corridor() {
  const panes = [GLASS_X, 1270, 1405, 1540, 1700];
  const glass = `M${GLASS_X} ${sideAt(GLASS_X, 0.1)}L1700 ${sideAt(1700, 0.1)}L1700 ${sideAt(1700, 0.66)}L${GLASS_X} ${sideAt(GLASS_X, 0.66)}Z`;
  return (
    <g>
      {/* Side wall */}
      <path d={`M${GLASS_X} ${WALL_TOP}L1700 ${sideTop(1700)}L1700 ${sideBottom(1700)}L${GLASS_X} ${WALL_BOTTOM}Z`} fill="#cfe3ea" stroke={INK} strokeWidth={4} />
      <path d={quad(GLASS_X, 1700, 0.82, 1)} fill="#9cc3cf" />
      <clipPath id="cs-glass">
        <path d={glass} />
      </clipPath>
      <g clipPath="url(#cs-glass)">
        <rect x={GLASS_X} y={-200} width={600} height={1000} fill="url(#cs-hall)" />
        {/* Lockers across the corridor */}
        {[1180, 1260, 1340, 1420, 1500, 1580].map((lx) => (
          <rect key={lx} x={lx} y={250} width={70} height={260} fill="#8fb3c4" stroke="#5b7f90" strokeWidth={4} />
        ))}
        {/* Two shadows tearing down the corridor */}
        <g className="cs-chase">
          <g transform="translate(1160 420)">
            <g className="cs-bob" fill="#2c3a5c" fillOpacity={0.55}>
              <circle cx={0} cy={-150} r={34} />
              <path d="M-50 -110H50L40 0H-40Z" />
              <path d="M40 -100L110 -150L118 -136L52 -84Z" />
            </g>
          </g>
          <g transform="translate(1340 430)">
            <g className="cs-bob" fill="#2c3a5c" fillOpacity={0.5} style={{ animationDelay: "-0.3s" }}>
              <circle cx={0} cy={-96} r={22} />
              <path d="M-26 -72H26L22 0H-22Z" />
              <path d="M24 -64L60 -96L66 -88L30 -56Z" />
            </g>
          </g>
        </g>
        <path d={glass} fill="rgba(255,255,255,0.18)" />
      </g>
      {panes.slice(0, -1).map((px) => (
        <path key={px} d={`M${px} ${sideAt(px, 0.1)}L${px} ${sideAt(px, 0.66)}`} stroke="#5f7d8a" strokeWidth={10} />
      ))}
      <path d={`M${GLASS_X} ${sideAt(GLASS_X, 0.1)}L1700 ${sideAt(1700, 0.1)}M${GLASS_X} ${sideAt(GLASS_X, 0.66)}L1700 ${sideAt(1700, 0.66)}`} stroke="#5f7d8a" strokeWidth={10} />
      {/* Glints and the graffiti */}
      <path d={`M1300 ${sideAt(1300, 0.18)}L1250 ${sideAt(1250, 0.5)}`} stroke="#ffffff" strokeOpacity={0.6} strokeWidth={8} strokeLinecap="round" />
      <g transform={`translate(1290 ${sideAt(1290, 0.3)}) skewY(14)`} fontFamily="var(--font-schools-heading), sans-serif" fontWeight={700} fill="#e0263a" fontSize={30}>
        <text>Mr. Thunder</text>
        <text y={40}>is a GRUMP!</text>
        <text x={150} y={78} fontSize={28}>
          :P
        </text>
      </g>
    </g>
  );
}

export function ClassroomScene({ viewBox = "0 0 1600 900", className = "" }: { viewBox?: string; className?: string }) {
  const ceilingLines = [];
  for (let x0 = -800; x0 <= 2400; x0 += 160) ceilingLines.push(`M${x0} 0L${VP.x + (x0 - VP.x) * ((VP.y - WALL_TOP) / VP.y)} ${WALL_TOP}`);
  const floorLines = [];
  for (let x0 = -1600; x0 <= 3200; x0 += 200) floorLines.push(`M${VP.x + (x0 - VP.x) * ((WALL_BOTTOM - VP.y) / (900 - VP.y))} ${WALL_BOTTOM}L${x0} 900`);

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      className={`classroom-scene ${className}`}
      role="img"
      aria-label="A chaotic classroom: a giant teacher lunges in with a kid dangling from his fist, students dance on desks, brawl, nap and fling oranges, while one girl calmly keeps writing."
    >
      <defs>
        <linearGradient id="cs-hall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="cs-sky-top" />
          <stop offset="1" className="cs-sky-bottom" />
        </linearGradient>
        <radialGradient id="cs-aura">
          <stop offset="0" stopColor="#5b3fb0" stopOpacity={0.5} />
          <stop offset="0.7" stopColor="#5b3fb0" stopOpacity={0.16} />
          <stop offset="1" stopColor="#5b3fb0" stopOpacity={0} />
        </radialGradient>
        <pattern id="cs-plaid" width={18} height={18} patternUnits="userSpaceOnUse">
          <rect width={18} height={18} fill="#2d5b6e" />
          <path d="M0 5H18M0 13H18" stroke="#1d3d4e" strokeWidth={3} />
          <path d="M5 0V18M13 0V18" stroke="#4d8a9c" strokeWidth={2} />
        </pattern>
      </defs>

      {/* Ceiling: aqua tiles, light panels (one on the blink) */}
      <rect width={1600} height={WALL_TOP} fill="#bfe6ea" />
      <g stroke="#8ec4cb" strokeWidth={3}>
        {ceilingLines.map((d) => (
          <path key={d} d={d} />
        ))}
        <path d="M0 30H1600M0 66H1600M0 96H1600" />
      </g>
      <path d="M150 38L330 38L322 58L160 58Z" fill="#fbfff4" stroke="#8ec4cb" strokeWidth={3} />
      <path d="M1240 38L1440 38L1450 58L1250 58Z" fill="#fbfff4" stroke="#8ec4cb" strokeWidth={3} className="cs-flicker" />

      {/* Back wall and floor */}
      <rect y={WALL_TOP} width={GLASS_X} height={WALL_BOTTOM - WALL_TOP} fill="#e4f0f2" />
      <rect y={410} width={GLASS_X} height={WALL_BOTTOM - 410} fill="#a9cdd6" />
      <path d={`M0 410H${GLASS_X}`} stroke="#7aa8b4" strokeWidth={4} />
      <path d={`M0 ${WALL_BOTTOM}L${GLASS_X} ${WALL_BOTTOM}L1700 ${sideBottom(1700)}L1700 900L0 900Z`} fill="#d9a066" />
      <g stroke="#c08a52" strokeWidth={3}>
        {floorLines.map((d) => (
          <path key={d} d={d} />
        ))}
        <path d="M0 500H1600M0 545H1600M0 610H1600M0 700H1600M0 820H1600" />
      </g>
      <path d={`M0 ${WALL_TOP}H${GLASS_X}M0 ${WALL_BOTTOM}H${GLASS_X}`} stroke={INK} strokeWidth={4} />

      <Corridor />

      {/* Chalkboard: MONSTER MATHS EXAM, kids' doodles all over it */}
      <rect x={50} y={168} width={600} height={238} rx={6} fill="#7a5530" stroke={INK} strokeWidth={4} />
      <rect x={62} y={180} width={576} height={214} fill="#2f6b4f" stroke={INK} strokeWidth={3} />
      <path d="M90 200L260 214M480 380L620 360" stroke="rgba(255,255,255,0.08)" strokeWidth={16} strokeLinecap="round" />
      <g fontFamily="var(--font-schools-heading), sans-serif" fontWeight={600} fill="#f6f3ea" opacity={0.92}>
        <text x={84} y={238} fontSize={40} transform="rotate(-4 84 238)">
          MONSTER
        </text>
        <text x={92} y={290} fontSize={44} transform="rotate(-2 92 290)">
          MATHS
        </text>
        <text x={98} y={348} fontSize={50}>
          EXAM!!
        </text>
      </g>
      <g stroke="#f6f3ea" strokeWidth={3} fill="none" opacity={0.75}>
        <path d="M300 220q20 -26 40 0t40 0" />
        <circle cx={330} cy={360} r={18} />
        <path d="M318 356h6M336 356h6M322 370q8 6 16 0M316 344l-6 -12 12 6M344 344l6 -12 -12 6" />
        <path d="M560 210l20 30-36 0z" />
        <text x={520} y={300} fontSize={26} fill="#f6f3ea" stroke="none" fontFamily="var(--font-schools-heading), sans-serif">
          x² = ??
        </text>
      </g>
      <rect x={56} y={404} width={588} height={9} fill="#5a3b1c" stroke={INK} strokeWidth={3} />

      {/* Notice board with pinned papers, and the clock */}
      <rect x={720} y={240} width={380} height={150} fill="#c99a62" stroke={INK} strokeWidth={4} />
      {[
        [740, 256, "#fff27a", -4],
        [820, 270, "#ffffff", 3],
        [910, 252, "#9fe0f0", -2],
        [1000, 266, "#f8b6c8", 5],
        [760, 320, "#ffffff", 2],
        [880, 326, "#c8f0a0", -3],
        [990, 322, "#fff27a", 2],
      ].map(([px, py, c, r], i) => (
        <g key={i} transform={`rotate(${r} ${px} ${py})`}>
          <rect x={px as number} y={py as number} width={70} height={52} fill={c as string} stroke={INK} strokeWidth={2} />
          <circle cx={(px as number) + 35} cy={(py as number) + 6} r={4} fill="#d6453d" />
          <path d={`M${(px as number) + 10} ${(py as number) + 22}h48M${(px as number) + 10} ${(py as number) + 32}h36`} stroke="#8a8a8a" strokeWidth={2} />
        </g>
      ))}
      <g transform="translate(1090 150)">
        <circle r={26} fill="#fffdf7" stroke={INK} strokeWidth={4} />
        <path d="M0 0V-15M0 0L10 6" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <g className="cs-tick">
          <path d="M0 4V-20" stroke="#d6453d" strokeWidth={2} />
        </g>
      </g>

      {/* Back row */}
      <DeskDancer x={130} y={498} s={0.55} />
      <KidFront
        x={330}
        y={560}
        s={0.56}
        skin={SKIN[3]}
        hair="afro"
        expr="bliss"
        dir={0.5}
        left={{ a: [30, 34], e: [-146, -140], dur: 2.4 }}
        right={{ a: [-30, -34], e: [146, 140], dur: 2.4, delay: -1 }}
        desk={<Books x={-80} tall />}
        overHead={
          <>
            <path d="M4 22L22 70" stroke={INK} strokeWidth={10} strokeLinecap="round" />
            <path d="M4 22L22 70" stroke="#f6f0dc" strokeWidth={6} strokeLinecap="round" />
            <g fontFamily="var(--font-schools-heading), sans-serif" fontWeight={700} fontSize={30} fill={NAVY}>
              {["♪", "♫", "♪"].map((n, i) => (
                <text key={i} x={46} y={-10} className="cs-note" style={{ animationDelay: `${-i * 1.3}s` } as CSSProperties}>
                  {n}
                </text>
              ))}
            </g>
          </>
        }
      />
      <KidFront
        x={800}
        y={560}
        s={0.56}
        skin={SKIN[2]}
        hair="messy"
        hairColor="#6b3a1e"
        expr="yell"
        dir={1}
        left={{ a: [10, 14], e: [0, 4], dur: 4 }}
        right={{ a: [-80, -116], e: [-30, 6], dur: 1.6, fist: true }}
        desk={<Paper />}
      />
      <KidFront
        x={960}
        y={560}
        s={0.56}
        skin={SKIN[0]}
        hair="twin"
        hairColor="#8a4b2a"
        girl
        expr="yell"
        dir={-1}
        left={{ a: [80, 116], e: [30, -6], dur: 1.6, delay: -0.8, fist: true }}
        right={{ a: [-10, -14], e: [0, -4], dur: 4 }}
        desk={<Bento x={10} />}
      />
      <Pow x={880} y={470} s={0.75} />
      <KidFront
        x={1090}
        y={560}
        s={0.56}
        skin={SKIN[1]}
        hair="bob"
        hairColor="#3d2a6b"
        girl
        expr="smug"
        dir={-0.6}
        left={{ a: [10, 12], e: [0, 2], dur: 5 }}
        right={{
          a: [-130, -142],
          e: [-30, -20],
          dur: 3.4,
          hold: (
            <g transform="rotate(170)">
              <path d="M-8 -30H8V-12L22 18H-22L-8 -12Z" fill="#c8f0ff" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
              <path d="M-17 8H17L22 18H-22Z" fill="#7be05a" />
            </g>
          ),
        }}
        overHead={
          <g>
            <path d="M-40 -26Q0 -40 40 -26" stroke="#5a3a8a" strokeWidth={6} fill="none" />
            <circle cx={-16} cy={-30} r={11} fill="#c8f0ff" stroke={INK} strokeWidth={3} />
            <circle cx={16} cy={-30} r={11} fill="#c8f0ff" stroke={INK} strokeWidth={3} />
          </g>
        }
      />
      <Puffs x={1140} y={392} color="#c9b6f2" />

      <Teacher x={500} y={690} s={0.74} />

      {/* Middle row */}
      <KidBack
        x={110}
        y={700}
        s={0.78}
        hair="short"
        skin={SKIN[2]}
        left={{ a: [10, 14], e: [0, 6], dur: 6 }}
        right={{ a: [-40, -48], e: [-150, -138], dur: 1.8 }}
        desk={<Books x={-110} />}
        extra={
          <g className="cs-swing" style={swing([-6, 6], 1.6)}>
            <path d="M-46 -186Q0 -246 46 -186" stroke={INK} strokeWidth={9} fill="none" />
            <path d="M-46 -186Q0 -246 46 -186" stroke="#d6453d" strokeWidth={5} fill="none" />
            <rect x={-56} y={-196} width={16} height={30} rx={6} fill="#d6453d" stroke={INK} strokeWidth={3} />
            <rect x={40} y={-196} width={16} height={30} rx={6} fill="#d6453d" stroke={INK} strokeWidth={3} />
          </g>
        }
      />
      <Puppy x={360} y={720} s={0.72} />
      <ChairRocker x={690} y={720} s={0.78} />
      <KidFront
        x={930}
        y={720}
        s={0.78}
        skin={SKIN[4]}
        hair="bob"
        hairColor="#f07d2a"
        girl
        expr="yell"
        dir={-1}
        left={{ a: [120, 150], e: [40, 0], dur: 1.7, fist: true }}
        right={{ a: [-20, -24], e: [-60, -54], dur: 4 }}
        desk={<Orange x={50} y={-62} />}
        overHead={
          <g transform="translate(34 -40)">
            <path className="cs-pulse" d="M-10 -3Q-3 -3 -3 -10M3 -10Q3 -3 10 -3M10 3Q3 3 3 10M-3 10Q-3 3 -10 3" stroke="#e0263a" strokeWidth={4} fill="none" strokeLinecap="round" />
          </g>
        }
      />
      <Sleeper x={1190} y={720} s={0.78} />

      {/* Front row */}
      <KidBack
        x={230}
        y={900}
        s={1.08}
        hair="long"
        skin={SKIN[0]}
        girl
        left={{ a: [20, 22], e: [-178, -174], dur: 5 }}
        right={{ a: [-30, -34], e: [-166, -172], dur: 1.6 }}
        desk={<Paper x={-30} y={-100} />}
      />
      <KidBack
        x={720}
        y={900}
        s={1.08}
        hair="spiky"
        skin={SKIN[3]}
        left={{ a: [14, 20], e: [0, 8], dur: 5 }}
        right={{ a: [-170, -70], e: [-50, 0], dur: 3.6, hold: <circle r={10} fill="#ffffff" stroke={INK} strokeWidth={2.5} /> }}
        desk={<Palette x={-80} y={-102} />}
      />
      <KidFront
        x={1110}
        y={905}
        s={1.02}
        skin={SKIN[1]}
        hair="long"
        girl
        expr="focus"
        dir={-0.7}
        left={{ a: [30, 34], e: [-120, -116], dur: 5 }}
        right={{ a: [-28, -32], e: [116, 124], dur: 1.6, hold: <path d="M0 0L-14 -26" stroke={INK} strokeWidth={4} strokeLinecap="round" /> }}
        desk={
          <>
            <Paper x={-20} />
            <Books x={60} tall />
          </>
        }
      />
      <KidFront
        x={1450}
        y={905}
        s={1.02}
        skin={SKIN[2]}
        hair="curly"
        hairColor="#2a1d14"
        expr="smug"
        dir={-0.8}
        left={{
          a: [76, 84],
          e: [4, 0],
          dur: 2.4,
          hold: (
            <g>
              <path d="M0 -4V22M0 22L-12 44M0 22L12 44" stroke={INK} strokeWidth={9} strokeLinecap="round" />
              <path d="M0 -4V22M0 22L-12 44M0 22L12 44" stroke="#9a6634" strokeWidth={5} strokeLinecap="round" />
              <g className="cs-pull">
                <path d="M-12 44L0 -40L12 44" stroke="#5a3a2a" strokeWidth={3} fill="none" />
                <circle cy={-40} r={6} fill="#5a3a2a" />
              </g>
            </g>
          ),
        }}
        right={{ a: [-50, -64], e: [130, 116], dur: 2.4 }}
        desk={<Bento x={-90} />}
      />

      {/* Things flying across the room */}
      <Flyer x={300} y={470} end={[420, -40]} peak={[200, -170]} dur={9}>
        <Orange r={12} />
      </Flyer>
      <Flyer x={1380} y={700} end={[-560, -120]} peak={[-280, -200]} dur={11} delay={-5}>
        <Orange r={14} />
      </Flyer>
      <Flyer x={1460} y={720} end={[-700, -40]} peak={[-350, -60]} dur={5} delay={-1} spin={0}>
        <circle r={6} fill="#5a3a2a" stroke={INK} strokeWidth={2} />
      </Flyer>
      <Flyer x={600} y={440} end={[520, 60]} peak={[260, -150]} dur={13} delay={-7} spin={360}>
        <g>
          <rect x={-20} y={-14} width={40} height={28} fill="#2f7fb8" stroke={INK} strokeWidth={3} />
          <path d="M0 -14V14" stroke={INK} strokeWidth={2} />
        </g>
      </Flyer>
    </svg>
  );
}

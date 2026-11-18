import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import data from "../timeline-goals.json";
import { useFonts } from "../explainer/PeopleToAvoid";
import { Figure, POSES, PALETTES, Pose, mixPose, walkPose } from "./Figure";

// "Keep your goals to yourself" – minimal kinetic reel in the style of the reference:
// shot-based camera, blur/fade scene changes, flying-dot transitions, line-art props,
// word-by-word text that moves to a new spot every shot.

const FONT = "Vazirmatn";
const Y = "#f2c230";
const CX = 540, CY = 1010; // screen point the camera looks at
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const r = (now: number, a: number, b: number) => io(interpolate(now, [a, b], [0, 1], clamp));

type Word = { w: string; t: number; key: boolean };
type Ph = { start: number; end: number; text: string; words: Word[] };
const P = data.phrases as Ph[];
const wt = (p: number, i: number) => P[p].words[Math.min(i, P[p].words.length - 1)].t;
const keyT = (p: number) => (P[p].words.find((w) => w.key) ?? P[p].words[0]).t;

const useNow = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

// ---------------------------------------------------------------- camera
type Cam = [number, number, number, number]; // t, x, y, zoom
const camAt = (now: number, keys: Cam[]) => {
  if (now <= keys[0][0]) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    if (now <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i];
      const p = io((now - a[0]) / (b[0] - a[0]));
      return [now, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p, a[3] + (b[3] - a[3]) * p] as Cam;
    }
  }
  return keys[keys.length - 1];
};
const toScreen = (c: Cam, x: number, y: number) => [CX + (x - c[1]) * c[3], CY + (y - c[2]) * c[3]];

// scene = a camera + its own fade/blur envelope
const Scene: React.FC<{ t0: number; t1: number; cam: Cam[]; children: React.ReactNode }> = ({ t0, t1, cam, children }) => {
  const now = useNow();
  if (now < t0 - 0.05 || now > t1 + 0.05) return null;
  const inP = r(now, t0, t0 + 0.35);
  const outP = r(now, t1 - 0.35, t1);
  const c = camAt(now, cam);
  const vis = inP * (1 - outP);
  return (
    <g opacity={vis} style={{ filter: `blur(${(1 - inP) * 12 + outP * 16}px)` }}
      transform={`translate(${CX} ${CY}) scale(${c[3]}) translate(${-c[1]} ${-c[2]})`}>
      {children}
    </g>
  );
};

// subtle life: breathing + head drift
const idle = (p: Pose, now: number, seed = 0, amt = 1): Pose => ({
  ...p,
  lean: p.lean + Math.sin(now * 1.7 + seed) * 1.6 * amt,
  head: p.head + Math.sin(now * 1.1 + seed * 2) * 3 * amt,
  sF: p.sF + Math.sin(now * 1.7 + seed + 1) * 2.5 * amt,
  sB: p.sB - Math.sin(now * 1.7 + seed + 1) * 2.5 * amt,
});
// eased pose timeline
const poseAt = (now: number, steps: [number, Pose][], blend = 0.35): Pose => {
  let cur = steps[0][1];
  for (let i = 1; i < steps.length; i++) cur = mixPose(cur, steps[i][1], r(now, steps[i][0], steps[i][0] + blend));
  return cur;
};

// ---------------------------------------------------------------- line-art props
const Draw: React.FC<{ d: string; p: number; w?: number; color?: string; dash?: string; o?: number }> = ({ d, p, w = 4, color = Y, dash, o = 1 }) =>
  dash ? (
    <path d={d} fill="none" stroke={color} strokeWidth={w} strokeDasharray={dash} strokeLinecap="round" opacity={o * Math.min(1, p * 3)}
      style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }} />
  ) : (
    <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray={1} strokeDashoffset={1 - p} opacity={o} />
  );

const Ground: React.FC<{ x?: number; w?: number; y?: number }> = ({ x = 0, w = 1400, y = 0 }) => (
  <rect x={x - w / 2} y={y} width={w} height={2.5} fill="url(#groundGrad)" />
);

const Flag: React.FC<{ x: number; y: number; p: number; glow?: number; o?: number }> = ({ x, y, p, glow = 0, o = 1 }) => (
  <g transform={`translate(${x} ${y})`} opacity={o}>
    <circle cx={30} cy={-120} r={90} fill={Y} opacity={0.12 * glow * p} />
    <Draw d="M0,0 L0,-170" p={r(p, 0, 0.5)} w={5} />
    <path d="M0,-170 L80,-140 L0,-110 Z" fill={Y} opacity={r(p, 0.5, 1)} transform={`scale(${0.4 + 0.6 * r(p, 0.5, 1)} 1)`} />
  </g>
);

const Star: React.FC<{ s?: number; glow?: number }> = ({ s = 1, glow = 0.6 }) => (
  <g transform={`scale(${s})`}>
    <circle r={46} fill={Y} opacity={0.18 * glow} />
    <path d="M0,-24 L7,-8 L24,-7 L11,4 L15,22 L0,12 L-15,22 L-11,4 L-24,-7 L-7,-8 Z" fill={Y} />
  </g>
);

const Bubble: React.FC<{ s: number }> = ({ s }) => (
  <g transform={`scale(${s})`} opacity={Math.min(1, s * 1.4)}>
    <rect x={-46} y={-30} width={92} height={54} rx={14} fill="#2c2f33" stroke="#4d4d4d" strokeWidth={2} />
    <path d="M-10,24 L0,40 L9,24 Z" fill="#2c2f33" />
    {[-20, 0, 20].map((x) => <circle key={x} cx={x} cy={-3} r={5} fill="#9a9a9a" />)}
  </g>
);

const Sparkle: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={Math.min(1, s)}>
    <path d="M0,-16 L0,16 M-16,0 L16,0" stroke={Y} strokeWidth={4} strokeLinecap="round" />
  </g>
);

// figure standing at a world position; head ≈ 386 units above the feet when upright
const HEAD_Y = -386;

// ---------------------------------------------------------------- scenes
const SceneA: React.FC = () => {
  const now = useNow();
  const t0 = 0, t1 = P[2].start - 0.2;
  const cam: Cam[] = [[0, 0, -250, 1.75], [2.3, 160, -250, 1.02], [3.6, 40, -220, 0.86], [t1, 40, -220, 0.8]];
  const talking = now > P[1].start;
  const yPose = idle(talking ? mixPose(POSES.talk, POSES.stand, (Math.sin(now * 7) + 1) * 0.25) : POSES.stand, now);
  const hill = r(now, 0.5, 2.2);
  const grays = [-500, -310, 250, 430];
  return (
    <Scene t0={t0} t1={t1} cam={cam}>
      <Ground w={1800} />
      <g opacity={1 - r(now, P[1].start, P[1].end) * 0.65}>
        <Draw d="M330,0 Q560,-30 700,-260" p={hill} w={3} color="#5d5d5d" />
        <Flag x={700} y={-262} p={r(now, 1.6, 2.6)} glow={1} />
      </g>
      {grays.map((x, i) => {
        const at = P[1].start - 0.3 + i * 0.18;
        const o = r(now, at, at + 0.4);
        const face = (x < 0 ? 1 : -1) as 1 | -1;
        const bubbleT = wt(1, i + 2);
        return (
          <g key={x} opacity={o} style={{ filter: "blur(1.2px)" }}>
            <Figure x={x} y={-40} scale={0.82} palette={PALETTES.dark} facing={face} pose={idle(POSES.listen, now, i)}
              aboveHead={<Bubble s={r(now, bubbleT - 0.1, bubbleT + 0.15) * (1 - r(now, bubbleT + 0.9, bubbleT + 1.2))} />} />
          </g>
        );
      })}
      <Figure x={0} y={0} pose={yPose} facing={talking ? (Math.sin(now * 1.3) > 0 ? 1 : -1) : 1} />
    </Scene>
  );
};

const SceneB: React.FC = () => {
  const now = useNow();
  const t0 = P[2].start - 0.25, t1 = P[4].start - 0.2;
  const cam: Cam[] = [[t0, 0, -240, 1.3], [P[3].start - 0.3, 0, -240, 1.4], [P[3].start + 0.5, -190, -290, 1.75], [t1, -190, -290, 1.85]];
  const passA = wt(2, 3), passB = wt(2, 6);
  const pass = r(now, passA, passB);
  const good = r(now, P[3].start, keyT(3));
  const yPose = idle(poseAt(now, [[0, POSES.stand], [passA - 0.4, POSES.give], [passB + 0.2, POSES.stand], [P[3].start + 0.2, POSES.proud]]), now);
  const gPose = idle(poseAt(now, [[0, POSES.stand], [passB - 0.5, POSES.take], [passB + 0.5, POSES.stand]]), now, 2);
  const sx = interpolate(pass, [0, 1], [-70, 80]);
  const sy = -300 - Math.sin(pass * Math.PI) * 40;
  return (
    <Scene t0={t0} t1={t1} cam={cam}>
      <Ground />
      <circle cx={-190} cy={-260} r={150 + Math.sin(now * 4) * 8} fill={Y} opacity={0.13 * good} />
      <Draw d="M-70,-300 L80,-300" p={r(now, passA - 0.3, passA + 0.2)} w={2} o={0.5 * (1 - good)} />
      {now < P[3].start ? <g transform={`translate(${sx} ${sy})`}><Star s={0.8} /></g> : null}
      <g opacity={1 - good * 0.7}>
        <Figure x={190} y={0} palette={PALETTES.gray} facing={-1} pose={gPose}
          hand={now > passB ? <Star s={0.6} glow={0.3} /> : null} />
      </g>
      <Figure x={-190} y={0} facing={1} pose={yPose} />
      {[[-300, -470], [-70, -500], [-330, -330], [-50, -350]].map(([x, y], i) => {
        const at = keyT(3) + i * 0.12;
        return <Sparkle key={i} x={x} y={y + Math.sin(now * 3 + i) * 6} s={r(now, at, at + 0.25) * (1 - r(now, t1 - 0.5, t1))} />;
      })}
    </Scene>
  );
};

const SceneC: React.FC = () => {
  const now = useNow();
  const t0 = P[4].start - 0.25, t1 = P[5].start - 0.15;
  const cam: Cam[] = [[t0, 20, -280, 1.15], [t1, 110, -320, 0.98]];
  const k = keyT(4);
  const mountain = r(now, t0 + 0.2, k);
  const ghost = r(now, k - 0.1, k + 0.4);
  return (
    <Scene t0={t0} t1={t1} cam={cam}>
      <Ground w={1800} />
      <Draw d="M-60,0 L120,-160 L200,-120 L380,-430 L560,-150 L640,-200 L820,0" p={mountain} w={3} color="#8a8a8a" dash="14 12" />
      <g opacity={ghost * 0.45} style={{ filter: "drop-shadow(0 0 18px #f2c23088)" }}>
        <Figure x={380} y={-432} scale={0.6} pose={idle(POSES.cheer, now)} />
      </g>
      <Flag x={430} y={-432} p={ghost} glow={ghost} o={0.6} />
      <Figure x={-260} y={0} facing={1} pose={idle(poseAt(now, [[0, POSES.stand], [k - 0.2, POSES.lookUp]]), now)} />
    </Scene>
  );
};

const walkX = (now: number) => {
  const p = interpolate(now, [P[5].start, P[5].end - 0.6], [0, 1], clamp);
  return -220 + 560 * (1 - Math.pow(1 - p, 2.2));
};
const SceneD: React.FC = () => {
  const now = useNow();
  const t0 = P[5].start - 0.2, t1 = P[5].end + 0.15;
  const x = walkX(now);
  const cam: Cam[] = new Array(12).fill(0).map((_, i) => {
    const t = t0 + ((t1 - t0) * i) / 11;
    return [t, walkX(t) + 90, -270, 1.25] as Cam;
  });
  const speed = 1 - interpolate(now, [P[5].start, P[5].end - 0.6], [0, 1], clamp);
  const walking = now > P[5].start && now < P[5].end - 0.6;
  const phase = (now - P[5].start) * 9 * (0.45 + speed * 0.55);
  const level = 1 - r(now, P[5].start + 0.3, keyT(5) + 0.3) * 0.9;
  const base = walking ? walkPose(phase, Math.max(0.15, speed)) : POSES.stand;
  const pose = mixPose(base, POSES.slump, r(now, P[5].end - 0.7, P[5].end - 0.2));
  return (
    <Scene t0={t0} t1={t1} cam={cam}>
      <Ground x={300} w={2200} />
      <Flag x={1250} y={0} p={1} glow={0.4} o={0.5} />
      <Figure x={x} y={0} pose={idle(pose, now, 0, 0.5)} facing={1}
        aboveHead={
          <g transform="translate(0 -10)">
            <rect x={-70} y={-12} width={140} height={22} rx={11} fill="none" stroke="#777" strokeWidth={3} />
            <rect x={-65} y={-7} width={130 * level} height={12} rx={6} fill={level > 0.35 ? Y : "#c0563b"} />
          </g>
        } />
    </Scene>
  );
};

const SceneE: React.FC = () => {
  const now = useNow();
  const t0 = P[6].start - 0.1, t1 = P[9].start - 0.25;
  const cam: Cam[] = [[t0, 0, -320, 1.45], [P[7].start, 0, -320, 1.35], [P[7].start + 2.2, 0, -270, 0.86], [t1, 0, -270, 0.82]];
  const drop = r(now, t0, t0 + 0.6);
  const body = r(now, t0 + 0.45, t0 + 0.9);
  const orbIn = r(now, P[7].start + 0.1, P[7].start + 0.8);
  const breakT = keyT(8);
  const broken = now > breakT;
  const yPose = idle(poseAt(now, [[0, POSES.stand], [P[7].start, POSES.holdUp], [breakT + 0.15, POSES.handOnHead]]), now);
  const hand = broken ? null : (
    <g transform="translate(0 -95)" opacity={orbIn}>
      <circle r={80} fill={Y} opacity={0.12} />
      <Draw d="M-60,20 Q-80,-20 -40,-30 Q-30,-70 10,-60 Q40,-80 55,-40 Q85,-30 70,10 Q65,25 40,22 L-45,22 Q-60,22 -60,20 Z" p={orbIn} w={4} />
      <g transform="translate(5 -10) scale(0.7)" opacity={orbIn}><Star glow={0} /></g>
    </g>
  );
  const crowd = [-560, -360, 360, 560];
  return (
    <Scene t0={t0} t1={t1} cam={cam}>
      <Ground w={1800} />
      {crowd.map((cx, i) => {
        const side = cx < 0 ? -1 : 1;
        const a = P[7].start + 0.6 + i * 0.15, b = keyT(7) + 0.3 + i * 0.1;
        const p = r(now, a, b);
        const x = side * 1000 + (cx - side * 1000) * p;
        const moving = now > a && now < b;
        const reacher = i === 1 && now > breakT - 0.6;
        const pose = moving ? walkPose((now - a) * 9) : reacher ? poseAt(now, [[0, POSES.stand], [breakT - 0.45, POSES.reach], [breakT + 0.5, POSES.stand]]) : POSES.listen;
        const laugh = broken ? Math.abs(Math.sin(now * 14 + i)) * 4 * (1 - r(now, breakT + 1.2, breakT + 1.8)) : 0;
        return (
          <g key={cx} style={{ filter: i % 3 === 0 ? "blur(1.5px)" : "none" }}>
            <Figure x={x} y={-laugh} scale={i % 3 === 0 ? 0.85 : 0.95} palette={PALETTES.dark} facing={(-side) as 1 | -1} pose={idle(pose, now, i, moving ? 0 : 1)} />
          </g>
        );
      })}
      {broken ? new Array(12).fill(0).map((_, i) => {
        const dt = now - breakT;
        const vx = Math.cos(i * 0.53 + 0.4) * (90 + (i % 4) * 40) * (i % 2 ? 1 : -1);
        const vy = -160 - (i % 5) * 50;
        const fx = 20 + vx * dt, fy = -560 + vy * dt + 900 * dt * dt * 0.5;
        return fy < 0 ? (
          <rect key={i} x={fx} y={fy} width={10 + (i % 3) * 5} height={6} fill={Y} opacity={1 - r(now, breakT + 0.6, breakT + 1.4)}
            transform={`rotate(${dt * 400 * (i % 2 ? 1 : -1)} ${fx} ${fy})`} />
        ) : null;
      }) : null}
      <g opacity={body}>
        <Figure x={0} y={0} pose={yPose} facing={1} hand={hand} />
      </g>
      {body < 1 ? <circle cx={0} cy={HEAD_Y + 10 - (1 - drop) * 700} r={36} fill="url(#gold)" /> : null}
    </Scene>
  );
};

const stairY = (x: number, x0: number, w: number, h: number, steps: number) =>
  -Math.min(steps, Math.max(0, Math.floor((x - x0) / w) + 1)) * h;

const SceneF: React.FC = () => {
  const now = useNow();
  const t0 = P[9].start - 0.2, t1 = P[11].start - 0.35;
  const top = -390;
  const cam: Cam[] = [[t0, 300, -640, 1.3], [P[10].start - 0.1, 300, -640, 1.35], [P[10].start + 0.9, -330, -280, 1.3], [t1, -330, -270, 1.42]];
  const stairs = "M-80,0 " + new Array(6).fill(0).map((_, i) => `L${-80 + i * 70},${-i * 65} L${-80 + i * 70},${-(i + 1) * 65}`).join(" ") + " L620,-390";
  const shrink = r(now, keyT(10) - 0.3, keyT(10) + 0.6);
  return (
    <Scene t0={t0} t1={t1} cam={cam}>
      <Ground x={-200} w={1400} />
      <Draw d={stairs} p={r(now, t0, t0 + 0.8)} w={3} color="#7a7a7a" />
      <Flag x={480} y={top} p={r(now, P[9].start + 0.3, keyT(9))} glow={1} />
      <Figure x={330} y={top} pose={idle(poseAt(now, [[0, POSES.stand], [keyT(9) - 0.1, POSES.cheer]]), now)} facing={1} />
      {[-560, -380, -200].map((x, i) => {
        const pose = poseAt(now, [[0, POSES.lookUp], [keyT(10) - 0.2 + i * 0.12, i === 1 ? POSES.handOnHead : POSES.hunch]]);
        return (
          <Figure key={x} x={x - shrink * 40} y={0} scale={0.95 - shrink * 0.12} palette={PALETTES.dark} facing={1}
            pose={idle(pose, now, i)} opacity={1 - shrink * 0.35} />
        );
      })}
    </Scene>
  );
};

const SceneG: React.FC = () => {
  const now = useNow();
  const t0 = P[11].start - 0.1, t1 = P[12].start - 0.2;
  const cam: Cam[] = [[t0, 0, -300, 1.45], [t1, 0, -310, 1.8]];
  const hold = r(now, P[11].start + 0.2, keyT(11));
  return (
    <Scene t0={t0} t1={t1} cam={cam}>
      <Ground />
      <circle cx={0} cy={-270} r={130 + Math.sin(now * 3) * 6} fill={Y} opacity={0.1 + hold * 0.08} />
      <g transform={`translate(${30 - hold * 10} ${-330 + hold * 50})`}><Star s={0.8 - hold * 0.25} glow={1} /></g>
      <Figure x={0} y={0} facing={1} pose={idle(mixPose(POSES.stand, POSES.holdChest, hold), now, 0, 0.7)} />
    </Scene>
  );
};

const climbX = (now: number) => interpolate(now, [P[12].start - 0.1, P[13].end + 0.3], [-520, 330], clamp);
const SceneH: React.FC = () => {
  const now = useNow();
  const t0 = P[12].start - 0.25, t1 = P[13].end + 0.45;
  const W = 95, H = 70, N = 12, X0 = -400;
  const x = climbX(now);
  const yy = (xx: number) => stairY(xx, X0, W, H, N);
  // smooth the body height between steps
  const smoothY = interpolate((x - X0) / W % 1, [0, 1], [0, 1], clamp);
  const fy = x < X0 ? 0 : yy(x - W * 0.5) + (yy(x + W * 0.5) - yy(x - W * 0.5)) * io(smoothY);
  const cam: Cam[] = new Array(10).fill(0).map((_, i) => {
    const t = t0 + ((t1 - t0) * i) / 9;
    const cx = climbX(t);
    return [t, cx + 120, yy(cx) - 300, 1.1] as Cam;
  });
  const stairs = `M-900,0 L${X0},0 ` + new Array(N).fill(0).map((_, i) => `L${X0 + i * W},${-(i + 1) * H} L${X0 + (i + 1) * W},${-(i + 1) * H}`).join(" ");
  const phase = (now - P[12].start) * 8;
  return (
    <Scene t0={t0} t1={t1} cam={cam}>
      <Draw d={stairs} p={r(now, t0, t0 + 1.2)} w={3} color="#7a7a7a" />
      <Flag x={X0 + N * W + 60} y={-N * H} p={r(now, t0 + 0.5, t0 + 1.5)} glow={1} />
      <Figure x={x} y={fy} facing={1} pose={{ ...walkPose(phase, 1), lean: 12 }} />
    </Scene>
  );
};

// ---------------------------------------------------------------- dots
const SLOTS = [0, 1, 2].map((i) => [540 + (i - 1) * 46 * -1, 230]); // RTL: first slot on the right
const FLIGHTS: { t: number; from: () => [number, number] }[] = [
  { t: P[5].end + 0.05, from: () => [540, 520] },
  { t: P[10].end + 0.05, from: () => [540, 760] },
  { t: P[13].end + 0.25, from: () => [540, 640] },
];

const Dots: React.FC = () => {
  const now = useNow();
  const show = r(now, 2.8, 3.4);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      {SLOTS.map(([x, y], i) => {
        const on = now >= FLIGHTS[i].t + 0.7;
        return <circle key={i} cx={x} cy={y} r={on ? 9 : 7} fill={on ? Y : "#bdbdbd"} opacity={show * (on ? 1 : 0.55)}
          style={{ filter: on ? `drop-shadow(0 0 8px ${Y})` : "none" }} />;
      })}
      {FLIGHTS.map((f, i) => {
        if (now < f.t || now > f.t + 0.75) return null;
        const p = io((now - f.t) / 0.7);
        const [x0, y0] = f.from();
        const [x1, y1] = SLOTS[i];
        const mx = (x0 + x1) / 2 + 160, my = Math.min(y0, y1) - 40;
        const bx = (1 - p) * (1 - p) * x0 + 2 * (1 - p) * p * mx + p * p * x1;
        const by = (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * my + p * p * y1;
        return (
          <g key={i}>
            <circle cx={bx} cy={by} r={20 - 11 * p} fill={Y} style={{ filter: `drop-shadow(0 0 14px ${Y})` }} />
            {[1, 2, 3].map((k) => {
              const q = Math.max(0, p - k * 0.06);
              const tx = (1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * mx + q * q * x1;
              const ty = (1 - q) * (1 - q) * y0 + 2 * (1 - q) * q * my + q * q * y1;
              return <circle key={k} cx={tx} cy={ty} r={(20 - 11 * q) * (1 - k * 0.25)} fill={Y} opacity={0.35 - k * 0.1} />;
            })}
          </g>
        );
      })}
    </svg>
  );
};

// ---------------------------------------------------------------- kinetic text
type Layout = { y: number; size?: number };
const LAYOUT: Layout[] = [
  { y: 420 }, { y: 420 }, { y: 470 }, { y: 400 }, { y: 400 }, { y: 1430 }, { y: 1560, size: 0.85 },
  { y: 420 }, { y: 420 }, { y: 330 }, { y: 1430 }, { y: 400 }, { y: 420 }, { y: 420 },
];

const PhraseText: React.FC<{ ph: Ph; until: number; layout: Layout }> = ({ ph, until, layout }) => {
  const now = useNow();
  if (now < ph.words[0].t - 0.15 || now > until) return null;
  const out = r(now, until - 0.3, until);
  const k = layout.size ?? 1;
  return (
    <div style={{
      position: "absolute", top: layout.y, left: 50, right: 50, display: "flex", flexWrap: "wrap", justifyContent: "center",
      alignItems: "baseline", direction: "rtl", gap: "0 20px", fontFamily: FONT, lineHeight: 1.35,
      opacity: 1 - out, filter: `blur(${out * 12}px)`,
    }}>
      {ph.words.map((w, i) => {
        const p = io(interpolate(now, [w.t - 0.1, w.t + 0.18], [0, 1], clamp));
        return (
          <span key={i} style={{
            display: "inline-block", opacity: p, filter: `blur(${(1 - p) * 10}px)`,
            transform: `translateY(${(1 - p) * 22}px) scale(${w.key ? 0.85 + 0.15 * p : 1})`,
            fontSize: (w.key ? 108 : 56) * k, fontWeight: w.key ? 900 : 500, color: w.key ? Y : "#efefef",
            textShadow: w.key ? `0 0 40px ${Y}44` : "0 2px 10px rgba(0,0,0,0.6)",
          }}>{w.w}</span>
        );
      })}
    </div>
  );
};

const Texts: React.FC = () => (
  <>
    {P.map((ph, i) => {
      const next = P[i + 1];
      const until = next ? Math.min(next.words[0].t - 0.05, ph.end + 0.9) : ph.end + 0.5;
      return <PhraseText key={i} ph={ph} until={until} layout={LAYOUT[i]} />;
    })}
  </>
);

// ---------------------------------------------------------------- outro card
const Outro: React.FC = () => {
  const now = useNow();
  const t0 = P[13].end + 0.9;
  if (now < t0) return null;
  const save: Ph = {
    start: t0, end: t0 + 1, text: "",
    words: [
      { w: "ذخیره‌ش", t: t0 + 0.35, key: true }, { w: "کن", t: t0 + 0.55, key: false },
    ],
  };
  const share: Ph = {
    start: t0, end: t0 + 1, text: "",
    words: ["و", "برای", "یه", "دوست", "بفرست"].map((w, i) => ({ w, t: t0 + 0.8 + i * 0.12, key: false })),
  };
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <g transform="translate(540 820)">
          <Draw d="M-34,-48 L34,-48 L34,48 L0,22 L-34,48 Z" p={r(now, t0, t0 + 0.6)} w={6} />
        </g>
      </svg>
      <PhraseText ph={save} until={99} layout={{ y: 920 }} />
      <PhraseText ph={share} until={99} layout={{ y: 1080, size: 0.9 }} />
    </>
  );
};

// ---------------------------------------------------------------- main
export const GoalsKinetic: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #2c2d2f 0%, #17181a 42%, #0b0b0c 100%)" }}>
      <Audio src={staticFile("goals-voice.mp3")} />
      <Audio src={staticFile("goals-music.mp3")} volume={0.06} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 520px 640px at 540px 1000px, rgba(255,255,255,0.055), transparent)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="gold" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffe27a" />
            <stop offset="100%" stopColor="#c9950f" />
          </radialGradient>
          <linearGradient id="groundGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity={0} />
            <stop offset="50%" stopColor="#fff" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <SceneA />
        <SceneB />
        <SceneC />
        <SceneD />
        <SceneE />
        <SceneF />
        <SceneG />
        <SceneH />
      </svg>
      <Texts />
      <Dots />
      <Outro />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, transparent 58%, rgba(0,0,0,0.5) 100%)" }} />
    </AbsoluteFill>
  );
};

export const GOALS_DURATION = data.duration;

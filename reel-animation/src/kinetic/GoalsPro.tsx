import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import data from "../timeline-goals.json";
import { useFonts } from "../explainer/PeopleToAvoid";
import { Figure, POSES, PALETTES, Palette, Pose, mixPose, walkPose } from "./Figure";

/*
 * "The yellow dot is your goal" — one continuous shot, no cuts, no fades.
 * Every scene is built out of the previous one: the dot becomes a flag, a star,
 * a feeling, a road, a dream, a staircase, and finally the save icon and the dot again.
 * Everything is a pure function of time. 60 fps + 3-sample motion blur.
 */

const FONT = "Vazirmatn";
// accent colour (brand colour of the page)
const Y = "#f2c230";
const BG = "#101010";
const LINE = "#3a3a3a";
const CX = 540, CY = 960;

// ------------------------------------------------------------------ easing (pure functions of time)
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const expoOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const expoIn = (x: number) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
const expoInOut = (x: number) =>
  x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
// critically damped spring (no overshoot)
const spring = (t: number, w = 14) => (t <= 0 ? 0 : 1 - (1 + w * t) * Math.exp(-w * t));
const R = (now: number, a: number, b: number, f: (x: number) => number = expoInOut) => f(clamp01((now - a) / (b - a)));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// ------------------------------------------------------------------ timeline
type Word = { w: string; t: number; key: boolean };
type Ph = { start: number; end: number; words: Word[] };
const P = data.phrases as Ph[];
const W = (p: number, i: number) => P[p].words[i].t;
const KEY = (p: number) => (P[p].words.find((w) => w.key) ?? P[p].words[0]).t;
const END = data.duration;

// ------------------------------------------------------------------ geometry
type Pt = [number, number];
const N = 72;
const resample = (pts: Pt[], n = N, closed = false): Pt[] => {
  const src = closed ? [...pts, pts[0]] : pts;
  const seg: number[] = [0];
  for (let i = 1; i < src.length; i++) seg.push(seg[i - 1] + Math.hypot(src[i][0] - src[i - 1][0], src[i][1] - src[i - 1][1]));
  const total = seg[seg.length - 1];
  const out: Pt[] = [];
  const count = closed ? n : n - 1;
  for (let k = 0; k < n; k++) {
    const d = (total * k) / count;
    let i = 1;
    while (i < seg.length - 1 && seg[i] < d) i++;
    const f = (d - seg[i - 1]) / Math.max(1e-6, seg[i] - seg[i - 1]);
    out.push([lerp(src[i - 1][0], src[i][0], f), lerp(src[i - 1][1], src[i][1], f)]);
  }
  return out;
};
const pointAt = (pts: Pt[], s: number): Pt => {
  const r = resample(pts, 200);
  const i = Math.min(199, Math.max(0, Math.round(s * 199)));
  return r[i];
};
const morph = (a: Pt[], b: Pt[], p: number): Pt[] => a.map((q, i) => [lerp(q[0], b[i][0], p), lerp(q[1], b[i][1], p)]);
const toD = (pts: Pt[], closed = true) => "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L") + (closed ? " Z" : "");

const circle = (cx: number, cy: number, r: number): Pt[] =>
  new Array(N).fill(0).map((_, i) => {
    const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
const star = (cx: number, cy: number, r: number): Pt[] => {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return resample(pts, N, true);
};
const cloud = (cx: number, cy: number, r: number): Pt[] => {
  const pts: Pt[] = [];
  for (let i = 0; i < 240; i++) {
    const a = -Math.PI / 2 + (i / 240) * Math.PI * 2;
    const rr = r * (0.8 + 0.2 * Math.abs(Math.sin(a * 2.5 + 0.6)));
    pts.push([cx + Math.cos(a) * rr * 1.3, Math.min(cy + r * 0.45, cy + Math.sin(a) * rr)]);
  }
  return resample(pts, N, true);
};
const crumple = (cx: number, cy: number, w: number, h: number, zig: number): Pt[] => {
  const top: Pt[] = [], bot: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const x = cx - w / 2 + (w * i) / 12;
    const z = (i % 2 ? 1 : -1) * zig * Math.sin((i / 12) * Math.PI);
    top.push([x, cy - h / 2 + z]);
    bot.unshift([x, cy + h / 2 + z]);
  }
  return resample([...top, ...bot], N, true);
};
const bookmark = (cx: number, cy: number, w: number, h: number): Pt[] =>
  resample([[cx, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx, cy + h * 0.22], [cx - w / 2, cy + h / 2], [cx - w / 2, cy - h / 2]], N, true);

// world layout
const MOUNTAIN: Pt[] = [[0, 0], [150, 0], [380, -180], [460, -140], [600, -300], [760, -120], [860, -160], [1000, 0], [1300, 0]];
const PEAK_S = 0.5; // arc-length position of the peak along MOUNTAIN (approx; refined below)
const mountainPts = resample(MOUNTAIN, 160);
const peakIndex = mountainPts.reduce((b, p, i) => (p[1] < mountainPts[b][1] ? i : b), 0);
const peakS = peakIndex / 159 || PEAK_S;
const PEAK: Pt = [600, -300];

const S1 = { x0: 760, w: 95, h: 70, n: 6 }; // first staircase (made from the fallen dream)
const S2 = { x0: 1480, w: 70, h: 100, n: 8 }; // the steep one
const stairPts = (s: typeof S1, base: number, end: number): Pt[] => {
  const pts: Pt[] = [[s.x0 - 160, base]];
  pts.push([s.x0, base]);
  for (let i = 0; i < s.n; i++) {
    pts.push([s.x0 + i * s.w, base - (i + 1) * s.h]);
    pts.push([s.x0 + (i + 1) * s.w, base - (i + 1) * s.h]);
  }
  pts.push([end, base - s.n * s.h]);
  return pts;
};
const STAIRS1 = resample(stairPts(S1, 0, 1480), N);
const STAIRS2 = stairPts(S2, -420, 2240);
const stepH = (x: number, s: typeof S1) => {
  const k = clamp01((x - s.x0 + s.w * 0.4) / (s.w * s.n)) * s.n;
  return s.h * (Math.floor(k) + expoInOut(clamp01((k % 1) * 2.2)));
};
const groundAt = (x: number) => -(stepH(x, S1) + stepH(x, S2));

// ------------------------------------------------------------------ the hero
const heroX = (t: number) => {
  if (t < 1.0) return -760;
  if (t < 2.8) return lerp(-760, -120, R(t, 1.0, 2.8, (x) => (1 - Math.cos(x * Math.PI)) / 2));
  if (t < 15.8) return -120;
  if (t < 18.95) { const p = clamp01((t - 15.8) / 3.15); return -120 + 770 * (1 - Math.pow(1 - p, 2.2)); }
  if (t < 27.25) return 650;
  if (t < 28.95) return lerp(650, 1380, R(t, 27.25, 28.95, (x) => (1 - Math.cos(x * Math.PI)) / 2));
  if (t < 35.5) return 1380;
  if (t < 39.4) return lerp(1380, 1985, R(t, 35.5, 39.4, (x) => (1 - Math.cos(x * Math.PI)) / 2));
  return 1985;
};
const heroY = (t: number) => groundAt(heroX(t));
const heroSpeed = (t: number) => (heroX(t + 0.02) - heroX(t - 0.02)) / 0.04;

const heroFacing = (t: number): 1 | -1 => (t > 3.4 && t < 11.9 ? -1 : 1);

const heroPose = (t: number): Pose => {
  const steps: [number, Pose][] = [
    [0, POSES.stand],
    [W(2, 3) - 0.35, POSES.give], [W(2, 6), POSES.stand],
    [P[3].start + 0.1, POSES.proud],
    [P[4].start + 0.25, POSES.lookUp],
    [18.85, POSES.slump],
    [19.9, POSES.stand], [20.4, POSES.holdUp],
    [KEY(8) + 0.25, POSES.handOnHead],
    [27.1, POSES.stand],
    [KEY(9) - 0.15, POSES.cheer],
    [P[10].start + 0.3, POSES.stand],
    [33.85, POSES.holdChest],
    [35.35, POSES.stand],
  ];
  let pose = steps[0][1];
  for (let i = 1; i < steps.length; i++) pose = mixPose(pose, steps[i][1], R(t, steps[i][0] - 0.12, steps[i][0] + 0.3, (x) => spring(x * 0.42, 12)));
  // talking hands while sharing the goal
  const talk = R(t, P[1].start - 0.1, P[1].start + 0.2) * (1 - R(t, P[1].end, P[1].end + 0.3));
  if (talk > 0) pose = mixPose(pose, { ...POSES.talk, eF: -40 + Math.sin(t * 9) * 25, sF: 55 + Math.sin(t * 4.5) * 10 }, talk);
  // walking: phase from distance travelled → feet don't slide
  const v = Math.abs(heroSpeed(t));
  const amt = clamp01(v / 140);
  if (amt > 0.01) pose = mixPose(pose, { ...walkPose((heroX(t) / 170) * Math.PI, 1), lean: t > 27 ? 11 : 5 }, amt);
  return idle(pose, t, 0, 1 - amt);
};

const idle = (p: Pose, t: number, seed = 0, amt = 1): Pose => ({
  ...p,
  lean: p.lean + Math.sin(t * 1.9 + seed) * 1.4 * amt,
  head: p.head + Math.sin(t * 1.3 + seed * 2) * 2.5 * amt,
  sF: p.sF + Math.sin(t * 1.9 + seed + 1) * 2 * amt,
  sB: p.sB - Math.sin(t * 1.9 + seed + 1) * 2 * amt,
});

const heroHead = (t: number): Pt => [heroX(t), heroY(t) - 386];
const heroChest = (t: number): Pt => [heroX(t) + heroFacing(t) * 8, heroY(t) - 300];

// ------------------------------------------------------------------ the others
const GRAYS = [
  { x0: -520, x1: 520, back: false },
  { x0: -650, x1: 420, back: true },
  { x0: -780, x1: 320, back: false },
  { x0: -910, x1: 220, back: true },
];
const grayX = (i: number, t: number) => {
  const g = GRAYS[i];
  const a = 21.55 + i * 0.12, b = 23.75 + i * 0.1;
  const p = clamp01((t - a) / (b - a));
  const e = (1 - Math.cos(p * Math.PI)) / 2;
  const shrink = R(t, KEY(10) - 0.3, KEY(10) + 0.5, expoOut);
  return lerp(g.x0, g.x1, e) - shrink * 50 * (i + 1) * 0.5;
};

// ------------------------------------------------------------------ the goal (yellow dot) — one object, many shapes
type Goal = { pts: Pt[] } | null;
const DOT0: Pt = [0, -900];
const DOT_END: Pt = [2100, -2350];

const arc = (a: Pt, b: Pt, p: number, lift = 120): Pt => [lerp(a[0], b[0], p), lerp(a[1], b[1], p) - Math.sin(p * Math.PI) * lift];

const FALL_T = 0.75;
const goalAt = (t: number): Goal => {
  // 1. drop + land
  if (t < 0.85) {
    if (t < FALL_T) {
      const y = DOT0[1] + 0.5 * 3172 * t * t;
      const stretch = 1 + Math.min(0.5, t * 0.6);
      return { pts: circle(0, y, 8).map(([x, yy]) => [x * (1 / Math.sqrt(stretch)), y + (yy - y) * stretch] as Pt) };
    }
    const k = 1 - spring(t - FALL_T, 20);
    return { pts: circle(0, -8 + 3 * k, 8).map(([x, y]) => [x * (1 + 0.5 * k), -8 + 3 * k + (y + 8 - 3 * k) * (1 - 0.45 * k)] as Pt) };
  }
  // 2. roll up the mountain to the peak (grows on the way)
  if (t < 2.2) {
    const s = peakS * R(t, 0.85, 2.15);
    const r = lerp(8, 16, R(t, 0.85, 1.3, expoOut));
    const [x, y] = pointAt(MOUNTAIN, s);
    return { pts: circle(x, y - r, r) };
  }
  // 3. flag knob (drawn by <Flag>) until it collapses back into a dot and flies to the hand
  if (t < 6.85) return null;
  const hand: Pt = [heroX(t) - 142, -300];
  const gHand: Pt = [GRAYS[0].x0 + 142, -300];
  if (t < 7.6) {
    const p = R(t, 6.85, 7.55);
    const [x, y] = arc([600, -316], hand, p, 220);
    const r = lerp(16, 12, p);
    return { pts: morph(circle(x, y, r), star(x, y, 26), R(t, 7.3, 7.6, expoOut)) };
  }
  // 4. star passed to the other person
  if (t < 9.8) {
    const p = R(t, W(2, 4), W(2, 6));
    const [x, y] = arc(hand, gHand, p, 90);
    return { pts: star(x, y, 26) };
  }
  // 5. it comes back into your chest → the good feeling (torso fill)
  if (t < 10.25) {
    const p = R(t, 9.8, 10.2);
    const [x, y] = arc(gHand, heroChest(t), p, 80);
    return { pts: morph(star(x, y, 26), circle(x, y, 2), R(t, 9.95, 10.25, expoIn)) };
  }
  if (t < 12.0) return null;
  // 6. the feeling leaves through the head and runs up the mountain (imagined success)
  const arrive = 13.3;
  if (t < 12.6) {
    const h = heroHead(t);
    const p = R(t, 12.15, 12.6);
    const [x, y] = arc([h[0], h[1] - 30], [0, -14], p, 160);
    return { pts: circle(x, y, 14 * R(t, 12.0, 12.2, expoOut)) };
  }
  if (t < arrive) {
    const s = peakS * R(t, 12.6, arrive);
    const [x, y] = pointAt(MOUNTAIN, s);
    return { pts: circle(x, y - 14, 14) };
  }
  // ghost's head: rise from peak while the ghost body grows under it
  if (t < 15.4) {
    const y = lerp(PEAK[1] - 14, PEAK[1] - 0.9 * 386, spring(t - arrive, 9));
    return { pts: circle(600, y, 14) };
  }
  // 7. back down to the peak, then ride the flattening peak to the road's end
  if (t < 16.25) {
    const down = R(t, 15.45, 15.85, expoIn);
    const y0 = lerp(PEAK[1] - 0.9 * 386, PEAK[1] - 14, down);
    const flat = R(t, 15.75, 16.25);
    return { pts: circle(600, lerp(y0, -6, flat), lerp(14, 6, flat)) };
  }
  if (t < 19.0) return null; // it IS the road now (<Road>)
  // 8. the last bit of road rolls up into a dot and floats above your hand
  const cloudC: Pt = [742, -520];
  if (t < 21.35) {
    const p = R(t, 19.55, 20.85);
    const [x, y] = arc([650, -10], cloudC, p, 60);
    return { pts: circle(x, y, lerp(6, 16, R(t, 19.0, 19.6, expoOut))) };
  }
  // 9. the dot inflates into a dream
  const pop = KEY(8);
  if (t < pop) {
    const bob = Math.sin(t * 2.2) * 6 * R(t, 22, 22.5);
    return { pts: morph(circle(cloudC[0], cloudC[1] + bob, 16), cloud(cloudC[0], cloudC[1] + bob, 72), R(t, 21.4, 22.3, expoOut)) };
  }
  // 10. crushed → falls with gravity → lands as a flat line
  const crushT = pop + 0.22;
  if (t < crushT) {
    return { pts: morph(cloud(cloudC[0], cloudC[1], 72), crumple(cloudC[0], cloudC[1], 250, 14, 14), R(t, pop, crushT, expoOut)) };
  }
  const g = 3000, h0 = cloudC[1], fallDur = Math.sqrt((2 * (-6 - h0)) / g);
  if (t < crushT + fallDur) {
    const dt = t - crushT;
    return { pts: crumple(cloudC[0], h0 + 0.5 * g * dt * dt, 250, 14, 14) };
  }
  if (t < 27.0) {
    const k = R(t, crushT + fallDur, crushT + fallDur + 0.35, expoOut);
    return { pts: crumple(cloudC[0], -6 + 3 * k, 250, lerp(14, 6, k), lerp(14, 0, k)) };
  }
  // 11. (staircase drawn by <Stairs1>) … flag 2 … collapses into your chest
  if (t < 33.35) return null;
  if (t < 34.25) {
    const p = R(t, 33.55, 34.2);
    const [x, y] = arc([1480, -600], heroChest(t), p, 120);
    return { pts: circle(x, y, lerp(12, 4, R(t, 33.95, 34.25, expoIn))) };
  }
  if (t < 39.35) return null; // kept inside (core)
  // 12. it leaves your chest, rises, becomes the save icon, and becomes the first frame again
  const c = heroChest(t);
  const up = R(t, 39.35, 40.15);
  const pos: Pt = [lerp(c[0], DOT_END[0], up), lerp(c[1], DOT_END[1], expoOut(clamp01((t - 39.35) / 0.8)))];
  const r = lerp(14, 8, R(t, 41.0, 41.45));
  const toMark = R(t, 39.95, 40.4, expoOut) * (1 - R(t, 40.95, 41.4));
  return { pts: morph(circle(pos[0], pos[1], r), bookmark(pos[0], pos[1], 60, 84), toMark) };
};

const goalCenter = (t: number): Pt => {
  const g = goalAt(t);
  if (!g) return [0, 0];
  const s = g.pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [s[0] / g.pts.length, s[1] / g.pts.length];
};
// ------------------------------------------------------------------ camera: keyed targets + stateless lag
type Cam = [number, number, number];
const follow = (dx: number, dy: number, z: number) => (t: number): Cam => [heroX(t) + dx, heroY(t) + dy, z];
const fixed = (x: number, y: number, z: number) => () => [x, y, z] as Cam;
const DOT_CAM = (p: Pt) => fixed(p[0], p[1] + 60 / 2.75, 2.75);
const CAM_KEYS: [number, (t: number) => Cam][] = [
  [0, DOT_CAM(DOT0)],
  [0.25, DOT_CAM(DOT0)],
  [0.7, (t) => [0, goalCenter(t)[1] + 40, 1.25]],
  [1.0, (t) => [goalCenter(t)[0] + 40, -140, 1.35]],
  [1.9, (t) => [goalCenter(t)[0] + 60, goalCenter(t)[1] + 60, 1.15]],
  [2.6, fixed(300, -250, 0.92)],
  [3.25, fixed(180, -250, 0.92)],
  [4.2, fixed(-420, -250, 0.9)],
  [6.3, fixed(-440, -250, 0.92)],
  [7.1, fixed(-290, -280, 1.35)],
  [9.6, fixed(-270, -280, 1.4)],
  [10.4, fixed(-120, -300, 1.9)],
  [11.7, fixed(-120, -300, 2.0)],
  [12.7, fixed(260, -300, 1.0)],
  [15.2, fixed(300, -330, 1.05)],
  [16.0, follow(160, -250, 1.1)],
  [18.9, follow(140, -250, 1.12)],
  [19.7, fixed(690, -300, 1.35)],
  [21.3, fixed(700, -340, 1.3)],
  [23.6, fixed(520, -300, 0.95)],
  [26.9, fixed(560, -280, 0.98)],
  [27.6, follow(120, -300, 1.05)],
  [29.2, follow(110, -300, 1.08)],
  [29.9, fixed(1400, -720, 1.1)],
  [30.9, fixed(380, -280, 1.2)],
  [32.85, fixed(370, -280, 1.3)],
  [33.7, fixed(1390, -700, 1.6)],
  [35.2, fixed(1395, -700, 1.75)],
  [35.95, follow(170, -330, 1.0)],
  [39.2, follow(150, -330, 1.02)],
  [40.1, fixed(DOT_END[0], DOT_END[1] + 120, 1.45)],
  [40.9, fixed(DOT_END[0], DOT_END[1] + 115, 1.5)],
  [41.45, DOT_CAM(DOT_END)],
  [99, DOT_CAM(DOT_END)],
];
const camTarget = (t: number): Cam => {
  let i = 0;
  while (i < CAM_KEYS.length - 2 && CAM_KEYS[i + 1][0] <= t) i++;
  const [t0, f0] = CAM_KEYS[i], [t1, f1] = CAM_KEYS[i + 1];
  const p = expoInOut(clamp01((t - t0) / (t1 - t0)));
  const a = f0(t), b = f1(t);
  return [lerp(a[0], b[0], p), lerp(a[1], b[1], p), Math.exp(lerp(Math.log(a[2]), Math.log(b[2]), p))];
};
// stateless lag: average the target over the last 0.28 s
const camAt = (t: number): Cam => {
  const n = 8, win = 0.2;
  let x = 0, y = 0, z = 0;
  for (let k = 0; k < n; k++) {
    const c = camTarget(Math.max(0, t - (win * k) / (n - 1)));
    x += c[0]; y += c[1]; z += Math.log(c[2]);
  }
  const edge = clamp01(t / 0.6) * clamp01((END - 0.4 - t) / 0.6);
  return [x / n + Math.sin(t * 0.7) * 5 * edge, y / n + Math.cos(t * 0.53) * 4 * edge, Math.exp(z / n)];
};

// ------------------------------------------------------------------ props
const Draw: React.FC<{ d: string; p: number; w?: number; color?: string }> = ({ d, p, w = 4, color = Y }) => (
  <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray={1} strokeDashoffset={1 - clamp01(p)} />
);

const Flag: React.FC<{ base: Pt; grow: number; cloth: number; knobR?: number }> = ({ base, grow, cloth, knobR = 10 }) => {
  const top = base[1] - 170 * grow;
  return (
    <g>
      <line x1={base[0]} y1={base[1]} x2={base[0]} y2={top} stroke={Y} strokeWidth={5} strokeLinecap="round" />
      <path d={`M${base[0]},${top} L${base[0] + 90 * cloth},${top + 30} L${base[0]},${top + 60} Z`} fill={Y} />
      <circle cx={base[0]} cy={top} r={knobR} fill={Y} />
    </g>
  );
};

// ------------------------------------------------------------------ world
const World: React.FC<{ t: number }> = ({ t }) => {
  // ground line opens from the impact point
  const open = R(t, FALL_T, FALL_T + 1.1, expoOut);
  // mountain: draws behind the rolling dot, flattens into the road later
  const mDraw = Math.max(peakS * R(t, 0.85, 2.15) + 0.03, R(t, 2.0, 2.7, expoOut));
  const flat = R(t, 15.75, 16.25);
  const mountain = morph(resample(MOUNTAIN, N), resample([[0, 0], [1300, 0]], N), flat);
  // trail: the imagined path to success (dashed), becomes the solid road
  const trailDraw = R(t, 12.6, 13.3);
  const trailBase = resample(MOUNTAIN.slice(0, 5), N);
  const trail = morph(trailBase, trailBase.map(([x]) => [x, -6] as Pt), flat);
  const solid = R(t, 15.9, 16.25);
  // the road ahead of you (motivation): shrinks from the far end as you walk
  const hx = heroX(t);
  const roadIn = R(t, 16.2, 16.6, expoOut);
  const drain = clamp01((t - 16.6) / (18.95 - 16.6));
  let roadR = lerp(600, 1000, roadIn);
  if (t > 16.6) roadR = Math.max(hx + 34, lerp(1000, hx + 34, drain * drain * (3 - 2 * drain)));
  let roadL = lerp(0, hx - 34, roadIn);
  const roll = R(t, 19.0, 19.55, expoIn);
  roadL = lerp(roadL, 650, roll);
  roadR = lerp(roadR, 650, roll);
  // flag 1 on the peak
  const f1grow = R(t, 2.15, 2.6, expoOut) * (1 - R(t, 6.6, 6.95, expoIn));
  const spoken = [2, 3, 4, 5].filter((i) => t > W(1, i)).length;
  const f1cloth = R(t, 2.45, 2.9, expoOut) * (1 - R(t, 6.45, 6.75, expoIn)) *
    (1 - [2, 3, 4, 5].reduce((s, i) => s + 0.14 * R(t, W(1, i), W(1, i) + 0.3, expoOut), 0));
  // the fallen dream rises into a staircase
  const lineFlat = resample([[742 - 125, -3], [742 + 125, -3]], N);
  const rise = R(t, 27.0, 27.7);
  const stairs1 = morph(lineFlat, STAIRS1, rise);
  // flag 2 at the top
  const f2 = R(t, KEY(9) - 0.35, KEY(9) + 0.05, expoOut) * (1 - R(t, 33.3, 33.6, expoIn));
  const f2cloth = R(t, KEY(9) - 0.1, KEY(9) + 0.3, expoOut) * (1 - R(t, 33.2, 33.45, expoIn));
  // the steep staircase
  const s2 = R(t, 35.2, 36.3, expoOut);
  // ghost (imagined success)
  const ghost = spring(t - 13.3, 9) * (1 - R(t, 15.4, 15.75, expoIn));
  const goal = goalAt(t);
  const fill = R(t, 10.05, KEY(3) + 0.35, expoOut) * (1 - R(t, 12.0, 12.35, expoIn));
  const core = R(t, 34.15, 34.45, expoOut) * (1 - R(t, 39.3, 39.45, expoIn)) * 14;

  return (
    <g>
      {/* ground */}
      <line x1={-open * 1700} y1={0} x2={open * 1700} y2={0} stroke={LINE} strokeWidth={3} />
      {/* mountain */}
      {t < 16.3 ? <Draw d={toD(mountain, false)} p={mDraw} w={4} color={LINE} /> : null}
      {/* imagined trail → road */}
      {t > 12.6 && t < 16.3 ? (
        <path d={toD(trail.slice(0, Math.max(2, Math.ceil(N * trailDraw))), false)} fill="none" stroke={Y}
          strokeWidth={lerp(4, 12, solid)} strokeLinecap="round" strokeDasharray={`16 ${12 * (1 - solid) + 0.01}`} />
      ) : null}
      {t >= 16.2 && t < 19.56 ? <line x1={roadL} y1={-6} x2={roadR} y2={-6} stroke={Y} strokeWidth={12} strokeLinecap="round" /> : null}
      {/* flag 1 */}
      {f1grow > 0.001 ? <Flag base={PEAK} grow={f1grow} cloth={f1cloth} knobR={lerp(16, 10, R(t, 2.2, 2.6))} /> : null}
      {/* ghost of you at the top */}
      {ghost > 0.01 ? (
        <Figure x={600} y={-300} scale={0.9 * ghost} pose={idle(POSES.cheer, t)} opacity={0.5}
          palette={{ head: [Y, Y], torso: Y, front: Y, back: Y } as Palette} />
      ) : null}
      {/* the steep staircase */}
      {s2 > 0 ? <Draw d={toD(STAIRS2, false)} p={s2} w={4} color={LINE} /> : null}
      {/* staircase made of the dream */}
      {t >= 27.0 ? <path d={toD(stairs1, false)} fill="none" stroke={Y} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" /> : null}
      {/* flag 2 */}
      {f2 > 0.001 ? <Flag base={[1480, -420]} grow={f2} cloth={f2cloth} /> : null}
      {/* the others */}
      {GRAYS.map((g, i) => {
        const x = grayX(i, t);
        const v = Math.abs(grayX(i, t + 0.02) - grayX(i, t - 0.02)) / 0.04;
        const amt = clamp01(v / 140);
        const shrink = R(t, KEY(10) - 0.3 + i * 0.08, KEY(10) + 0.5 + i * 0.08, expoOut);
        let pose: Pose = POSES.listen;
        if (i === 0) pose = mixPose(pose, POSES.take, R(t, W(2, 5), W(2, 6)) * (1 - R(t, 9.6, 9.9)));
        if (i === 0) pose = mixPose(pose, POSES.reach, R(t, KEY(8) - 0.45, KEY(8) - 0.1) * (1 - R(t, KEY(8) + 0.4, KEY(8) + 0.8)));
        pose = mixPose(pose, i === 1 ? POSES.handOnHead : POSES.hunch, shrink);
        if (amt > 0.01) pose = mixPose(pose, walkPose((x / 150) * Math.PI), amt);
        const laugh = t > KEY(8) + 0.2 && t < KEY(8) + 1.6 ? Math.abs(Math.sin(t * 13 + i)) * 5 : 0;
        const headDot = R(t, W(1, i + 2), W(1, i + 2) + 0.35, expoOut) * (1 - R(t, 21.2, 21.5, expoIn));
        const sc = (g.back ? 0.86 : 1) * (1 - shrink * 0.28);
        return (
          <g key={i}>
            <Figure x={x} y={(g.back ? -26 : 0) - laugh} scale={sc} palette={g.back ? PALETTES.dark : PALETTES.mid}
              facing={1} pose={idle(pose, t, i * 1.7, 1 - amt)} />
            {headDot > 0.01 ? <circle cx={x} cy={(g.back ? -26 : 0) - 386 * sc - 58} r={7 * headDot} fill={Y} /> : null}
          </g>
        );
      })}
      {/* bits of the goal you give away while talking */}
      {[2, 3, 4, 5].map((wi, k) => {
        const a = W(1, wi), p = R(t, a, a + 0.35);
        if (t < a || p >= 1) return null;
        const g = GRAYS[k];
        const target: Pt = [g.x0, (g.back ? -26 : 0) - 386 * (g.back ? 0.86 : 1) - 58];
        const [x, y] = arc([heroX(t) - 30, -400], target, p, 90);
        return <circle key={wi} cx={x} cy={y} r={7} fill={Y} />;
      })}
      {/* you */}
      <Figure x={heroX(t)} y={heroY(t)} pose={heroPose(t)} palette={PALETTES.hero} facing={heroFacing(t)} fill={fill} core={core} fillColor={Y} />
      {/* the goal */}
      {goal ? <path d={toD(goal.pts)} fill={Y} /> : null}
    </g>
  );
};

// ------------------------------------------------------------------ kinetic type (masked, no fades)
type Layout = { y: number; s?: number };
const LAYOUT: Layout[] = [
  { y: 300 }, { y: 300 }, { y: 290 }, { y: 300 }, { y: 300 }, { y: 300 }, { y: 330, s: 0.9 },
  { y: 280 }, { y: 280 }, { y: 280 }, { y: 300 }, { y: 280 }, { y: 300 }, { y: 300 },
];

const Line: React.FC<{ words: Word[]; until: number; layout: Layout; t: number }> = ({ words, until, layout, t }) => {
  if (t < words[0].t - 0.1 || t > until + 0.5) return null;
  const s = layout.s ?? 1;
  return (
    <div style={{
      position: "absolute", top: layout.y, left: 80, right: 80, display: "flex", flexWrap: "wrap",
      justifyContent: "center", alignItems: "baseline", direction: "rtl", columnGap: 18 * s, fontFamily: FONT,
    }}>
      {words.map((w, i) => {
        const inP = spring(t - (w.t - 0.06), 16);
        const outP = expoIn(clamp01((t - (until + i * 0.025)) / 0.32));
        const yPct = (1 - inP) * 105 - outP * 105;
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", padding: "0.12em 0.04em 0.22em", margin: "-0.12em 0 -0.22em" }}>
            <span style={{
              display: "inline-block", transform: `translateY(${yPct}%)`,
              fontSize: (w.key ? 112 : 58) * s, fontWeight: w.key ? 900 : 600, color: w.key ? Y : "#f4f4f4", lineHeight: 1.25,
            }}>{w.w}</span>
          </span>
        );
      })}
    </div>
  );
};

const Texts: React.FC<{ t: number }> = ({ t }) => (
  <>
    {P.map((ph, i) => {
      const next = P[i + 1];
      const until = next ? Math.min(next.words[0].t - 0.36 - 0.025 * ph.words.length, ph.end + 0.45) : ph.end + 0.6;
      return <Line key={i} words={ph.words} until={until} layout={LAYOUT[i]} t={t} />;
    })}
    <Line t={t} until={40.9} layout={{ y: 940 }}
      words={[{ w: "ذخیره‌ش", t: 40.05, key: true }, { w: "کن", t: 40.2, key: false }]} />
    <Line t={t} until={40.92} layout={{ y: 1090, s: 0.85 }}
      words={["و", "برای", "یه", "دوست", "بفرست"].map((w, i) => ({ w, t: 40.3 + i * 0.07, key: false }))} />
  </>
);

// ------------------------------------------------------------------ frame
const Frame: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [cx, cy, z] = camAt(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <g transform={`translate(${CX} ${CY}) scale(${z}) translate(${-cx} ${-cy})`}>
          <World t={t} />
        </g>
      </svg>
      <Texts t={t} />
    </AbsoluteFill>
  );
};

export const GoalsPro: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("goals-pro-mix.wav")} />
      <CameraMotionBlur shutterAngle={180} samples={3}>
        <Frame />
      </CameraMotionBlur>
    </AbsoluteFill>
  );
};

export const GOALS_PRO_DURATION = END;

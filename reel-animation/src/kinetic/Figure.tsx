import React from "react";

// Minimal faceless stick figure with a simple joint rig (forward kinematics).
// Angles are degrees from "straight down"; positive = towards the facing direction.

export type Pose = {
  lean: number; // torso
  head: number; // head tilt
  sB: number; eB: number; // back arm: shoulder, elbow
  sF: number; eF: number; // front arm
  hB: number; kB: number; // back leg: hip, knee
  hF: number; kF: number; // front leg
};

export const STAND: Pose = { lean: 0, head: 0, sB: -6, eB: 8, sF: 6, eF: 10, hB: -4, kB: 2, hF: 4, kF: 2 };

export const POSES: Record<string, Pose> = {
  stand: STAND,
  crossArms: { ...STAND, lean: -5, head: -6, sB: 35, eB: 115, sF: 40, eF: 110 },
  holdUp: { ...STAND, lean: 2, head: -10, sF: 125, eF: 25, sB: 10, eB: 20 },
  shrug: { ...STAND, lean: -3, sB: 40, eB: -90, sF: 40, eF: -90 },
  whisper: { ...STAND, lean: 14, head: 8, sF: 60, eF: 120, sB: 0, eB: 10 },
  listen: { ...STAND, lean: 10, head: 12, sF: 10, eF: 20 },
  give: { ...STAND, lean: 6, sF: 75, eF: 10, sB: -5, eB: 10 },
  take: { ...STAND, lean: 10, sF: 80, eF: 5, sB: 0, eB: 10 },
  slump: { ...STAND, lean: 18, head: 28, sB: 4, eB: 4, sF: 8, eF: 4, hB: -2, kB: 14, hF: 10, kF: 18 },
  sad: { ...STAND, lean: 6, head: 22, sB: 2, eB: 4, sF: 4, eF: 4 },
  cheer: { ...STAND, lean: -4, head: -12, sB: 160, eB: 10, sF: 165, eF: 10 },
  highFive: { ...STAND, lean: 4, head: -4, sF: 130, eF: 10, sB: -5, eB: 10 },
  hug: { ...STAND, lean: 6, sF: 85, eF: 40, sB: 70, eB: 40 },
  talk: { ...STAND, lean: 4, head: -4, sF: 55, eF: -40, sB: 0, eB: 12 },
  proud: { ...STAND, lean: -7, head: -14, sF: 22, eF: 6, sB: 22, eB: 6 },
  handOnHead: { ...STAND, lean: 8, head: 16, sF: 165, eF: 125, sB: 4, eB: 10 },
  holdChest: { ...STAND, lean: 4, head: 14, sF: 28, eF: 115, sB: 24, eB: 112 },
  lookUp: { ...STAND, lean: -4, head: -26, sF: 4, eF: 8, sB: -4, eB: 8 },
  reach: { ...STAND, lean: 12, head: -6, sF: 105, eF: 5, sB: -10, eB: 10 },
  hunch: { ...STAND, lean: 22, head: 26, sF: 20, eF: 70, sB: 14, eB: 70, hB: -2, kB: 16, hF: 10, kF: 20 },
};

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => (o[k] = a[k] + (b[k] - a[k]) * t));
  return o;
};

// procedural walk cycle (phase in radians)
export const walkPose = (p: number, amount = 1): Pose => {
  const s = Math.sin(p);
  const w: Pose = {
    lean: 5,
    head: 0,
    hF: 26 * s, kF: 8 + 32 * Math.max(0, Math.sin(p - 1.2)),
    hB: -26 * s, kB: 8 + 32 * Math.max(0, Math.sin(p + Math.PI - 1.2)),
    sF: -22 * s, eF: 18,
    sB: 22 * s, eB: 18,
  };
  return mixPose(STAND, w, amount);
};

export type Palette = { head: [string, string]; torso: string; front: string; back: string };
export const PALETTES: Record<string, Palette> = {
  yellow: { head: ["#ffe27a", "#d9a514"], torso: "#e9b824", front: "#ececec", back: "#9c9c9c" },
  gray: { head: ["#a9a9a9", "#6f6f6f"], torso: "#6b6b6b", front: "#a8a8a8", back: "#565656" },
  white: { head: ["#ffffff", "#cfcfcf"], torso: "#777", front: "#dedede", back: "#666" },
  dark: { head: ["#6e6e6e", "#3e3e3e"], torso: "#454545", front: "#6a6a6a", back: "#333" },
};

const mixHex = (a: string, b: string, t: number) => {
  const p = (h: string) => {
    const x = h.replace("#", "");
    const f = x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
  };
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};
export const mixPalette = (a: Palette, b: Palette, t: number): Palette => ({
  head: [mixHex(a.head[0], b.head[0], t), mixHex(a.head[1], b.head[1], t)],
  torso: mixHex(a.torso, b.torso, t),
  front: mixHex(a.front, b.front, t),
  back: mixHex(a.back, b.back, t),
});

const U = 98, L = 96, T = 150, UA = 74, LA = 70, HEAD = 36;
const rad = (d: number) => (d * Math.PI) / 180;
const dir = (a: number) => [Math.sin(rad(a)), Math.cos(rad(a))]; // 0 = down

let uid = 0;

export const Figure: React.FC<{
  x: number; y: number; pose: Pose; palette?: Palette; scale?: number; facing?: 1 | -1; opacity?: number;
  hand?: React.ReactNode; // drawn at the front hand
  aboveHead?: React.ReactNode; // drawn above the head (unrotated)
}> = ({ x, y, pose, palette = PALETTES.yellow, scale = 1, facing = 1, opacity = 1, hand, aboveHead }) => {
  const [gid] = React.useState(() => `hg${uid++}`);
  // hip height so that the lower foot touches the ground
  const legV = (h: number, k: number) => U * Math.cos(rad(h)) + L * Math.cos(rad(h - k));
  const hip = [0, -Math.max(legV(pose.hB, pose.kB), legV(pose.hF, pose.kF))];
  const up = [Math.sin(rad(pose.lean)), -Math.cos(rad(pose.lean))];
  const neck = [hip[0] + up[0] * T, hip[1] + up[1] * T];
  const shoulder = [hip[0] + up[0] * T * 0.86, hip[1] + up[1] * T * 0.86];
  const hAng = pose.lean + pose.head;
  const headC = [neck[0] + Math.sin(rad(hAng)) * (HEAD + 10), neck[1] - Math.cos(rad(hAng)) * (HEAD + 10)];

  const limb = (o: number[], a1: number, a2: number, l1: number, l2: number) => {
    const d1 = dir(a1), j = [o[0] + d1[0] * l1, o[1] + d1[1] * l1];
    const d2 = dir(a2), e = [j[0] + d2[0] * l2, j[1] + d2[1] * l2];
    return { j, e, d: `M${o[0]},${o[1]} L${j[0]},${j[1]} L${e[0]},${e[1]}` };
  };
  // arms rotate with the torso
  const armB = limb(shoulder, pose.lean + pose.sB, pose.lean + pose.sB + pose.eB, UA, LA);
  const armF = limb(shoulder, pose.lean + pose.sF, pose.lean + pose.sF + pose.eF, UA, LA);
  const legB = limb(hip, pose.hB, pose.hB - pose.kB, U, L);
  const legF = limb(hip, pose.hF, pose.hF - pose.kF, U, L);
  const stroke = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`} opacity={opacity}>
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={palette.head[0]} />
          <stop offset="100%" stopColor={palette.head[1]} />
        </radialGradient>
      </defs>
      <path d={armB.d} stroke={palette.back} strokeWidth={17} {...stroke} />
      <path d={legB.d} stroke={palette.back} strokeWidth={21} {...stroke} />
      <path d={`M${legB.e[0]},${legB.e[1]} l14,0`} stroke={palette.back} strokeWidth={14} {...stroke} />
      <line x1={hip[0]} y1={hip[1]} x2={neck[0]} y2={neck[1]} stroke={palette.torso} strokeWidth={50} strokeLinecap="round" />
      <path d={legF.d} stroke={palette.front} strokeWidth={21} {...stroke} />
      <path d={`M${legF.e[0]},${legF.e[1]} l14,0`} stroke={palette.front} strokeWidth={14} {...stroke} />
      <circle cx={headC[0]} cy={headC[1]} r={HEAD} fill={`url(#${gid})`} />
      <path d={armF.d} stroke={palette.front} strokeWidth={17} {...stroke} />
      {hand ? <g transform={`translate(${armF.e[0]} ${armF.e[1]})`}>{hand}</g> : null}
      {aboveHead ? <g transform={`translate(${headC[0]} ${headC[1] - HEAD - 30}) scale(${facing} 1)`}>{aboveHead}</g> : null}
    </g>
  );
};

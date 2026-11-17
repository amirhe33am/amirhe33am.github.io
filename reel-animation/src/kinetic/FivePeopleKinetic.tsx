import React from "react";
import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import data from "../timeline-kinetic.json";
import { useFonts } from "../explainer/PeopleToAvoid";
import { Figure, POSES, PALETTES, Pose, mixPose, walkPose, mixPalette } from "./Figure";

// Minimal dark kinetic-typography reel with a faceless yellow stick figure.

const FONT = "Vazirmatn";
const Y = "#f2c230";
const GROUND = 1360;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (x: number) => x * x * (3 - 2 * x);

type Phrase = { text: string; key?: string; badge?: boolean; start: number; end: number };
type Scene = { id: string; num?: string; label?: string; phrases: Phrase[]; start: number; end: number };
const SCENES = data.scenes as Scene[];
const ITEMS = SCENES.filter((s) => s.num);

const useNow = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { now: frame / fps, frame, fps };
};

// value that goes 0→1 between two absolute times
const ramp = (now: number, a: number, b: number) => ease(interpolate(now, [a, b], [0, 1], clamp));

// ---------------------------------------------------------------- kinetic words
const PhraseText: React.FC<{ ph: Phrase; until: number; top: number }> = ({ ph, until, top }) => {
  const { now } = useNow();
  if (ph.badge || now < ph.start - 0.05 || now > until) return null;
  const words = ph.text.split(" ");
  const total = words.reduce((s, w) => s + w.length + 1, 0);
  const dur = ph.end - ph.start;
  const out = interpolate(now, [until - 0.2, until], [1, 0], clamp);
  let acc = 0;
  return (
    <div style={{
      position: "absolute", top, left: 60, right: 60, display: "flex", flexWrap: "wrap", justifyContent: "center",
      alignItems: "baseline", direction: "rtl", gap: "0 22px", fontFamily: FONT, opacity: out,
    }}>
      {words.map((w, i) => {
        const at = ph.start + (acc / total) * dur * 0.9 - 0.04;
        acc += w.length + 1;
        const p = ease(interpolate(now, [at, at + 0.22], [0, 1], clamp));
        const isKey = ph.key && w.replace(/[.,،]/g, "") === ph.key;
        return (
          <span key={i} style={{
            display: "inline-block",
            opacity: p, filter: `blur(${(1 - p) * 8}px)`, transform: `translateY(${(1 - p) * 26}px)`,
            fontSize: isKey ? 104 : 58, fontWeight: isKey ? 900 : 500, color: isKey ? Y : "#f2f2f2",
            textShadow: isKey ? `0 0 40px ${Y}55` : "none",
          }}>{w}</span>
        );
      })}
    </div>
  );
};

const AllText: React.FC = () => {
  const phrases = SCENES.flatMap((s) => s.phrases.map((p) => ({ ...p, scene: s.id })));
  return (
    <>
      {phrases.map((ph, i) => {
        const next = phrases[i + 1];
        const until = next ? next.start - 0.03 : data.duration;
        const top = ph.scene === "outro" && i === phrases.length - 1 ? 1120 : 560;
        return <PhraseText key={i} ph={ph} until={until} top={top} />;
      })}
    </>
  );
};

// ---------------------------------------------------------------- badges & chrome
const Badge: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { now, fps } = useNow();
  const ph = scene.phrases[0];
  if (now < ph.start - 0.1 || now > ph.end + 0.25) return null;
  const s = spring({ frame: Math.round((now - ph.start + 0.1) * fps), fps, config: { damping: 11 } });
  const out = interpolate(now, [ph.end, ph.end + 0.25], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT, opacity: out }}>
      <div style={{ fontSize: 50, color: "#e8e8e8", fontWeight: 500, marginBottom: 26, opacity: s }}>شماره</div>
      <div style={{
        width: 210, height: 210, borderRadius: 105, transform: `scale(${s})`,
        background: `radial-gradient(circle at 35% 30%, #ffe27a, #c9950f)`, boxShadow: `0 0 90px ${Y}55`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 130, fontWeight: 900, color: "#1b1b1b",
      }}>{scene.num}</div>
    </AbsoluteFill>
  );
};

const Dots: React.FC = () => {
  const { now } = useNow();
  const show = interpolate(now, [3.6, 4.2], [0, 1], clamp) * interpolate(now, [SCENES[6].phrases[1].start - 0.3, SCENES[6].phrases[1].start], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 230, opacity: show }}>
      <div style={{ display: "flex", gap: 46, direction: "rtl" }}>
        {ITEMS.map((s) => {
          const on = now >= s.start - 0.1;
          return <div key={s.id} style={{ width: 16, height: 16, borderRadius: 8, background: on ? Y : "#bdbdbd", opacity: on ? 1 : 0.6, boxShadow: on ? `0 0 14px ${Y}` : "none" }} />;
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- stage helpers
const Ground: React.FC<{ x: number; w: number; o?: number }> = ({ x, w, o = 1 }) => (
  <g opacity={o}>
    <defs>
      <linearGradient id="gl" x1="0" x2="1">
        <stop offset="0%" stopColor="#fff" stopOpacity={0} />
        <stop offset="50%" stopColor="#fff" stopOpacity={0.22} />
        <stop offset="100%" stopColor="#fff" stopOpacity={0} />
      </linearGradient>
    </defs>
    <rect x={x - w / 2} y={GROUND} width={w} height={2} fill="url(#gl)" />
  </g>
);

const Bubble: React.FC<{ o: number; children?: React.ReactNode }> = ({ o, children }) => (
  <g opacity={o} transform={`scale(${0.6 + o * 0.4})`}>
    <rect x={-52} y={-34} width={104} height={62} rx={14} fill="#2c2f33" stroke="#555" strokeWidth={2} />
    <path d="M-12,28 L0,46 L10,28 Z" fill="#2c2f33" />
    {children ?? [-22, 0, 22].map((x) => <circle key={x} cx={x} cy={-3} r={6} fill="#9a9a9a" />)}
  </g>
);

// "walk from a to b between t0 and t1" → x, pose, facing
const walk = (now: number, t0: number, t1: number, a: number, b: number, base: Pose, fps = 30) => {
  const p = ramp(now, t0, t1);
  const moving = now > t0 && now < t1;
  const amt = moving ? Math.min(1, Math.min(now - t0, t1 - now) * 5) : 0;
  const phase = (now - t0) * 9;
  return {
    x: a + (b - a) * p,
    pose: amt > 0 ? mixPose(base, walkPose(phase, 1), amt) : base,
    facing: (b >= a ? 1 : -1) as 1 | -1,
    moving,
  };
};

// pose that eases from a to b around time t
const poseAt = (now: number, steps: [number, Pose][]): Pose => {
  let cur = steps[0][1];
  for (let i = 1; i < steps.length; i++) {
    const [t, p] = steps[i];
    cur = mixPose(cur, p, ramp(now, t - 0.25, t + 0.15));
  }
  return cur;
};

// ---------------------------------------------------------------- scenes
const Trophy = () => (
  <g transform="translate(0 -30)">
    <path d="M-26,-40 L26,-40 L20,0 Q0,16 -20,0 Z M-6,10 L-6,26 M6,10 L6,26 M-18,28 L18,28" stroke={Y} strokeWidth={5} fill="none" strokeLinecap="round" />
    <path d="M-26,-32 Q-44,-28 -22,-8 M26,-32 Q44,-28 22,-8" stroke={Y} strokeWidth={4} fill="none" />
  </g>
);

const Bulb: React.FC<{ lit: number }> = ({ lit }) => (
  <g transform="translate(0 -40)">
    <circle r={70} fill={Y} opacity={0.18 * lit} />
    <circle r={30} fill={lit > 0.05 ? `rgba(242,194,48,${0.25 + lit * 0.75})` : "none"} stroke={lit > 0.3 ? Y : "#777"} strokeWidth={5} />
    <path d="M-12,34 L12,34 M-9,44 L9,44" stroke={lit > 0.3 ? Y : "#777"} strokeWidth={5} strokeLinecap="round" />
  </g>
);

const ItemStage: React.FC<{ s: Scene; next: Scene }> = ({ s, next }) => {
  const { now } = useNow();
  const [badge, name, desc] = s.phrases;
  const showAt = badge.end + 0.05;
  const appear = ramp(now, showAt - 0.05, showAt + 0.3);
  const leaveAt = desc.start + (desc.end - desc.start) * 0.55;
  const leaveEnd = next.start - 0.15;
  const stageOut = interpolate(now, [leaveEnd - 0.25, leaveEnd], [1, 0], clamp);
  if (now < showAt - 0.1 || now > leaveEnd) return null;

  const yellowStart = 650, grayX = 380;
  // you walk away from them at the end
  const yw = walk(now, leaveAt, leaveEnd + 0.5, yellowStart, 1000, POSES.stand);
  const grayFade = 1 - ramp(now, leaveAt, leaveEnd) * 0.6;
  const yellowFacing = (yw.moving || now > leaveAt ? 1 : -1) as 1 | -1;
  let yellowPose: Pose = POSES.stand;
  let grayPose: Pose = POSES.stand;
  let yellowPal = PALETTES.yellow;
  let extra: React.ReactNode = null;
  let yHand: React.ReactNode = null;
  let yHead: React.ReactNode = null;
  let gHead: React.ReactNode = null;
  let grayX2 = grayX;
  let grayFacing: 1 | -1 = 1;
  let grayPose2: Pose | null = null;

  if (s.id === "p1") {
    yellowPose = poseAt(now, [[0, POSES.stand], [showAt + 0.2, POSES.holdUp], [leaveAt, POSES.stand]]);
    yHand = now < leaveAt + 0.2 ? <Trophy /> : null;
    grayPose = poseAt(now, [[0, POSES.stand], [name.start + 0.4, POSES.crossArms]]);
    grayPose = { ...grayPose, head: grayPose.head + Math.sin(now * 3) * 4 };
    gHead = <Bubble o={ramp(now, desc.start - 0.2, desc.start + 0.2)} />;
  } else if (s.id === "p2") {
    const lit = 1 - ramp(now, desc.start + 0.3, desc.end - 0.2);
    yHead = now < leaveAt ? <Bulb lit={lit} /> : null;
    yellowPose = poseAt(now, [[0, POSES.cheer], [desc.start + 0.6, POSES.sad], [leaveAt, POSES.stand]]);
    grayPose = poseAt(now, [[0, POSES.stand], [desc.start, POSES.shrug]]);
    grayPose = { ...grayPose, head: Math.sin(now * 10) * 10 * ramp(now, desc.start, desc.start + 0.3) };
  } else if (s.id === "p3") {
    // two grey people whispering, the bubble is about you
    grayX2 = 230;
    grayPose = POSES.listen;
    grayFacing = -1;
    grayPose2 = poseAt(now, [[0, POSES.stand], [name.start + 0.3, POSES.whisper]]);
    yellowPose = poseAt(now, [[0, POSES.stand], [desc.start + 0.5, POSES.sad], [leaveAt, POSES.stand]]);
    extra = (
      <g transform={`translate(330 ${GROUND - 520})`}>
        <Bubble o={ramp(now, name.start + 0.2, name.start + 0.5)}>
          <circle cx={0} cy={-3} r={14} fill={Y} />
        </Bubble>
      </g>
    );
  } else if (s.id === "p4") {
    // you pass the ball, they take it and leave
    const pass = ramp(now, name.start + 0.2, name.end + 0.1);
    const grayLeave = walk(now, desc.start + 0.3, leaveAt + 0.4, grayX, -150, POSES.stand);
    yellowPose = poseAt(now, [[0, POSES.stand], [name.start, POSES.give], [name.end + 0.3, POSES.stand]]);
    grayPose = poseAt(now, [[0, POSES.take], [desc.start + 0.2, POSES.stand]]);
    if (now > desc.start + 0.3) {
      grayX2 = grayLeave.x; grayFacing = grayLeave.facing; grayPose = grayLeave.pose;
    }
    const bx = interpolate(pass, [0, 1], [yellowStart - 120, grayX + 110]);
    const by = GROUND - 330 - Math.sin(pass * Math.PI) * 60;
    extra = (
      <>
        <line x1={yellowStart - 120} y1={GROUND - 330} x2={grayX + 110} y2={GROUND - 330} stroke={Y} strokeWidth={2} opacity={0.35 * (1 - ramp(now, desc.start, desc.start + 0.4))} />
        {now < desc.start + 0.3 ? <circle cx={bx} cy={by} r={16} fill={Y} /> : null}
      </>
    );
    if (now > desc.start + 0.3) grayPose2 = null;
    gHead = now > desc.start + 0.3 ? <circle r={14} fill={Y} cy={20} /> : null;
  } else if (s.id === "p5") {
    // your colour drains into them
    const drain = ramp(now, name.start + 0.2, leaveAt) * (1 - ramp(now, leaveAt + 0.2, leaveEnd + 0.2));
    yellowPal = mixPalette(PALETTES.yellow, PALETTES.gray, drain * 0.85);
    yellowPose = mixPose(POSES.stand, POSES.slump, drain);
    grayPose = POSES.stand;
    const flowOn = now < leaveAt ? ramp(now, name.start, name.start + 0.3) : 1 - ramp(now, leaveAt, leaveAt + 0.3);
    extra = (
      <g opacity={flowOn}>
        <line x1={grayX + 30} y1={GROUND - 280} x2={yellowStart - 30} y2={GROUND - 280} stroke={Y} strokeWidth={2} opacity={0.3} />
        {new Array(6).fill(0).map((_, i) => {
          const p = (now * 0.9 + i / 6) % 1;
          return <circle key={i} cx={interpolate(p, [0, 1], [yellowStart - 30, grayX + 30])} cy={GROUND - 280} r={7} fill={Y} opacity={Math.sin(p * Math.PI)} />;
        })}
      </g>
    );
  }

  const g2 = grayPose2;
  return (
    <g opacity={appear * stageOut}>
      <Ground x={540} w={900} />
      {extra}
      {s.id === "p3" && g2 ? <Figure x={430} y={GROUND} pose={g2} palette={PALETTES.gray} facing={-1} opacity={grayFade} scale={0.95} /> : null}
      <Figure x={s.id === "p3" ? grayX2 : grayX2} y={GROUND} pose={grayPose} palette={PALETTES.gray} facing={s.id === "p3" ? 1 : grayFacing}
        opacity={grayFade} aboveHead={gHead} scale={s.id === "p3" ? 0.95 : 1} />
      <Figure x={yw.x} y={GROUND} pose={yw.moving ? yw.pose : yellowPose} palette={yellowPal} facing={yellowFacing}
        hand={yHand} aboveHead={yHead} />
    </g>
  );
};

const IntroStage: React.FC = () => {
  const { now } = useNow();
  const s = SCENES[0];
  const [, five, keep] = s.phrases;
  const end = SCENES[1].start - 0.1;
  const fade = interpolate(now, [end - 0.25, end], [1, 0], clamp);
  if (now > end) return null;
  const enter = walk(now, 0, s.phrases[0].end, -100, 560, POSES.stand);
  const away = walk(now, keep.start, end + 0.6, 560, 900, POSES.stand);
  const yel = now < keep.start ? enter : away;
  const xs = [150, 300, 440, 600, 760];
  return (
    <g opacity={fade}>
      <Ground x={540} w={1000} />
      {xs.map((x, i) => {
        const o = ramp(now, five.start + i * 0.12, five.start + i * 0.12 + 0.25) * (1 - ramp(now, keep.start, keep.end) * 0.5);
        return <Figure key={i} x={x + (i % 2) * 40 - 60} y={GROUND - 120} pose={POSES.stand} palette={PALETTES.gray} scale={0.6} opacity={o * 0.55} facing={i % 2 ? -1 : 1} />;
      })}
      <Figure x={yel.x} y={GROUND} pose={yel.moving ? yel.pose : POSES.stand} facing={yel.facing} />
    </g>
  );
};

const OutroStage: React.FC = () => {
  const { now, fps } = useNow();
  const s = SCENES[6];
  const [a, b] = s.phrases;
  if (now < s.start - 0.4) return null;
  const figsOut = 1 - ramp(now, b.start - 0.3, b.start);
  const l = walk(now, a.start - 0.2, a.start + 1.2, -150, 330, POSES.stand);
  const r = walk(now, a.start - 0.2, a.start + 1.2, 1230, 750, POSES.stand);
  const meet = now > a.start + 1.2;
  return (
    <>
      <g opacity={figsOut * ramp(now, s.start - 0.4, s.start)}>
        <Ground x={540} w={900} />
        <Figure x={l.x} y={GROUND} pose={l.moving ? l.pose : POSES.highFive} palette={PALETTES.white} facing={1} />
        <Figure x={r.x} y={GROUND} pose={r.moving ? r.pose : POSES.highFive} palette={PALETTES.white} facing={-1} />
        <Figure x={540} y={GROUND} pose={meet ? POSES.cheer : POSES.stand} facing={1} />
      </g>
      {/* summary row */}
      <g opacity={ramp(now, b.start - 0.1, b.start + 0.3)}>
        {ITEMS.map((it, i) => {
          const x = 860 - i * 170;
          const sp = spring({ frame: Math.round((now - b.start - i * 0.08) * fps), fps, config: { damping: 12 } });
          return (
            <g key={it.id} transform={`translate(${x} 860) scale(${Math.max(0, sp)})`}>
              <circle r={52} fill="url(#gold)" />
              <text y={22} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={60} fill="#1b1b1b">{it.num}</text>
              <text y={100} textAnchor="middle" fontFamily={FONT} fontWeight={500} fontSize={30} fill="#cfcfcf">{it.label}</text>
            </g>
          );
        })}
        <g transform="translate(540 1030)" stroke={Y} strokeWidth={5} fill="none" strokeLinejoin="round">
          <path d="M-24,-34 L24,-34 L24,34 L0,16 L-24,34 Z" />
        </g>
      </g>
    </>
  );
};

// ---------------------------------------------------------------- main
export const FivePeopleKinetic: React.FC = () => {
  useFonts();
  const { now } = useNow();
  // gentle continuous camera push-in, reset a little per scene
  const sc = SCENES.find((s, i) => now < (SCENES[i + 1]?.start ?? 1e9)) ?? SCENES[0];
  const local = now - sc.start;
  const cam = 1.15 + Math.max(0, local) * 0.02;
  const lightX = 540;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #2a2b2d 0%, #151617 45%, #0b0b0c 100%)" }}>
      <Audio src={staticFile("voice-kinetic.mp3")} />
      <Audio src={staticFile("music.mp3")} volume={0.07} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${lightX}px 1170px, rgba(255,255,255,0.06), transparent 420px)` }} />
      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: "540px 1150px" }}>
        <svg width={1080} height={1920}>
          <defs>
            <radialGradient id="gold" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ffe27a" />
              <stop offset="100%" stopColor="#c9950f" />
            </radialGradient>
          </defs>
          <IntroStage />
          {ITEMS.map((s, i) => <ItemStage key={s.id} s={s} next={SCENES[SCENES.indexOf(s) + 1]} />)}
          <OutroStage />
        </svg>
      </AbsoluteFill>
      {ITEMS.map((s) => <Badge key={s.id} scene={s} />)}
      <AllText />
      <Dots />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

export const KINETIC_DURATION = data.duration;

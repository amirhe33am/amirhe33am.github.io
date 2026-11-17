import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SEGS, Seg, useFonts } from "./PeopleToAvoid";

// Dark cinematic version of the same reel (same voiceover + timeline)

const FONT = "Vazirmatn";
const NEON: Record<string, string> = {
  intro: "#e63946",
  p1: "#39ff88",
  p2: "#7cc6ff",
  p3: "#c77dff",
  p4: "#ffb703",
  p5: "#ff3b5c",
  outro: "#ffd28a",
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const useLocal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps, t: frame / fps };
};

// ---------------------------------------------------------------- neon line drawing
// Draws its children's strokes progressively (each path needs pathLength={1}).
const Neon: React.FC<{ color: string; draw: number; width?: number; children: React.ReactNode; flicker?: number }> = ({
  color, draw, width = 9, children, flicker = 1,
}) => {
  const common = {
    fill: "none",
    stroke: color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: 1,
    strokeDashoffset: 1 - draw,
  };
  return (
    <g opacity={flicker}>
      <g filter="url(#glowBig)" opacity={0.9} style={{ ...common, strokeWidth: width * 2.6 }}>{children}</g>
      <g filter="url(#glowSmall)" style={{ ...common, strokeWidth: width }}>{children}</g>
      <g style={{ ...common, stroke: "#fff", strokeWidth: width * 0.35 }} opacity={0.85}>{children}</g>
    </g>
  );
};

const P: React.FC<{ d: string }> = ({ d }) => <path d={d} pathLength={1} />;
const C: React.FC<{ cx: number; cy: number; r: number }> = (p) => <circle {...p} pathLength={1} />;

// ---------------------------------------------------------------- icons (centred at 0,0, ~500px)
const Icon: React.FC<{ id: string; draw: number; t: number; drain: number }> = ({ id, draw, t, drain }) => {
  const color = NEON[id];
  if (id === "p1") {
    // jealous side-eye looking at a trophy
    const look = 40 + Math.sin(t * 2) * 15;
    return (
      <>
        <Neon color={color} draw={draw}>
          <P d="M-230,0 Q0,-200 230,0 Q0,200 -230,0 Z" />
          <C cx={look} cy={0} r={70} />
          <P d="M-200,-95 L-60,-150" />
        </Neon>
        <circle cx={look} cy={0} r={30 * draw} fill={color} filter="url(#glowSmall)" />
        <g transform="translate(250 -230) scale(0.55)">
          <Neon color="#ffd166" draw={draw} width={12}>
            <P d="M-70,-90 L70,-90 L55,10 Q0,50 -55,10 Z M-15,30 L-15,70 M15,30 L15,70 M-50,70 L50,70" />
            <P d="M-70,-70 Q-120,-60 -60,0 M70,-70 Q120,-60 60,0" />
          </Neon>
        </g>
      </>
    );
  }
  if (id === "p2") {
    // storm cloud + rain + lightning
    return (
      <>
        <Neon color={color} draw={draw}>
          <P d="M-200,40 Q-260,40 -250,-20 Q-240,-80 -170,-70 Q-150,-170 -40,-160 Q40,-220 110,-140 Q220,-160 220,-60 Q280,-30 240,30 Q220,50 180,40 Z" />
        </Neon>
        {new Array(8).fill(0).map((_, i) => {
          const p = (t * 1.3 + random(`r${i}`)) % 1;
          return (
            <line key={i} x1={-170 + i * 48} y1={80 + p * 260} x2={-182 + i * 48} y2={120 + p * 260}
              stroke={color} strokeWidth={7} strokeLinecap="round" opacity={(1 - p) * draw} filter="url(#glowSmall)" />
          );
        })}
        <g opacity={Math.sin(t * 9) > 0.85 ? 1 : 0.15}>
          <Neon color="#ffffff" draw={draw} width={8}>
            <P d="M20,40 L-30,150 L30,150 L-20,280" />
          </Neon>
        </g>
      </>
    );
  }
  if (id === "p3") {
    // two-faced mask: smile + whisper bubble
    return (
      <>
        <Neon color={color} draw={draw}>
          <P d="M-170,-170 Q0,-230 170,-170 Q190,40 0,190 Q-190,40 -170,-170 Z" />
          <P d="M0,-200 L0,180" />
          <P d="M-110,-60 Q-80,-85 -50,-60 M50,-50 Q80,-80 110,-50" />
          <P d="M-110,60 Q-70,100 -30,60 M30,90 Q70,50 110,90" />
        </Neon>
        <g transform={`translate(230 -220) scale(${0.9 + Math.sin(t * 4) * 0.05})`}>
          <Neon color="#ffffff" draw={draw} width={7}>
            <P d="M-90,-50 Q-90,-90 -40,-90 L60,-90 Q100,-90 100,-50 L100,0 Q100,40 60,40 L-20,40 L-70,80 L-60,40 Q-90,40 -90,0 Z" />
          </Neon>
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={-35 + i * 40} cy={-25} r={10} fill="#fff"
              opacity={draw * (0.3 + 0.7 * ((Math.floor(t * 4) % 3) >= i ? 1 : 0))} />
          ))}
        </g>
      </>
    );
  }
  if (id === "p4") {
    // magnet pulling particles (your time / energy / money)
    return (
      <>
        <g transform="rotate(-90)">
          <Neon color={color} draw={draw}>
            <P d="M-120,-160 L-120,20 A120,120 0 0 0 120,20 L120,-160 L50,-160 L50,20 A50,50 0 0 1 -50,20 L-50,-160 Z" />
            <P d="M-120,-110 L-50,-110 M50,-110 L120,-110" />
          </Neon>
        </g>
        {new Array(12).fill(0).map((_, i) => {
          const p = (t * 0.7 + random(`m${i}`)) % 1;
          const x = interpolate(p, [0, 1], [430, 170]);
          const y = (random(`y${i}`) - 0.5) * 260 * (1 - p);
          return <circle key={i} cx={x} cy={y} r={10 + random(`s${i}`) * 10} fill={i % 3 ? color : "#fff"}
            opacity={draw * Math.sin(p * Math.PI)} filter="url(#glowSmall)" />;
        })}
      </>
    );
  }
  if (id === "p5") {
    // draining battery
    const level = drain;
    const c = level > 0.5 ? "#39ff88" : level > 0.25 ? "#ffb703" : color;
    return (
      <>
        <Neon color={c} draw={draw}>
          <P d="M-210,-110 L180,-110 Q200,-110 200,-90 L200,90 Q200,110 180,110 L-210,110 Q-230,110 -230,90 L-230,-90 Q-230,-110 -210,-110 Z" />
          <P d="M220,-45 L250,-45 L250,45 L220,45" />
        </Neon>
        <rect x={-205} y={-85} width={Math.max(0, 380 * level) * draw} height={170} rx={10} fill={c} opacity={0.85} filter="url(#glowSmall)" />
        <text x={0} y={200} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={70} fill={c} filter="url(#glowSmall)">
          {`${Math.round(level * 100).toLocaleString("fa-IR")}٪`}
        </text>
      </>
    );
  }
  return null;
};

// ---------------------------------------------------------------- shared atmosphere
const Atmosphere: React.FC<{ color: string }> = ({ color }) => {
  const { frame, t } = useLocal();
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="spot" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="55%" stopColor={color} stopOpacity={0.04} />
            <stop offset="100%" stopColor="#000" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="ray" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#spot)" />
        {/* volumetric light rays from top */}
        {[0, 1, 2].map((i) => (
          <polygon key={i}
            points={`${420 + i * 120 + Math.sin(t * 0.4 + i) * 40},-50 ${470 + i * 120 + Math.sin(t * 0.4 + i) * 40},-50 ${700 + i * 260},1500 ${200 + i * 180},1500`}
            fill="url(#ray)" opacity={0.35 + Math.sin(t * 0.8 + i * 2) * 0.15} />
        ))}
        {/* floating dust / bokeh */}
        {new Array(40).fill(0).map((_, i) => {
          const sp = 10 + random(`v${i}`) * 25;
          const y = (random(`y${i}`) * 2100 - t * sp) % 2100;
          return (
            <circle key={i} cx={random(`x${i}`) * 1080 + Math.sin(t + i) * 20} cy={y < 0 ? y + 2100 : y}
              r={random(`r${i}`) < 0.85 ? 2 + random(`s${i}`) * 3 : 12 + random(`s${i}`) * 18}
              fill={random(`c${i}`) > 0.5 ? color : "#fff"} opacity={0.08 + random(`o${i}`) * 0.25} />
          );
        })}
      </svg>
      {/* film grain */}
      <svg width={1080} height={1920} style={{ position: "absolute", mixBlendMode: "overlay", opacity: 0.35 }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 30} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={1080} height={1920} filter="url(#grain)" />
      </svg>
      {/* vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%)" }} />
    </AbsoluteFill>
  );
};

const GlowDefs: React.FC = () => (
  <defs>
    <filter id="glowSmall" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" />
      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="glowBig" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="22" />
    </filter>
  </defs>
);

// cinematic text: blur → sharp, slight rise
const RevealText: React.FC<{ delay: number; children: React.ReactNode; style?: React.CSSProperties; color?: string }> = ({
  delay, children, style, color,
}) => {
  const { frame, fps } = useLocal();
  const p = interpolate(frame - delay, [0, fps * 0.7], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
  return (
    <div style={{
      opacity: p, filter: `blur(${(1 - p) * 18}px)`, transform: `translateY(${(1 - p) * 40}px) scale(${1.08 - p * 0.08})`,
      textShadow: color ? `0 0 30px ${color}, 0 0 80px ${color}66` : "0 0 30px rgba(0,0,0,0.8)",
      ...style,
    }}>{children}</div>
  );
};

// ---------------------------------------------------------------- scenes
const ItemScene: React.FC<{ seg: Seg; len: number }> = ({ seg, len }) => {
  const { frame, fps, t } = useLocal();
  const color = NEON[seg.id];
  const draw = interpolate(frame, [fps * 0.2, fps * 1.6], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 2) });
  const drain = interpolate(frame, [fps * 0.6, len * 0.6], [1, 0.08], clamp);
  // "keep distance": the icon recedes into the dark
  const recede = interpolate(frame, [len * 0.58, len * 0.85], [0, 1], { ...clamp, easing: (x) => x * x * (3 - 2 * x) });
  const flicker = frame < fps * 0.5 ? (random(`f${frame}`) > 0.4 ? 1 : 0.3) : 1;
  const push = 1 + t * 0.02; // slow dolly-in
  const iconScale = 1.3 * push * (1 - recede * 0.5);
  const lineW = interpolate(frame, [fps * 0.5, fps * 1.2], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <Atmosphere color={color} />
      {/* huge background number */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{
          fontSize: 1100, fontWeight: 900, color: "transparent", WebkitTextStroke: `3px ${color}33`,
          transform: `translateY(-60px) scale(${1.15 - t * 0.02})`, lineHeight: 1,
        }}>{seg.num}</div>
      </AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GlowDefs />
        <g transform={`translate(540 1010) scale(${iconScale})`}
          opacity={1 - recede * 0.6} style={{ filter: `blur(${recede * 6}px) saturate(${1 - recede * 0.8})` }}>
          <Icon id={seg.id} draw={draw * flicker} t={t} drain={drain} />
        </g>
        {/* red barrier when you step away */}
        <g opacity={recede}>
          <line x1={540 - 420 * recede} y1={1370} x2={540 + 420 * recede} y2={1370} stroke="#ff2e4d" strokeWidth={6} filter="url(#glowSmall)" />
        </g>
      </svg>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 260, fontFamily: FONT, direction: "rtl", textAlign: "center", color: "#fff" }}>
        <RevealText delay={2} color={color} style={{ fontSize: 46, fontWeight: 700, color, opacity: 0.9 }}>
          {`شمارهٔ ${seg.num}`}
        </RevealText>
        <RevealText delay={6} color={color} style={{ fontSize: 124, fontWeight: 900, lineHeight: 1.2, marginTop: 6 }}>
          {seg.title}
        </RevealText>
        <div style={{ width: 520 * lineW, height: 3, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, margin: "26px 0" }} />
        <RevealText delay={14} style={{ fontSize: 50, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
          {seg.caption}
        </RevealText>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 1410, fontFamily: FONT }}>
        <div style={{
          fontSize: 64, fontWeight: 900, color: "#ff2e4d", opacity: recede,
          textShadow: "0 0 24px #ff2e4d, 0 0 60px #ff2e4d88", transform: `scale(${0.9 + recede * 0.1})`,
          filter: `blur(${(1 - recede) * 10}px)`,
        }}>فاصله بگیر</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const IntroScene: React.FC<{ len: number }> = () => {
  const { frame, fps, t } = useLocal();
  const color = NEON.intro;
  const ids = ["p1", "p2", "p3", "p4", "p5"];
  return (
    <AbsoluteFill>
      <Atmosphere color={color} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GlowDefs />
        {/* five silhouettes lit one by one */}
        {ids.map((id, i) => {
          const on = interpolate(frame, [fps * (0.3 + i * 0.22), fps * (0.5 + i * 0.22)], [0, 1], clamp);
          const fl = on > 0 && on < 1 ? (random(`i${frame}${i}`) > 0.5 ? 1 : 0.2) : on;
          const x = 140 + i * 200;
          const y = 1180 + Math.abs(i - 2) * 30;
          return (
            <g key={id} transform={`translate(${x} ${y})`} opacity={fl}>
              <ellipse cx={0} cy={250} rx={80} ry={14} fill={NEON[id]} opacity={0.35} filter="url(#glowBig)" />
              <Neon color={NEON[id]} draw={on} width={6}>
                <C cx={0} cy={-60} r={52} />
                <P d="M-80,250 L-80,90 Q-80,20 0,20 Q80,20 80,90 L80,250" />
              </Neon>
              <circle cx={-18} cy={-62} r={6} fill={NEON[id]} /><circle cx={18} cy={-62} r={6} fill={NEON[id]} />
            </g>
          );
        })}
      </svg>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 330, fontFamily: FONT, direction: "rtl", textAlign: "center", color: "#fff" }}>
        <RevealText delay={0} style={{ fontSize: 80, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>اگه می‌خوای رشد کنی</RevealText>
        <RevealText delay={10} color={color} style={{ fontSize: 150, fontWeight: 900, lineHeight: 1.25, marginTop: 20 }}>
          از این <span style={{ color }}>۵ نوع آدم</span>
        </RevealText>
        <RevealText delay={22} style={{ fontSize: 120, fontWeight: 900, transform: `scale(${1 + Math.sin(t * 2) * 0.01})` }}>
          فاصله بگیر
        </RevealText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC<{ len: number }> = () => {
  const { frame, fps, t } = useLocal();
  const color = NEON.outro;
  const sunrise = interpolate(frame, [0, fps * 2.5], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
  return (
    <AbsoluteFill>
      <Atmosphere color={color} />
      <AbsoluteFill style={{
        background: `radial-gradient(circle at 50% ${95 - sunrise * 40}%, ${color}${Math.round(sunrise * 90).toString(16).padStart(2, "0")} 0%, transparent 55%)`,
      }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GlowDefs />
        {/* circle of light: the right people around you */}
        {new Array(7).fill(0).map((_, i) => {
          const a = (i / 7) * Math.PI * 2 + t * 0.3;
          const on = interpolate(frame, [fps * (0.4 + i * 0.12), fps * (0.8 + i * 0.12)], [0, 1], clamp);
          return (
            <g key={i} transform={`translate(${540 + Math.cos(a) * 330} ${1080 + Math.sin(a) * 260})`} opacity={on}>
              <circle r={26} fill={color} filter="url(#glowSmall)" />
              <circle r={60} fill={color} opacity={0.15} filter="url(#glowBig)" />
            </g>
          );
        })}
        <g transform="translate(540 1080)">
          <circle r={110 + Math.sin(t * 3) * 6} fill="#fff" opacity={0.08 * sunrise} filter="url(#glowBig)" />
          <Neon color="#ffffff" draw={sunrise} width={7}>
            <C cx={0} cy={-50} r={44} />
            <P d="M-70,150 L-70,40 Q-70,-5 0,-5 Q70,-5 70,40 L70,150" />
          </Neon>
        </g>
      </svg>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 300, fontFamily: FONT, direction: "rtl", textAlign: "center", color: "#fff" }}>
        <RevealText delay={4} style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.4 }}>دورت رو با آدم‌هایی پر کن</RevealText>
        <RevealText delay={14} color={color} style={{ fontSize: 104, fontWeight: 900, color }}>که بهت انرژی می‌دن</RevealText>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 440, fontFamily: FONT, direction: "rtl" }}>
        <RevealText delay={fps * 2.2}>
          <div style={{
            fontSize: 46, fontWeight: 700, color, border: `2px solid ${color}`, padding: "18px 44px", borderRadius: 60,
            boxShadow: `0 0 30px ${color}55, inset 0 0 20px ${color}33`, background: "rgba(0,0,0,0.35)",
          }}>بفرست برای کسی که لازمش داره ←</div>
        </RevealText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- subtitles & chrome
const Subtitles: React.FC = () => {
  const { fps } = useVideoConfig();
  const now = useCurrentFrame() / fps;
  const seg = SEGS.find((s) => now >= s.start - 0.1 && now <= s.end + 0.3);
  if (!seg) return null;
  const words = seg.text.split(" ");
  const p = interpolate(now, [seg.start, seg.end], [0, 1], clamp);
  const total = words.reduce((s, w) => s + w.length + 2, 0);
  const color = NEON[seg.id];
  let acc = 0;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 190, fontFamily: FONT }}>
      <div style={{ direction: "rtl", textAlign: "center", maxWidth: 940, fontSize: 52, fontWeight: 700, lineHeight: 1.6 }}>
        {words.map((w, i) => {
          const st = acc / total;
          acc += w.length + 2;
          const on = p >= st;
          return (
            <span key={i} style={{
              color: on ? "#fff" : "rgba(255,255,255,0.28)",
              textShadow: on ? `0 0 18px ${color}aa, 0 2px 8px #000` : "0 2px 8px #000",
            }}>{w} </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = frame / durationInFrames;
  return (
    <>
      {/* thin progress line */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 140 }}>
        <div style={{ width: 760, height: 3, background: "rgba(255,255,255,0.12)", direction: "rtl" }}>
          <div style={{ width: `${p * 100}%`, height: 3, background: "#fff", boxShadow: "0 0 12px #fff", marginLeft: "auto" }} />
        </div>
      </AbsoluteFill>
      {/* opening fade from black */}
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [0, fps * 0.6], [1, 0], clamp), pointerEvents: "none" }} />
    </>
  );
};

// dip-to-black + light flash between scenes
const SceneWrap: React.FC<{ len: number; color: string; children: React.ReactNode }> = ({ len, color, children }) => {
  const { frame, fps } = useLocal();
  const fadeIn = interpolate(frame, [0, 8], [0, 1], clamp);
  const fadeOut = interpolate(frame, [len - 8, len], [1, 0], clamp);
  const flash = interpolate(frame, [0, 3, 14], [0.0, 0.55, 0], clamp);
  const zoom = interpolate(frame, [0, fps * 0.8], [1.06, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut), transform: `scale(${zoom})` }}>
      {children}
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, #fff, ${color} 40%, transparent 75%)`, opacity: flash, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

export const PeopleToAvoidDark: React.FC = () => {
  useFonts();
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#050508" }}>
      <Audio src={staticFile("voice.mp3")} />
      <Audio src={staticFile("music-dark.mp3")} volume={0.32} />
      {SEGS.map((seg, i) => {
        const from = i === 0 ? 0 : Math.round((seg.start - 0.2) * fps);
        const next = SEGS[i + 1];
        const to = next ? Math.round((next.start - 0.2) * fps) : durationInFrames;
        const len = to - from;
        return (
          <Sequence key={seg.id} from={from} durationInFrames={len}>
            <SceneWrap len={i === SEGS.length - 1 ? len + 999 : len} color={NEON[seg.id]}>
              {seg.id === "intro" ? <IntroScene len={len} /> : seg.id === "outro" ? <OutroScene len={len} /> : <ItemScene seg={seg} len={len} />}
            </SceneWrap>
          </Sequence>
        );
      })}
      <Subtitles />
      <Chrome />
    </AbsoluteFill>
  );
};

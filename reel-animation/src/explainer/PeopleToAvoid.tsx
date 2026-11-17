import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import timeline from "../timeline.json";
import { Person } from "./Person";

// ---------------------------------------------------------------- theme
const BG = "#fff4e4";
const INK = "#2b2140";
const YOU = "#2ec4b6";
const RED = "#ef476f";
const FONT = "Vazirmatn";
const TYPES: Record<string, string> = {
  p1: "#57cc78", // حسود
  p2: "#8d99ae", // منفی‌باف
  p3: "#9b5de5", // غیبت‌کن
  p4: "#f8961e", // فرصت‌طلب
  p5: "#e5383b", // انرژی‌خوار
};

export type Seg = (typeof timeline.segments)[number] & { num?: string; title?: string; caption?: string };
export const SEGS = timeline.segments as Seg[];

// ---------------------------------------------------------------- font loading
export const useFonts = () => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces = [
      ["Vazirmatn-Medium.woff2", "500"],
      ["Vazirmatn-Bold.woff2", "700"],
      ["Vazirmatn-Black.woff2", "900"],
    ].map(([f, w]) => new FontFace(FONT, `url(${staticFile(`fonts/${f}`)})`, { weight: w }));
    Promise.all(faces.map((f) => f.load()))
      .then((loaded) => {
        loaded.forEach((f) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(f));
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
};

// ---------------------------------------------------------------- helpers
const useLocal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (delay = 0, damping = 12) => spring({ frame: frame - delay, fps, config: { damping } });
  return { frame, fps, pop, t: frame / fps };
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Bubble: React.FC<{ x: number; y: number; text: string; s: number; color?: string; tail?: "l" | "r"; size?: number }> = ({
  x, y, text, s, color = "#fff", tail = "l", size = 46,
}) => {
  const w = text.length * size * 0.55 + 70;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={Math.min(1, s * 1.5)}>
      <path d={tail === "l" ? `M${-w / 2 + 40},40 L${-w / 2 + 10},90 L${-w / 2 + 90},40 Z` : `M${w / 2 - 40},40 L${w / 2 - 10},90 L${w / 2 - 90},40 Z`}
        fill={color} stroke={INK} strokeWidth={6} />
      <rect x={-w / 2} y={-55} width={w} height={100} rx={50} fill={color} stroke={INK} strokeWidth={6} />
      <rect x={-w / 2 + 3} y={30} width={w - 6} height={14} fill={color} />
      <text x={0} y={14} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={size} fill={INK} direction="rtl">
        {text}
      </text>
    </g>
  );
};

// ---------------------------------------------------------------- stage props for each type
const ToxicStage: React.FC<{ id: string; len: number }> = ({ id, len }) => {
  const { frame, fps, pop, t } = useLocal();
  const color = TYPES[id];
  const bob = Math.sin(t * 5) * 6;
  // "you" steps away in the second half → visual "keep distance"
  const away = spring({ frame: frame - len * 0.55, fps, config: { damping: 14 } });
  const youX = 700 + away * 170;
  const toxicX = 330;
  const enterToxic = pop(4);
  const enterYou = pop(10);
  const groundY = 1290;
  const talk = (Math.sin(t * 22) + 1) / 2;

  let toxic: React.ReactNode = null;
  let youMood: "smile" | "sad" | "tired" | "happy" | "neutral" = "smile";
  let youExtra: React.ReactNode = null;
  let fx: React.ReactNode = null;

  if (id === "p1") {
    // Jealous: you hold a trophy, he side-eyes it, green steam rises
    const trophy = pop(14);
    youExtra = (
      <g transform={`translate(80 -230) scale(${trophy})`}>
        <path d="M-40,-60 L40,-60 L30,0 Q0,25 -30,0 Z" fill="#ffd166" stroke={INK} strokeWidth={6} />
        <rect x={-10} y={10} width={20} height={30} fill="#ffd166" stroke={INK} strokeWidth={5} />
        <rect x={-32} y={38} width={64} height={16} rx={4} fill="#ffd166" stroke={INK} strokeWidth={5} />
        <text x={0} y={-22} textAnchor="middle" fontSize={34} fontWeight={900} fill={INK}>★</text>
      </g>
    );
    youMood = "happy";
    toxic = (
      <Person x={toxicX} y={groundY} color={color} mood="smirk" look={1} squint={0.6} bob={bob} lean={6} armR={-30}>
        {new Array(5).fill(0).map((_, i) => {
          const p = ((t * 0.9 + i / 5) % 1);
          return <circle key={i} cx={Math.sin(i * 2 + t * 3) * 40} cy={-360 - p * 160} r={18 * (1 - p) + 4} fill={color} opacity={0.7 * (1 - p)} />;
        })}
      </Person>
    );
    fx = <Bubble x={toxicX - 10} y={830} text="چرا اون؟!" s={pop(22)} color="#e9ffe9" />;
  } else if (id === "p2") {
    // Negative: you have an idea (bulb), he rains on it
    const dim = interpolate(frame, [fps * 1.2, fps * 2.2], [1, 0.25], clamp);
    youExtra = (
      <g transform={`translate(0 -420) scale(${pop(8)})`}>
        <circle r={60 + dim * 30} fill="#ffd166" opacity={0.25 * dim} />
        <circle r={44} fill={`rgba(255,209,102,${0.3 + dim * 0.7})`} stroke={INK} strokeWidth={6} />
        <rect x={-20} y={40} width={40} height={30} rx={6} fill="#adb5bd" stroke={INK} strokeWidth={5} />
      </g>
    );
    youMood = dim < 0.6 ? "sad" : "smile";
    toxic = (
      <Person x={toxicX} y={groundY} color={color} mood="angry" bob={bob} armL={40} armR={-40}>
        <g transform={`translate(0 -440) scale(${pop(6)})`}>
          <path d="M-110,20 Q-120,-40 -60,-40 Q-40,-90 20,-70 Q80,-90 100,-30 Q140,-10 110,30 Z" fill="#6c757d" stroke={INK} strokeWidth={6} />
          {new Array(7).fill(0).map((_, i) => {
            const p = (t * 1.6 + i / 7) % 1;
            return <line key={i} x1={-90 + i * 30} y1={40 + p * 90} x2={-96 + i * 30} y2={60 + p * 90} stroke="#4ea8de" strokeWidth={7} strokeLinecap="round" opacity={1 - p} />;
          })}
        </g>
      </Person>
    );
    const words = ["نمی‌شه!", "فایده نداره", "ریسکه!"];
    const k = Math.floor(frame / (fps * 0.9)) % 3;
    const local = frame % Math.round(fps * 0.9);
    fx = <Bubble x={toxicX + 60} y={700} text={words[k]} s={spring({ frame: local, fps, config: { damping: 10 } })} color="#eef1f4" />;
  } else if (id === "p3") {
    // Gossip: whispering to another person, bubble shows YOUR face
    const listenerIn = pop(6);
    toxic = (
      <>
        <Person x={150} y={groundY + 30} color="#ffafcc" scale={0.75 * listenerIn} mood="talk" mouthOpen={0.6} look={1} />
        <Person x={toxicX + 40} y={groundY} color={color} mood="smirk" look={-1} bob={bob} armL={150} flip>
          <ellipse cx={-80} cy={-215} rx={26} ry={36} fill="#ffd9b8" stroke={INK} strokeWidth={5} />
        </Person>
      </>
    );
    const dots = ".".repeat(1 + (Math.floor(t * 4) % 3));
    fx = (
      <>
        <Bubble x={230} y={810} text={`پچ پچ${dots}`} s={pop(14)} color="#f3e8ff" tail="r" />
        <g transform={`translate(600 720) scale(${pop(28)})`}>
          <circle r={70} fill="#fff" stroke={INK} strokeWidth={6} />
          <circle r={44} cy={4} fill="#ffd9b8" stroke={INK} strokeWidth={4} />
          <circle cx={-14} cy={0} r={5} fill={INK} /><circle cx={14} cy={0} r={5} fill={INK} />
          <text x={0} y={-80} textAnchor="middle" fontSize={44} fontWeight={900} fontFamily={FONT} fill={RED}>تو!</text>
        </g>
      </>
    );
    youMood = interpolate(frame, [0, fps * 1.5], [0, 1], clamp) > 0.9 ? "sad" : "smile";
  } else if (id === "p4") {
    // Opportunist: magnet pulls coins & hearts from you; phone ping
    toxic = (
      <Person x={toxicX} y={groundY} color={color} mood="happy" bob={bob} armR={-110} look={1}>
        <g transform="translate(150 -250) rotate(90)">
          <path d="M-50,-60 L-50,10 A50,50 0 0 0 50,10 L50,-60 L22,-60 L22,10 A22,22 0 0 1 -22,10 L-22,-60 Z" fill={RED} stroke={INK} strokeWidth={6} />
          <rect x={-50} y={-80} width={28} height={22} fill="#dee2e6" stroke={INK} strokeWidth={5} />
          <rect x={22} y={-80} width={28} height={22} fill="#dee2e6" stroke={INK} strokeWidth={5} />
        </g>
      </Person>
    );
    fx = (
      <>
        {new Array(8).fill(0).map((_, i) => {
          const p = (t * 0.8 + i / 8) % 1;
          const x = interpolate(p, [0, 1], [youX - 40, toxicX + 200]);
          const y = 1000 + Math.sin(p * Math.PI) * -120 + (i % 3) * 30;
          return i % 2 ? (
            <circle key={i} cx={x} cy={y} r={26} fill="#ffd166" stroke={INK} strokeWidth={5} />
          ) : (
            <text key={i} x={x} y={y + 16} fontSize={56} textAnchor="middle">❤️</text>
          );
        })}
        <g transform={`translate(${toxicX} 700) scale(${pop(18)})`}>
          <rect x={-210} y={-70} width={420} height={120} rx={26} fill="#fff" stroke={INK} strokeWidth={6} />
          <text x={0} y={-10} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={40} fill={INK}>📱 یه کاری دارم...</text>
          <text x={0} y={34} textAnchor="middle" fontFamily={FONT} fontWeight={500} fontSize={28} fill="#6c757d">بعد از ۶ ماه!</text>
        </g>
      </>
    );
    youMood = "neutral";
  } else if (id === "p5") {
    // Energy vampire: your battery drains through a beam to him
    const level = interpolate(frame, [fps * 0.4, len * 0.6], [1, 0.12], clamp);
    const bc = level > 0.5 ? "#57cc78" : level > 0.25 ? "#ffd166" : RED;
    youExtra = (
      <g transform="translate(0 -440)">
        <rect x={-80} y={-36} width={160} height={72} rx={14} fill="#fff" stroke={INK} strokeWidth={6} />
        <rect x={80} y={-14} width={14} height={28} rx={4} fill={INK} />
        <rect x={-70} y={-26} width={140 * level} height={52} rx={8} fill={bc} />
        <text x={0} y={14} textAnchor="middle" fontSize={34} fontWeight={900} fontFamily={FONT} fill={INK}>
          {`${Math.round(level * 100).toLocaleString("fa-IR")}٪`}
        </text>
      </g>
    );
    youMood = level < 0.4 ? "tired" : "smile";
    toxic = <Person x={toxicX} y={groundY} color={color} mood="happy" bob={bob} armR={-80} />;
    fx = new Array(10).fill(0).map((_, i) => {
      const p = (t * 1.2 + i / 10) % 1;
      const x = interpolate(p, [0, 1], [youX, toxicX]);
      return <circle key={i} cx={x} cy={1040 + Math.sin(p * 9 + i) * 20} r={14} fill="#ffd166" opacity={(1 - away) * 0.9} />;
    });
  }

  // distance indicator after "you" walks away
  const dist = away > 0.05 ? (
    <g opacity={away}>
      <line x1={toxicX + 130} y1={groundY + 60} x2={youX - 110} y2={groundY + 60} stroke={RED} strokeWidth={8} strokeDasharray="22 16" />
      <path d={`M${toxicX + 130},${groundY + 60} l26,-18 v36 Z`} fill={RED} />
      <path d={`M${youX - 110},${groundY + 60} l-26,-18 v36 Z`} fill={RED} />
      <text x={(toxicX + youX) / 2} y={groundY + 130} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={48} fill={RED}>
        فاصله بگیر
      </text>
    </g>
  ) : null;

  return (
    <g>
      <g opacity={enterToxic}>{toxic}</g>
      {fx}
      <g opacity={enterYou}>
        <Person x={youX} y={groundY} color={YOU} mood={away > 0.5 && youMood !== "tired" ? "happy" : youMood} look={-1}
          bob={Math.sin(t * 4 + 1) * 5 + (away > 0 && away < 0.95 ? -Math.abs(Math.sin(t * 14)) * 18 : 0)}
          armR={id === "p1" ? -150 : -10}>
          {youExtra}
        </Person>
        <text x={youX} y={groundY + 70} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={40} fill={YOU}>
          تو
        </text>
      </g>
      {dist}
    </g>
  );
};

// ---------------------------------------------------------------- scenes
const ItemScene: React.FC<{ seg: Seg; len: number }> = ({ seg, len }) => {
  const { pop } = useLocal();
  const color = TYPES[seg.id];
  const badge = pop(0, 10);
  const title = pop(5);
  const cap = pop(12);
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920}>
        <circle cx={540} cy={1100} r={430} fill={color} opacity={0.12} />
        <ToxicStage id={seg.id} len={len} />
      </svg>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 250, fontFamily: FONT, direction: "rtl" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{
            width: 150, height: 150, borderRadius: 75, background: color, color: "#fff", fontSize: 100, fontWeight: 900,
            display: "flex", alignItems: "center", justifyContent: "center", border: `7px solid ${INK}`,
            transform: `scale(${badge}) rotate(${(1 - badge) * -90}deg)`,
          }}>{seg.num}</div>
          <div style={{ fontSize: 104, fontWeight: 900, color: INK, transform: `translateX(${(1 - title) * -200}px)`, opacity: title }}>
            {seg.title}
          </div>
        </div>
        <div style={{
          marginTop: 30, fontSize: 52, fontWeight: 700, color: INK, background: "#fff", padding: "14px 40px",
          borderRadius: 40, border: `5px solid ${INK}`, boxShadow: `8px 8px 0 ${color}`,
          transform: `scale(${cap})`,
        }}>{seg.caption}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const IntroScene: React.FC<{ len: number }> = () => {
  const { frame, fps, pop, t } = useLocal();
  const ids = ["p1", "p2", "p3", "p4", "p5"];
  const shake = Math.sin(frame * 1.3) * interpolate(frame, [fps * 1.6, fps * 2.2], [0, 6], clamp);
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920}>
        {ids.map((id, i) => (
          <g key={id} opacity={pop(4 + i * 4)}>
            <Person x={150 + i * 195} y={1020 - (i % 2) * 50} color={TYPES[id]} scale={0.62 * pop(4 + i * 4)}
              mood={["smirk", "angry", "talk", "smirk", "happy"][i] as never} mouthOpen={(Math.sin(t * 15 + i) + 1) / 2}
              bob={Math.sin(t * 4 + i) * 6} look={i < 2 ? 1 : -1} />
          </g>
        ))}
        <g transform={`translate(${540 + shake} 1420) scale(${pop(26)})`}>
          <Person x={0} y={0} color={YOU} mood="sad" scale={0.8} look={0} />
          <text x={0} y={60} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={44} fill={YOU}>تو</text>
        </g>
      </svg>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 300, fontFamily: FONT, direction: "rtl", textAlign: "center" }}>
        <div style={{ fontSize: 96, fontWeight: 900, color: INK, transform: `scale(${pop(0)})`, lineHeight: 1.3 }}>
          از این{" "}
          <span style={{ color: "#fff", background: RED, padding: "0 26px", borderRadius: 24, display: "inline-block",
            transform: `rotate(-4deg) scale(${1 + Math.sin(t * 6) * 0.04})` }}>۵ نوع آدم</span>
        </div>
        <div style={{ fontSize: 130, fontWeight: 900, color: INK, marginTop: 10, transform: `scale(${pop(8)})` }}>
          فاصله بگیر!
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC<{ len: number }> = () => {
  const { pop, t } = useLocal();
  const friends = ["#ffbe0b", "#3a86ff"];
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920}>
        <circle cx={540} cy={1020} r={400 + Math.sin(t * 3) * 10} fill={YOU} opacity={0.15} />
        {new Array(14).fill(0).map((_, i) => {
          const a = (i / 14) * Math.PI * 2 + t * 0.5;
          return <text key={i} x={540 + Math.cos(a) * 450} y={1020 + Math.sin(a) * 430} fontSize={52} textAnchor="middle" opacity={pop(10 + i)}>
            {i % 2 ? "✨" : "💛"}
          </text>;
        })}
        {friends.map((c, i) => (
          <Person key={c} x={[230, 850, 540][i]} y={[1150, 1150, 1290][i]} color={c} scale={(i === 2 ? 0.55 : 0.7) * pop(6 + i * 5)}
            mood="happy" bob={-Math.abs(Math.sin(t * 5 + i)) * 20} armL={150} armR={-150} look={i === 0 ? 1 : -1} />
        ))}
        <g transform={`translate(540 1080) scale(${pop(0) * 0.9})`}>
          <Person x={0} y={0} color={YOU} mood="happy" bob={-Math.abs(Math.sin(t * 5)) * 24} armL={160} armR={-160} />
          <text x={0} y={70} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={44} fill={YOU}>تو</text>
        </g>
      </svg>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 250, fontFamily: FONT, direction: "rtl", textAlign: "center" }}>
        <div style={{ fontSize: 78, fontWeight: 900, color: INK, lineHeight: 1.4, transform: `scale(${pop(2)})` }}>
          دورت رو با آدم‌هایی پر کن
          <br />
          که <span style={{ color: YOU }}>بهت انرژی می‌دن</span>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 560, fontFamily: FONT, direction: "rtl" }}>
        <div style={{
          fontSize: 50, fontWeight: 800, color: "#fff", background: INK, padding: "22px 48px", borderRadius: 60,
          transform: `scale(${pop(40) * (1 + Math.sin(t * 8) * 0.03)})`,
        }}>📩 بفرست برای کسی که لازمش داره</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- subtitles (karaoke style)
const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = frame / fps;
  const seg = SEGS.find((s) => now >= s.start - 0.1 && now <= s.end + 0.3);
  if (!seg) return null;
  const words = seg.text.split(" ");
  const p = interpolate(now, [seg.start, seg.end], [0, 1], clamp);
  // weight words by length so highlighting tracks speech more closely
  const total = words.reduce((s, w) => s + w.length + 2, 0);
  let acc = 0;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 150, fontFamily: FONT }}>
      <div style={{
        direction: "rtl", textAlign: "center", maxWidth: 960, fontSize: 50, fontWeight: 800, lineHeight: 1.55,
        background: "rgba(43,33,64,0.88)", color: "#fff", padding: "20px 36px", borderRadius: 30,
      }}>
        {words.map((w, i) => {
          const startP = acc / total;
          acc += w.length + 2;
          const on = p >= startP;
          return (
            <span key={i} style={{ color: on ? "#ffd166" : "rgba(255,255,255,0.55)" }}>{w} </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = frame / fps;
  const items = SEGS.filter((s) => s.num);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 120 }}>
      <div style={{ display: "flex", gap: 18, direction: "rtl" }}>
        {items.map((s) => {
          const fill = interpolate(now, [s.start, s.end], [0, 1], clamp);
          return (
            <div key={s.id} style={{ width: 150, height: 16, borderRadius: 8, background: "rgba(43,33,64,0.15)", overflow: "hidden" }}>
              <div style={{ width: `${fill * 100}%`, height: "100%", background: TYPES[s.id], marginRight: 0, marginLeft: "auto" }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- main composition
export const PeopleToAvoid: React.FC = () => {
  useFonts();
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("voice.mp3")} />
      <Audio src={staticFile("music.mp3")} volume={0.13} />
      {/* subtle dotted backdrop */}
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {new Array(12 * 21).fill(0).map((_, i) => (
          <circle key={i} cx={(i % 12) * 95 + 20} cy={Math.floor(i / 12) * 95 + ((frame * 0.6) % 95)} r={4} fill={INK} opacity={0.06} />
        ))}
      </svg>
      {SEGS.map((seg, i) => {
        const from = i === 0 ? 0 : Math.round((seg.start - 0.2) * fps);
        const next = SEGS[i + 1];
        const to = next ? Math.round((next.start - 0.2) * fps) : durationInFrames;
        const len = to - from;
        return (
          <Sequence key={seg.id} from={from} durationInFrames={len}>
            <SceneWrap len={len}>
              {seg.id === "intro" ? <IntroScene len={len} /> : seg.id === "outro" ? <OutroScene len={len} /> : <ItemScene seg={seg} len={len} />}
            </SceneWrap>
          </Sequence>
        );
      })}
      <Progress />
      <Subtitles />
    </AbsoluteFill>
  );
};

// slide-in / slide-out transition around each scene
const SceneWrap: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spring({ frame, fps, config: { damping: 16 } });
  const out = interpolate(frame, [len - 6, len], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - inP) * -1080 + out * 1080}px)`, opacity: 1 - out * 0.5 }}>
      {children}
    </AbsoluteFill>
  );
};

export const PEOPLE_TO_AVOID_DURATION = timeline.duration;

import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";

const SAMPLES = 64;

type Energy = { bass: number; mid: number; high: number; spectrum: number[] };

// ---------- audio analysis (computed once for every frame) ----------
const useAudioAnalysis = (src: string) => {
  const audioData = useAudioData(src);
  const { fps, durationInFrames } = useVideoConfig();

  return useMemo(() => {
    if (!audioData) return null;
    const frames: Energy[] = [];
    for (let f = 0; f < durationInFrames; f++) {
      const spectrum = visualizeAudio({ fps, frame: f, audioData, numberOfSamples: SAMPLES });
      const avg = (a: number, b: number) =>
        spectrum.slice(a, b).reduce((s, v) => s + v, 0) / (b - a);
      frames.push({ bass: avg(0, 4), mid: avg(4, 20), high: avg(20, SAMPLES), spectrum });
    }
    // normalise each band to 0..1 over the whole song
    const max = (k: "bass" | "mid" | "high") => Math.max(1e-6, ...frames.map((e) => e[k]));
    const mb = max("bass"), mm = max("mid"), mh = max("high");
    const specMax = Math.max(1e-6, ...frames.flatMap((e) => e.spectrum));
    const norm = frames.map((e) => ({
      bass: e.bass / mb,
      mid: e.mid / mm,
      high: e.high / mh,
      spectrum: e.spectrum.map((v) => Math.min(1, v / specMax)),
    }));
    // beat = bass jumps clearly above its recent average and is a local peak
    const beats: number[] = [];
    for (let f = 1; f < norm.length - 1; f++) {
      const from = Math.max(0, f - 20);
      const local = norm.slice(from, f).reduce((s, e) => s + e.bass, 0) / (f - from);
      const b = norm[f].bass;
      const isPeak = b >= norm[f - 1].bass && b >= norm[f + 1].bass;
      const farEnough = beats.length === 0 || f - beats[beats.length - 1] > fps * 0.22;
      if (isPeak && b > 0.45 && b > local * 1.25 && farEnough) beats.push(f);
    }
    return { frames: norm, beats };
  }, [audioData, fps, durationInFrames]);
};

// ---------- scene ----------
export const ReelAnimation: React.FC<{ audioFile: string }> = ({ audioFile }) => {
  const src = staticFile(audioFile);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const analysis = useAudioAnalysis(src);

  const e: Energy = analysis?.frames[frame] ?? {
    bass: 0, mid: 0, high: 0, spectrum: new Array(SAMPLES).fill(0),
  };
  const beats = analysis?.beats ?? [];
  const pastBeats = beats.filter((b) => b <= frame);
  const lastBeat = pastBeats[pastBeats.length - 1] ?? -999;
  const sinceBeat = frame - lastBeat;
  const beatIndex = pastBeats.length;
  const kick = Math.exp(-sinceBeat / 5); // 1 on the beat, decays fast

  const cx = width / 2;
  const cy = height * 0.46;
  const t = frame / fps;

  // colour palette rotates a little on every beat
  const hue = (beatIndex * 47 + t * 8) % 360;
  const c1 = `hsl(${hue}, 85%, 60%)`;
  const c2 = `hsl(${(hue + 140) % 360}, 85%, 62%)`;
  const c3 = `hsl(${(hue + 260) % 360}, 90%, 70%)`;

  // ---- blob character ----
  const squash = 1 + kick * 0.18;
  const bodyR = 190 + e.bass * 40;
  const hop = -kick * 70;
  const blink = (frame % 97) < 4 ? 0.1 : 1;
  const look = Math.sin(t * 1.3) * 18;
  const blobPath = useMemo(() => {
    const pts = 60;
    const out: string[] = [];
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const wob = 1 + 0.05 * Math.sin(a * 3 + t * 3) + 0.04 * e.mid * Math.sin(a * 5 - t * 4);
      out.push(`${Math.cos(a) * bodyR * wob},${Math.sin(a) * bodyR * wob}`);
    }
    return "M" + out.join(" L") + " Z";
  }, [t, bodyR, e.mid]);

  // ---- shockwave rings from the last few beats ----
  const rings = pastBeats.slice(-4).map((b) => {
    const age = frame - b;
    const p = interpolate(age, [0, fps * 1.1], [0, 1], { extrapolateRight: "clamp" });
    return { key: b, r: 230 + p * 700, o: 1 - p };
  });

  // ---- particles (fixed seeds, pushed outward by the highs) ----
  const particles = new Array(46).fill(0).map((_, i) => {
    const a = random(`a${i}`) * Math.PI * 2 + t * (0.15 + random(`s${i}`) * 0.3);
    const d = 380 + random(`d${i}`) * 520 + e.high * 120;
    return {
      x: cx + Math.cos(a) * d,
      y: cy + Math.sin(a) * d * 1.25,
      r: 4 + random(`r${i}`) * 10 + e.high * 8,
      c: [c1, c2, c3][i % 3],
    };
  });

  // ---- progress / title ----
  const intro = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0b0820" }}>
      <Audio src={src} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <radialGradient id="bg" cx="50%" cy="46%" r="75%">
            <stop offset="0%" stopColor={`hsl(${hue}, 60%, ${14 + e.bass * 10}%)`} />
            <stop offset="100%" stopColor="#07051a" />
          </radialGradient>
          <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>

        <rect width={width} height={height} fill="url(#bg)" />

        {/* diagonal stripes sliding with the music */}
        {new Array(9).fill(0).map((_, i) => (
          <rect
            key={i}
            x={-400 + i * 260 + ((t * 60 + beatIndex * 40) % 260)}
            y={-200}
            width={60}
            height={height + 400}
            fill={c3}
            opacity={0.04 + e.mid * 0.04}
            transform={`rotate(20 ${cx} ${cy})`}
          />
        ))}

        {/* shockwaves */}
        {rings.map((r) => (
          <circle key={r.key} cx={cx} cy={cy} r={r.r} fill="none" stroke={c2}
            strokeWidth={14 * r.o} opacity={r.o * 0.8} />
        ))}

        {/* spectrum ring */}
        <g transform={`translate(${cx} ${cy}) rotate(${t * 12})`}>
          {e.spectrum.map((v, i) => {
            const a = (i / SAMPLES) * 360;
            const len = 20 + v * 220;
            return (
              <rect key={i} x={-7} y={-(300 + len)} width={14} height={len} rx={7}
                fill={i % 2 ? c1 : c3} transform={`rotate(${a})`} opacity={0.9} />
            );
          })}
        </g>

        {/* particles */}
        {particles.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.c} opacity={0.75} />
        ))}

        {/* blob character */}
        <g transform={`translate(${cx} ${cy + hop}) scale(${1 / squash * (1 + e.bass * 0.05)} ${squash * intro})`}>
          <ellipse cx={0} cy={bodyR + 40 - hop} rx={bodyR * 0.8} ry={24} fill="#000" opacity={0.25} />
          <path d={blobPath} fill="url(#body)" />
          <ellipse cx={-60} cy={-80} rx={70} ry={40} fill="#fff" opacity={0.18} />
          {[-62, 62].map((x) => (
            <g key={x} transform={`translate(${x} -20)`}>
              <ellipse rx={38} ry={44 * blink} fill="#fff" />
              <circle cx={look} cy={6} r={20 * blink} fill="#1a1030" />
              <circle cx={look + 7} cy={-2} r={6 * blink} fill="#fff" />
            </g>
          ))}
          {/* mouth opens with the volume */}
          <ellipse cx={0} cy={70} rx={36 + e.mid * 20} ry={8 + (e.bass + e.mid) * 30} fill="#1a1030" />
          <ellipse cx={-120} cy={50} rx={26} ry={14} fill="#ff5d8f" opacity={0.5} />
          <ellipse cx={120} cy={50} rx={26} ry={14} fill="#ff5d8f" opacity={0.5} />
        </g>

        {/* equaliser floor */}
        <g transform={`translate(0 ${height - 260})`}>
          {e.spectrum.slice(0, 32).map((v, i) => {
            const w = width / 32;
            const h = 10 + v * 200;
            return <rect key={i} x={i * w + 4} y={200 - h} width={w - 8} height={h} rx={6}
              fill={[c1, c2, c3][i % 3]} opacity={0.85} />;
          })}
        </g>
      </svg>

      {/* beat counter text */}
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 170 }}>
        <div style={{
          fontFamily: "Arial Black, Arial, sans-serif", fontSize: 120, fontWeight: 900,
          color: "#fff", letterSpacing: 6, opacity: intro,
          transform: `scale(${1 + kick * 0.15}) rotate(${Math.sin(beatIndex) * 4 * kick}deg)`,
          textShadow: `0 0 ${20 + kick * 40}px ${c1}`,
        }}>
          {["FEEL", "THE", "BEAT"][beatIndex % 3]}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

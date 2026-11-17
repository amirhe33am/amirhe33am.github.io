import React from "react";

export type Mood = "happy" | "smile" | "sad" | "smirk" | "angry" | "tired" | "neutral" | "talk";

type Props = {
  x: number;
  y: number;
  color: string;
  scale?: number;
  mood?: Mood;
  look?: number; // -1..1 pupils left/right
  squint?: number; // 0..1
  bob?: number; // vertical offset
  lean?: number; // degrees
  armL?: number; // arm rotation degrees (0 = down)
  armR?: number;
  mouthOpen?: number; // 0..1
  flip?: boolean;
  children?: React.ReactNode; // extra items drawn in local coords (head centre = 0,-250)
};

const INK = "#2b2140";

// A flat 2D character. Local origin = feet centre, height ≈ 360 units.
export const Person: React.FC<Props> = ({
  x, y, color, scale = 1, mood = "neutral", look = 0, squint = 0, bob = 0, lean = 0,
  armL = 10, armR = -10, mouthOpen = 0, flip = false, children,
}) => {
  const eyeRy = 16 * (1 - squint * 0.7);
  const mouth = (() => {
    const o = mouthOpen;
    switch (mood) {
      case "happy":
        return <path d={`M-30,-205 Q0,${-170 + o * 10} 30,-205 Z`} fill={INK} />;
      case "smile":
        return <path d="M-26,-208 Q0,-185 26,-208" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />;
      case "sad":
        return <path d="M-24,-190 Q0,-210 24,-190" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />;
      case "smirk":
        return <path d="M-22,-200 Q8,-196 28,-212" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />;
      case "angry":
        return <path d="M-24,-192 Q0,-206 24,-192" stroke={INK} strokeWidth={8} fill="none" strokeLinecap="round" />;
      case "tired":
        return <ellipse cx={0} cy={-196} rx={12} ry={5} fill={INK} />;
      case "talk":
        return <ellipse cx={0} cy={-198} rx={18} ry={4 + o * 16} fill={INK} />;
      default:
        return <line x1={-20} y1={-200} x2={20} y2={-200} stroke={INK} strokeWidth={7} strokeLinecap="round" />;
    }
  })();
  const brows =
    mood === "angry" || mood === "smirk" ? (
      <>
        <line x1={-52} y1={-280} x2={-16} y2={-268} stroke={INK} strokeWidth={8} strokeLinecap="round" />
        <line x1={52} y1={mood === "smirk" ? -286 : -280} x2={16} y2={-268} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      </>
    ) : mood === "sad" || mood === "tired" ? (
      <>
        <line x1={-50} y1={-268} x2={-16} y2={-280} stroke={INK} strokeWidth={7} strokeLinecap="round" />
        <line x1={50} y1={-268} x2={16} y2={-280} stroke={INK} strokeWidth={7} strokeLinecap="round" />
      </>
    ) : null;

  return (
    <g transform={`translate(${x} ${y + bob}) scale(${flip ? -scale : scale} ${scale})`}>
      <ellipse cx={0} cy={6 - bob / scale} rx={95} ry={16} fill="#000" opacity={0.12} />
      <g transform={`rotate(${lean})`}>
        {/* legs */}
        <rect x={-48} y={-90} width={34} height={92} rx={17} fill={INK} />
        <rect x={14} y={-90} width={34} height={92} rx={17} fill={INK} />
        {/* arms */}
        <g transform={`translate(-78 -150) rotate(${armL})`}>
          <rect x={-16} y={0} width={32} height={100} rx={16} fill={color} stroke={INK} strokeWidth={6} />
        </g>
        <g transform={`translate(78 -150) rotate(${armR})`}>
          <rect x={-16} y={0} width={32} height={100} rx={16} fill={color} stroke={INK} strokeWidth={6} />
        </g>
        {/* body */}
        <path d="M-80,-60 Q-90,-170 -40,-170 L40,-170 Q90,-170 80,-60 Z" fill={color} stroke={INK} strokeWidth={6} />
        {/* head */}
        <circle cx={0} cy={-250} r={92} fill="#ffd9b8" stroke={INK} strokeWidth={6} />
        <path d="M-92,-262 Q-80,-350 0,-346 Q80,-350 92,-262 Q60,-300 0,-300 Q-60,-300 -92,-262 Z" fill={INK} />
        {/* eyes */}
        {[-34, 34].map((ex) => (
          <g key={ex}>
            <ellipse cx={ex} cy={-245} rx={15} ry={eyeRy} fill="#fff" stroke={INK} strokeWidth={4} />
            <circle cx={ex + look * 7} cy={-244} r={Math.max(2, 8 * (1 - squint * 0.5))} fill={INK} />
          </g>
        ))}
        {brows}
        <ellipse cx={-58} cy={-212} rx={14} ry={8} fill="#ff8fa3" opacity={0.6} />
        <ellipse cx={58} cy={-212} rx={14} ry={8} fill="#ff8fa3" opacity={0.6} />
        {mouth}
        {children}
      </g>
    </g>
  );
};

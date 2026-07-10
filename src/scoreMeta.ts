// Shared color styling for the 0-100 slop-score hero cards, used by the
// single-audit, group, and multi-char result views so they stay identical.
export interface SlopScoreMeta {
  text: string;
  bg: string;
  ring: string;
  glow: string;
  badge: string;
}

export function getSlopScoreMeta(score: number): SlopScoreMeta {
  if (score < 25) {
    return {
      text: "text-emerald-400",
      bg: "bg-[#0A0A0A] border-[#2A2A2A] shadow-[0_0_20px_rgba(16,185,129,0.05)]",
      ring: "ring-emerald-500/20",
      glow: "drop-shadow-[0_0_15px_rgba(52,211,153,0.25)]",
      badge: "bg-emerald-950/50 text-emerald-400 border border-emerald-500/20",
    };
  } else if (score < 60) {
    return {
      text: "text-[#00F0FF]",
      bg: "bg-[#0A0A0A] border-[#2A2A2A] shadow-[0_0_20px_rgba(0,240,255,0.05)]",
      ring: "ring-cyan-500/20",
      glow: "drop-shadow-[0_0_15px_rgba(0,240,255,0.25)]",
      badge: "bg-cyan-950/50 text-[#00F0FF] border border-[#00F0FF]/20",
    };
  } else if (score < 80) {
    return {
      text: "text-[#FACC15]",
      bg: "bg-[#0A0A0A] border-[#2A2A2A] shadow-[0_0_20px_rgba(250,204,21,0.05)]",
      ring: "ring-yellow-500/20",
      glow: "drop-shadow-[0_0_15px_rgba(250,204,21,0.25)]",
      badge: "bg-yellow-950/50 text-[#FACC15] border border-[#FACC15]/20",
    };
  } else {
    return {
      text: "text-rose-500",
      bg: "bg-[#0A0A0A] border-[#2A2A2A] shadow-[0_0_20px_rgba(244,63,94,0.05)]",
      ring: "ring-rose-500/20",
      glow: "drop-shadow-[0_0_15px_rgba(244,63,94,0.25)]",
      badge: "bg-rose-950/50 text-rose-400 border border-rose-500/20",
    };
  }
}

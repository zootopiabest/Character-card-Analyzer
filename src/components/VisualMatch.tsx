import { motion } from "motion/react";
import { Check, X, ShieldAlert, Sparkles } from "lucide-react";

interface VisualComparison {
  accuracyScore: number;
  matches: string[];
  mismatches: string[];
  gradeNotes: string;
}

export default function VisualMatch({ data }: { data: VisualComparison }) {
  const score = data.accuracyScore;
  const isExcellent = score >= 85;
  const isPoor = score <= 50;

  let scoreColor = "text-emerald-400";
  let bgGradient = "from-[#10B981]/5 via-transparent to-transparent";
  let borderGlow = "border-[#1A1A1A]";

  if (isPoor) {
    scoreColor = "text-rose-500";
    bgGradient = "from-[#EF4444]/5 via-transparent to-transparent";
    borderGlow = "border-[#1A1A1A]";
  } else if (score < 85) {
    scoreColor = "text-[#FACC15]";
    bgGradient = "from-[#FACC15]/5 via-transparent to-transparent";
    borderGlow = "border-[#1A1A1A]";
  }

  return (
    <motion.div
      id="visual-accuracy-card"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`border bg-[#0A0A0A] rounded-xl overflow-hidden ${borderGlow}`}
    >
      <div className={`p-6 bg-gradient-to-b ${bgGradient} border-b border-[#1A1A1A]`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-[#050505] text-[#00F0FF] text-[9px] font-mono border border-[#1A1A1A]">
                VIS
              </span>
              <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                Visual Congruency Index
              </span>
            </div>
            <h4 className="text-sm font-mono uppercase tracking-widest text-zinc-200">
              Art vs. Writing Match
            </h4>
          </div>

          <div className="flex items-baseline gap-1 bg-[#050505] px-4 py-2 rounded border border-[#1A1A1A]">
            <span className={`text-3xl font-black font-sans tracking-tight ${scoreColor}`}>
              {score}%
            </span>
          </div>
        </div>

        <p className="mt-4 text-xs text-zinc-300 leading-relaxed font-sans italic bg-[#050505] p-3.5 rounded border border-[#1A1A1A]">
          &ldquo;{data.gradeNotes}&rdquo;
        </p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Matches lists */}
        <div id="visual-matches-container" className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-[10px] font-bold tracking-widest uppercase">
            <Sparkles size={12} /> DESCRIPTION_ALIGNED_ART
          </div>
          {data.matches.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No specific matches observed.</p>
          ) : (
            <ul className="space-y-2">
              {data.matches.map((match, i) => (
                <li key={i} className="flex gap-2 text-xs text-zinc-300 items-start font-mono">
                  <span className="flex-shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded bg-emerald-950/40 text-emerald-400 font-bold border border-emerald-500/25">
                    +
                  </span>
                  <span>{match}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Mismatches list */}
        <div id="visual-mismatches-container" className="space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-mono text-[10px] font-bold tracking-widest uppercase">
            <ShieldAlert size={12} /> PROMPT_INCONSISTENCIES
          </div>
          {data.mismatches.length === 0 ? (
            <p className="text-[11px] text-zinc-400/60 italic font-mono bg-emerald-950/10 border border-emerald-950/40 p-2.5 rounded">
              Perfect compliance! Character art flawlessly aligns with prompt instructions.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.mismatches.map((mismatch, i) => (
                <li key={i} className="flex gap-2 text-xs text-zinc-300 items-start font-mono">
                  <span className="flex-shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded bg-rose-950/40 text-rose-400 font-bold border border-rose-500/25">
                    -
                  </span>
                  <span>{mismatch}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}

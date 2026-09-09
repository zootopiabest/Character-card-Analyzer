import { motion } from "motion/react";

interface StatProps {
  score: number | null;
  level: string;
  notes: string;
}

interface CoreAnalysis {
  originality: StatProps;
  negativeSpace: StatProps;
  cohesion: StatProps;
  tropeUsage: StatProps;
  creatorCraft: StatProps;
}

export default function ReviewStats({ stats }: { stats: CoreAnalysis }) {
  const getSafely = (key: string): StatProps => {
    const value = stats?.[key];
    const valid = typeof value?.score === "number" && Number.isFinite(value.score) && value.score >= 0 && value.score <= 10;
    return {
      score: valid ? value.score : null,
      level: valid && typeof value?.level === "string" ? value.level : "NOT EVALUATED",
      notes: valid && typeof value?.notes === "string" ? value.notes : "The model did not supply a valid assessment.",
    };
  };

  const items = [
    {
      key: "originality",
      title: "ORIGINALITY INDEX",
      data: getSafely("originality"),
      color: "bg-[#00F0FF]",
      bgClass: "bg-[#0F0F0F] border-[#1A1A1A]",
      textClass: "text-[#00F0FF] border-[#00F0FF]/25"
    },
    {
      key: "negativeSpace",
      title: "NEGATIVE SPACE",
      data: getSafely("negativeSpace"),
      color: "bg-white",
      bgClass: "bg-[#0F0F0F] border-[#1A1A1A]",
      textClass: "text-zinc-200 border-zinc-700/50"
    },
    {
      key: "cohesion",
      title: "INSTRUCTION COHESION",
      data: getSafely("cohesion"),
      color: "bg-[#00F0FF]",
      bgClass: "bg-[#0F0F0F] border-[#1A1A1A]",
      textClass: "text-[#00F0FF] border-[#00F0FF]/25"
    },
    {
      key: "tropeUsage",
      title: "TROPE EXECUTION",
      data: getSafely("tropeUsage"),
      color: "bg-[#FACC15]",
      bgClass: "bg-[#0F0F0F] border-[#1A1A1A]",
      textClass: "text-[#FACC15] border-[#FACC15]/20"
    },
    {
      key: "creatorCraft",
      title: "CREATOR CRAFT",
      data: getSafely("creatorCraft"),
      color: "bg-gradient-to-r from-purple-500 to-indigo-500",
      bgClass: "bg-[#0F0F0F] border-[#1A1A1A]",
      textClass: "text-purple-400 border-purple-500/20"
    }
  ];

  return (
    <div id="diagnostic-readings-wrapper" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#0A0A0A] text-[10px] text-zinc-500 font-mono border border-[#1A1A1A]">
          01
        </span>
        <h3 className="text-xs font-mono uppercase tracking-widest text-[#777]">
          Diagnostic Metric Readings // Runtime Metrics
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => {
          const scorePercent = Math.min(100, Math.max(0, (item.data.score ?? 0) * 10));
          return (
            <motion.div
              key={item.key}
              id={`stat-card-${item.key}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
              className={`p-5 rounded-xl border ${item.bgClass} flex flex-col justify-between`}
            >
              <div>
                <div className="flex flex-wrap gap-2 justify-between items-start mb-1">
                  <span className="text-[10px] font-mono tracking-widest text-zinc-500 font-bold uppercase">
                    {item.title}
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded bg-[#050505] font-semibold border ${item.textClass} uppercase`}>
                    {item.data.level}
                  </span>
                </div>
                
                <div className="flex items-baseline gap-1 mt-2 mb-3">
                  <span className="text-4xl font-black font-mono tracking-tighter text-white">
                    {item.data.score ?? "—"}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">/10</span>
                </div>

                {/* Progress bar container (1px thin matching design) */}
                <div className="w-full h-1 bg-[#1A1A1A] rounded-full overflow-hidden mb-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${scorePercent}%` }}
                    transition={{ delay: idx * 0.05 + 0.1, duration: 0.6, ease: "easeOut" }}
                    className={`h-full ${item.color} rounded-full`}
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#888] leading-relaxed font-sans bg-[#050505] p-3 rounded border border-[#1A1A1A] italic">
                &ldquo;{item.data.notes}&rdquo;
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

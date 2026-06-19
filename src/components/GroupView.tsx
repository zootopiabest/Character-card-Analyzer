import { GroupResult } from "../types";
import { Users, AlertTriangle, Zap, Terminal } from "lucide-react";

export default function GroupView({ data }: { data: GroupResult }) {
  // Use same helper for colors as App.tsx
  const getSlopScoreMeta = (score: number) => {
    if (score < 25) {
      return {
        text: "text-emerald-400",
        bg: "bg-[#0A0A0A] border-[#2A2A2A] shadow-[0_0_20px_rgba(16,185,129,0.05)]",
        ring: "ring-emerald-500/20",
        glow: "drop-shadow-[0_0_15px_rgba(52,211,153,0.25)]",
        badge: "bg-emerald-950/50 text-emerald-400 border border-emerald-500/20"
      };
    } else if (score < 60) {
      return {
        text: "text-[#00F0FF]",
        bg: "bg-[#0A0A0A] border-[#2A2A2A] shadow-[0_0_20px_rgba(0,240,255,0.05)]",
        ring: "ring-cyan-500/20",
        glow: "drop-shadow-[0_0_15px_rgba(0,240,255,0.25)]",
        badge: "bg-cyan-950/50 text-[#00F0FF] border border-[#00F0FF]/20"
      };
    } else if (score < 80) {
      return {
        text: "text-[#FACC15]",
        bg: "bg-[#0A0A0A] border-[#2A2A2A] shadow-[0_0_20px_rgba(250,204,21,0.05)]",
        ring: "ring-yellow-500/20",
        glow: "drop-shadow-[0_0_15px_rgba(250,204,21,0.25)]",
        badge: "bg-yellow-950/50 text-[#FACC15] border border-[#FACC15]/20"
      };
    } else {
      return {
        text: "text-rose-500",
        bg: "bg-[#0A0A0A] border-[#2A2A2A] shadow-[0_0_20px_rgba(244,63,94,0.05)]",
        ring: "ring-rose-500/20",
        glow: "drop-shadow-[0_0_15px_rgba(244,63,94,0.25)]",
        badge: "bg-rose-950/50 text-rose-400 border border-rose-500/20"
      };
    }
  };

  const styleMeta = getSlopScoreMeta(data.groupSlopScore);

  return (
    <div className="space-y-6">
      
      {/* Group Score Header */}
      <div className={`border rounded-xl p-8 relative overflow-hidden ${styleMeta.bg}`}>
        <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-bl from-[#00F0FF]/5 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
          <div className="space-y-1">
            <span className="text-[9px] font-mono tracking-widest font-bold text-[#555] uppercase block">
              Group Slop & Redundancy Index
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-6xl font-black font-sans tracking-tight ${styleMeta.text} ${styleMeta.glow}`}>
                {data.groupSlopScore}
              </span>
              <span className="text-sm font-mono text-zinc-600">/100</span>
            </div>
            <div className="mt-2.5">
              <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded ${styleMeta.badge}`}>
                {data.slopLabel}
              </span>
            </div>
          </div>
          <div className="md:max-w-xs space-y-1 bg-[#050505] p-3.5 rounded border border-[#1A1A1A]">
            <span className="text-[9px] font-mono font-bold tracking-wider text-[#555] uppercase block">
              SYNERGY VERDICT
            </span>
            <p className="text-xs italic text-[#AAA] leading-relaxed">
              &ldquo;{data.slopSummary}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Synergy Engine Block */}
      <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-3">
          <Users size={16} className="text-[#00F0FF]" />
          <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-bold">
            Dynamic Group Synergy Analysis
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase text-[#666] font-bold">Overall Compatibility</span>
            <div className="text-[11px] text-zinc-300 font-sans leading-relaxed border-l-2 border-[#00F0FF] pl-3 italic">
              &ldquo;{data.synergyAnalysis.overallCompatibility}&rdquo;
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase text-[#666] font-bold">Roleplay Horizon</span>
            <div className="text-[11px] text-zinc-300 font-sans leading-relaxed border-l-2 border-purple-400 pl-3 italic">
              &ldquo;{data.synergyAnalysis.roleplayPotential}&rdquo;
            </div>
          </div>
        </div>

        {(data.synergyAnalysis.redundancyWarnings.length > 0 || data.synergyAnalysis.tokenBloatWarning) && (
          <div className="bg-[#110505] border border-rose-900/30 rounded p-4 space-y-3 mt-4">
            {data.synergyAnalysis.tokenBloatWarning && (
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-mono uppercase text-rose-500 font-bold block mb-1">Token Bloat Warning</span>
                  <p className="text-[11px] text-rose-200/70 font-mono leading-relaxed">{data.synergyAnalysis.tokenBloatWarning}</p>
                </div>
              </div>
            )}
            
            {data.synergyAnalysis.redundancyWarnings.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase text-[#FACC15] font-bold block mb-1">Redundant Tropes / Collisions</span>
                <ul className="text-[11px] font-mono text-yellow-200/70 space-y-1 list-disc pl-4">
                  {data.synergyAnalysis.redundancyWarnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Roster Breakdown Map */}
      <div>
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#555] font-bold mb-3 mt-8">
          Roster Breakdown & Roles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
          {data.characterBreakdowns.map((char, index) => (
            <div key={index} className="bg-[#050505] border border-[#1A1A1A] p-4 rounded-lg relative overflow-hidden group hover:border-[#333] transition-colors">
              <div className="absolute top-0 right-0 h-full w-1 bg-[#222] group-hover:bg-[#00F0FF] transition-colors" />
              <h4 className="text-xs font-bold font-mono text-white tracking-widest uppercase mb-1 truncate">{char.name}</h4>
              <span className="text-[9px] uppercase tracking-wider text-[#00F0FF] font-mono block mb-3">{char.archetype}</span>
              
              <div className="space-y-2">
                <div>
                  <span className="text-[9px] font-mono text-[#555] uppercase font-bold">Group Function</span>
                  <p className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">{char.groupRole}</p>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-[#555] uppercase font-bold">Friction Points</span>
                  <p className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">{char.potentialConflicts}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Play-Play Group Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-4 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block mb-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
            Road Trip Scenario
          </span>
          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed italic bg-[#050505] p-3 rounded border border-[#1A1A1A]">
            &ldquo;{data.groupScenarios.roadTrip}&rdquo;
          </p>
        </div>
        <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-4 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-[#FACC15] font-bold block mb-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FACC15] shadow-[0_0_6px_#FACC15]" />
            Bank Heist Scenario
          </span>
          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed italic bg-[#050505] p-3 rounded border border-[#1A1A1A]">
            &ldquo;{data.groupScenarios.bankHeist}&rdquo;
          </p>
        </div>
      </div>

      {/* Critical Core Assessment */}
      <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-5 rounded-xl space-y-2 mt-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-[10px] text-zinc-500 font-mono border border-zinc-800">
            <Terminal size={12}/>
          </span>
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#777]">
            GROUP PLAYABILITY TERMINAL AUDIT
          </h3>
        </div>
        <div className="text-[11px] text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap p-3 bg-black rounded border border-[#222]">
          {data.criticalAssessment}
        </div>
      </div>
    </div>
  );
}

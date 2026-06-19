import { MultiCharResult } from "../types";
import { Users, AlertTriangle, Terminal, Globe, User, BookOpen, Scroll } from "lucide-react";

export default function MultiCharView({ data }: { data: MultiCharResult }) {
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

  const styleMeta = getSlopScoreMeta(data.overallSlopScore);

  return (
    <div className="space-y-6">
      <div className={`border rounded-xl p-8 relative overflow-hidden ${styleMeta.bg}`}>
        <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-bl from-[#00F0FF]/5 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
          <div className="space-y-1">
            <span className="text-[9px] font-mono tracking-widest font-bold text-[#555] uppercase block">
              Multi-Char & RPG Slop Score
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-6xl font-black font-sans tracking-tight ${styleMeta.text} ${styleMeta.glow}`}>
                {data.overallSlopScore}
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
              VERDICT
            </span>
            <p className="text-xs italic text-[#AAA] leading-relaxed">
              &ldquo;{data.slopSummary}&rdquo;
            </p>
          </div>
        </div>
      </div>

      <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-3">
          <Globe size={16} className="text-[#00F0FF]" />
          <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-bold">
            World & System Analysis
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center pr-2">
              <span className="text-[10px] font-mono uppercase text-[#666] font-bold">World Building</span>
              <span className="text-[10px] font-mono text-[#00F0FF]">{data.worldAndSystemAnalysis.worldBuilding.score}/10</span>
            </div>
            <div className="text-[11px] text-zinc-300 font-sans leading-relaxed border-l-2 border-[#00F0FF] pl-3 italic">
              {data.worldAndSystemAnalysis.worldBuilding.notes}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center pr-2">
              <span className="text-[10px] font-mono uppercase text-[#666] font-bold">System Rules Adherence</span>
              <span className="text-[10px] font-mono text-[#FACC15]">{data.worldAndSystemAnalysis.systemRulesAdherence.score}/10</span>
            </div>
            <div className="text-[11px] text-zinc-300 font-sans leading-relaxed border-l-2 border-yellow-400 pl-3 italic">
              {data.worldAndSystemAnalysis.systemRulesAdherence.notes}
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded p-4 space-y-3 mt-4">
          <div className="flex items-start gap-2">
            <BookOpen size={14} className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block mb-1">Lorebook Integration</span>
              <p className="text-[11px] text-zinc-300 font-mono leading-relaxed">{data.worldAndSystemAnalysis.lorebookIntegration}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#555] font-bold mb-3 mt-8">
          Character Roster Assessments
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
          {data.characterAssessments.map((char, index) => (
            <div key={index} className="bg-[#050505] border border-[#1A1A1A] p-4 rounded-lg relative overflow-hidden group hover:border-[#333] transition-colors flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-white tracking-widest uppercase mb-1">{char.name}</h4>
                    <span className="text-[9px] uppercase tracking-wider text-[#00F0FF] font-mono block">{char.archetype}</span>
                  </div>
                  <span className="bg-[#111] border border-[#333] px-2 py-1 rounded text-[10px] font-mono text-[#AAA]">Depth: {char.depthScore}/10</span>
                </div>
                
                <div className="space-y-3 mt-4">
                  <div>
                    <span className="text-[9px] font-mono text-[#555] uppercase font-bold">Synergy With World</span>
                    <p className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">{char.synergyWithWorld}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#111]">
                <span className="text-[9px] font-mono text-rose-400 uppercase font-bold block mb-1">Critical Notes</span>
                <p className="text-[11px] text-rose-200/70 font-sans leading-snug">{char.criticalNotes}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-4 rounded-xl mt-8">
        <span className="text-[10px] font-mono uppercase text-[#00F0FF] font-bold block mb-2 flex items-center gap-1.5">
          <Users size={12}/>
          Group Cohesion
        </span>
        <p className="text-[11px] text-zinc-300 font-mono leading-relaxed bg-[#050505] p-3 rounded border border-[#1A1A1A]">
          {data.groupCohesion}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-4 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block mb-2 flex items-center gap-1.5">
             <Scroll size={12}/>
            RPG Encounter Scenario
          </span>
          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed italic bg-[#050505] p-3 rounded border border-[#1A1A1A]">
            &ldquo;{data.playScenarios.rpgEncounter}&rdquo;
          </p>
        </div>
        <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-4 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-[#FACC15] font-bold block mb-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FACC15] shadow-[0_0_6px_#FACC15]" />
            Campfire Chat
          </span>
          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed italic bg-[#050505] p-3 rounded border border-[#1A1A1A]">
            &ldquo;{data.playScenarios.campFireChat}&rdquo;
          </p>
        </div>
      </div>

      <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-5 rounded-xl space-y-2 mt-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-[10px] text-zinc-500 font-mono border border-zinc-800">
            <Terminal size={12}/>
          </span>
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#777]">
            TERMINAL MULTI-CHAR AUDIT
          </h3>
        </div>
        <div className="text-[11px] text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap p-3 bg-black rounded border border-[#222]">
          {data.criticalAssessment}
        </div>
      </div>
    </div>
  );
}

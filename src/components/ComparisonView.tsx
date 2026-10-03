import { useState } from "react";
import { Check, Award, AlertTriangle, Scale } from "lucide-react";
import { ComparisonResult, PremiseResult, AnalysisResult, SharedGroundItem } from "../types";
import ReviewStats from "./ReviewStats";
import Observations from "./Observations";
import ImmersionSections from "./ImmersionSections";

// "remake" = before/after of one card; "premise" = two independent cards that
// share a premise. The same layout serves both, with neutral A/B labels and a
// Shared Ground section in premise mode.
type ComparisonViewProps =
  | { kind: "remake"; comparisonData: ComparisonResult }
  | { kind: "premise"; comparisonData: PremiseResult };

const EDGE_TEXT: Record<SharedGroundItem["edge"], string> = { A: "CARD A", B: "CARD B", even: "EVEN" };

export default function ComparisonView(props: ComparisonViewProps) {
  const [activeTab, setActiveTab] = useState<"combat" | "original" | "remake">("combat");

  const isPremise = props.kind === "premise";
  const original = props.kind === "premise" ? props.comparisonData.cardA : props.comparisonData.original;
  const remake = props.kind === "premise" ? props.comparisonData.cardB : props.comparisonData.remake;
  const leftLabel = isPremise ? "Card A" : "Original";
  const rightLabel = isPremise ? "Card B" : "Remake";

  // Both modes are reduced to one shape for rendering.
  const comparison = props.kind === "premise"
    ? {
        overallVerdict: props.comparisonData.comparison.overallVerdict,
        summary: props.comparisonData.comparison.sharedPremise,
        leftList: props.comparisonData.comparison.whereAWins,
        rightList: props.comparisonData.comparison.whereBWins,
        leftScore: props.comparisonData.comparison.verdictScorecard.cardAScore,
        rightScore: props.comparisonData.comparison.verdictScorecard.cardBScore,
        sharedGround: props.comparisonData.comparison.sharedGround,
      }
    : {
        overallVerdict: props.comparisonData.comparison.overallVerdict,
        summary: props.comparisonData.comparison.summaryOfChanges,
        leftList: props.comparisonData.comparison.whatImproved,
        rightList: props.comparisonData.comparison.whatRegressed,
        leftScore: props.comparisonData.comparison.verdictScorecard.originalScore,
        rightScore: props.comparisonData.comparison.verdictScorecard.remakeScore,
        sharedGround: [] as SharedGroundItem[],
      };

  // verdictScorecard is on a 0-10 scale (slop scores are 0-100).
  // Rounded to one decimal so float noise never reaches the screen.
  const scoreDiff = Math.round((comparison.rightScore - comparison.leftScore) * 10) / 10;

  return (
    <div id="comparison-view-root" className="space-y-6">
      
      {/* TABS SELECTOR */}
      <div className="flex border-b border-[#1A1A1A] gap-2 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab("combat")}
          className={`px-4 py-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-widest border-b-2 transition-all ${
            activeTab === "combat"
              ? "text-[#00F0FF] border-[#00F0FF]"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          [ COMBAT REPORT ]
        </button>
        <button
          onClick={() => setActiveTab("original")}
          className={`px-4 py-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-widest border-b-2 transition-all ${
            activeTab === "original"
              ? "text-red-400 border-red-500"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          [ {isPremise ? "CARD A" : "ORIGINAL CARD"} DIAGNOSTICS ]
        </button>
        <button
          onClick={() => setActiveTab("remake")}
          className={`px-4 py-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-widest border-b-2 transition-all ${
            activeTab === "remake"
              ? "text-cyan-400 border-[#00F0FF]"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          [ {isPremise ? "CARD B" : "REMAKE CARD"} DIAGNOSTICS ]
        </button>
      </div>

      {activeTab === "combat" && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* COMBAT SCORE DUEL BOX */}
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-bl from-[#00F0FF]/5 to-transparent pointer-events-none" />
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
              
              {/* Original Score */}
              <div className="md:col-span-4 text-center md:text-left space-y-2 max-w-[200px] mx-auto md:mx-0">
                <span className="text-[10px] font-mono tracking-widest text-red-500 font-bold uppercase block">
                  {leftLabel.toUpperCase()} SCORE
                </span>
                <div className="flex items-baseline justify-center md:justify-start gap-1">
                  <span className="text-5xl font-black text-red-500 font-sans tracking-tight">
                    {comparison.leftScore}
                  </span>
                  <span className="text-xs font-mono text-zinc-600">/10</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono italic">
                  Slop Score: <span className="text-zinc-300">{(original?.overallSlopScore) ?? 50}%</span>
                </div>
              </div>

              {/* Central VS / Offset Indicator */}
              <div className="md:col-span-4 text-center py-4 md:py-0 border-y md:border-y-0 md:border-x border-[#1A1A1A] space-y-2">
                <span className="text-[11px] font-mono tracking-widest text-zinc-500 font-bold uppercase block">
                  {isPremise ? "EXECUTION EDGE" : "EVOLUTION OFFSET"}
                </span>
                {isPremise ? (
                  <>
                    <div className={`text-2xl font-black font-mono ${scoreDiff === 0 ? "text-zinc-300" : "text-emerald-400"}`}>
                      {scoreDiff === 0 ? "EVEN" : `${scoreDiff > 0 ? "CARD B" : "CARD A"} +${Math.abs(scoreDiff)}`}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                      {Math.abs(scoreDiff) > 1.5 ? "CLEAR_WIN" : scoreDiff !== 0 ? "NARROW_EDGE" : "DEAD_HEAT"}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`text-2xl font-black font-mono ${scoreDiff >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                      {scoreDiff >= 0 ? `+${scoreDiff}` : scoreDiff} PTS
                    </div>
                    <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                      {scoreDiff > 1.5 ? "MEGA_UPGRADE" : scoreDiff > 0 ? "STABLE_UPGRADE" : scoreDiff === 0 ? "PERFECT_SIDEGRADE" : "QUALITY_DEGRADATION"}
                    </div>
                  </>
                )}
              </div>

              {/* Remake Score */}
              <div className="md:col-span-4 text-center md:text-right space-y-2 max-w-[200px] mx-auto md:mr-0 md:ml-auto">
                <span className="text-[10px] font-mono tracking-widest text-[#00F0FF] font-bold uppercase block">
                  {rightLabel.toUpperCase()} SCORE
                </span>
                <div className="flex items-baseline justify-center md:justify-end gap-1">
                  <span className="text-5xl font-black text-[#00F0FF] font-sans tracking-tight">
                    {comparison.rightScore}
                  </span>
                  <span className="text-xs font-mono text-zinc-600">/10</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono italic">
                  Slop Score: <span className="text-zinc-300">{(remake?.overallSlopScore) ?? 50}%</span>
                </div>
              </div>

            </div>
          </div>

          {/* OVERALL COMMENTARY & VERDICT BANNER */}
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-3">
              <Award className="text-cyan-400" size={18} />
              <div>
                <span className="text-[9px] font-mono tracking-widest font-bold text-[#555] uppercase block">
                  AUDITOR VERDICT DESIGNATION
                </span>
                <h4 className="text-sm font-mono font-bold uppercase text-white tracking-wider">
                  {comparison.overallVerdict}
                </h4>
              </div>
            </div>

            {isPremise && (
              <span className="text-[9px] font-mono tracking-widest font-bold text-[#555] uppercase block">SHARED PREMISE</span>
            )}
            <p className="text-xs leading-relaxed text-zinc-300 font-mono bg-[#050505] p-4 rounded-xl border border-[#141414]">
              {comparison.summary}
            </p>
          </div>

          {/* SHARED GROUND (premise mode): element-by-element execution edge */}
          {isPremise && (
            <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-3.5">
              <span className="text-[10px] font-mono tracking-wider font-bold text-[#00F0FF] uppercase flex items-center gap-2">
                <Scale size={14} className="text-[#00F0FF]" />
                SHARED GROUND // WHO HANDLES IT BETTER
              </span>
              {comparison.sharedGround.length > 0 ? (
                <ul className="space-y-3">
                  {comparison.sharedGround.map((item, index) => (
                    <li key={index} className="text-xs font-mono text-zinc-300 leading-relaxed bg-[#050505] p-3 rounded-lg border border-[#141414] space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">{item.element}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${
                          item.edge === "even" ? "text-zinc-300 border-zinc-700 bg-zinc-900" : item.edge === "A" ? "text-red-400 border-red-500/30 bg-red-950/20" : "text-cyan-400 border-cyan-500/30 bg-cyan-950/20"
                        }`}>{EDGE_TEXT[item.edge]}</span>
                      </div>
                      <p className="text-zinc-400">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs font-mono text-zinc-500 italic">No shared premise elements were identified.</p>
              )}
            </div>
          )}

          {/* HEAD-TO-HEAD PROS & CONS CHECKLISTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* IMPROVEMENTS LIST */}
            <div className="border border-emerald-900/30 bg-[#070A08] p-5 rounded-xl space-y-3.5">
              <span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase flex items-center gap-2">
                <Check size={14} className="bg-emerald-900/40 rounded-full p-0.5 text-emerald-400 border border-emerald-500/20" />
                {isPremise ? "WHERE CARD A WINS" : "CONSTRUCTIVE IMPROVEMENTS // REWRITE WIN"}
              </span>

              {comparison.leftList.length > 0 ? (
                <ul className="space-y-3">
                  {comparison.leftList.map((item, index) => (
                    <li key={index} className="text-xs font-mono text-zinc-300 leading-relaxed flex items-start gap-2.5">
                      <span className="text-emerald-500 font-bold block mt-0.5 select-none">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs font-mono text-zinc-500 italic">{isPremise ? "No genuine advantage found for Card A." : "No significant improvements detected in this rewrite iteration."}</p>
              )}
            </div>

            {/* REGRESSIONS LIST */}
            <div className="border border-rose-950/20 bg-[#0A0708] p-5 rounded-xl space-y-3.5">
              <span className="text-[10px] font-mono tracking-wider font-bold text-rose-400 uppercase flex items-center gap-2">
                {isPremise ? (
                  <Check size={14} className="bg-cyan-900/40 rounded-full p-0.5 text-cyan-400 border border-cyan-500/20" />
                ) : (
                  <AlertTriangle size={14} className="bg-rose-950/40 rounded-full p-0.5 text-rose-400 border border-rose-500/20 animate-pulse" />
                )}
                {isPremise ? "WHERE CARD B WINS" : "REGRESSIONS or ELEMENTS TO KEEP // ATTENTION REQUIRED"}
              </span>

              {comparison.rightList.length > 0 ? (
                <ul className="space-y-3">
                  {comparison.rightList.map((item, index) => (
                    <li key={index} className="text-xs font-mono text-zinc-300 leading-relaxed flex items-start gap-2.5">
                      <span className={`${isPremise ? "text-cyan-400" : "text-rose-500"} font-bold block mt-0.5 select-none`}>{isPremise ? "+" : "−"}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : isPremise ? (
                <p className="text-xs font-mono text-zinc-500 italic">No genuine advantage found for Card B.</p>
              ) : (
                <p className="text-xs font-mono text-emerald-400 bg-emerald-950/10 p-2.5 rounded border border-emerald-500/10 text-center font-bold">
                  ✓ NO REGRESSIONS DETECTED. THE UPGRADE WAS PRISTINE!
                </p>
              )}
            </div>

          </div>

          {/* BEHAVIOR MATRIX COMPARISON TABLE */}
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-4">
            <span className="text-[10px] font-mono tracking-wider font-bold text-[#777] uppercase block">
              CAPABILITY ANALYSIS METRIC DRIFT
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* ORIGINAL MATRIX */}
              <div className="border border-[#141414] bg-[#050505] p-4 rounded-lg space-y-2.5">
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#555] block uppercase">
                  [{leftLabel.toUpperCase()} CAPABILITIES]
                </span>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-zinc-400">BEST RUNTIME EXECUTOR:</div>
                  <p className="text-[11px] leading-relaxed italic text-zinc-400 font-mono bg-black p-2 rounded border border-[#141414]">
                    &ldquo;{original.doesBest}&rdquo;
                  </p>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-zinc-400">BIGGEST EXPLOIT HOLE:</div>
                  <p className="text-[11px] leading-relaxed italic text-zinc-400 font-mono bg-black p-2 rounded border border-[#141414]">
                    &ldquo;{original.doesWorst}&rdquo;
                  </p>
                </div>
              </div>

              {/* REMAKE MATRIX */}
              <div className="border border-[#141414] bg-[#050505] p-4 rounded-lg space-y-2.5">
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#00F0FF] block uppercase">
                  [{rightLabel.toUpperCase()} CAPABILITIES]
                </span>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-[#00F0FF]">BEST RUNTIME EXECUTOR:</div>
                  <p className="text-[11px] leading-relaxed italic text-zinc-300 font-mono bg-black p-2 rounded border border-[#141414]">
                    &ldquo;{remake.doesBest}&rdquo;
                  </p>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-[#00F0FF]">BIGGEST EXPLOIT HOLE:</div>
                  <p className="text-[11px] leading-relaxed italic text-zinc-300 font-mono bg-black p-2 rounded border border-[#141414]">
                    &ldquo;{remake.doesWorst}&rdquo;
                  </p>
                </div>
              </div>

            </div>
          </div>
          
          {/* BEHAVIOR ENHANCEMENTS GRID: both cards, so neither side's paid-for fields go unseen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { card: original, label: leftLabel },
              { card: remake, label: rightLabel },
            ].map(({ card, label }) => (
              <div key={label} className="space-y-4">
                <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-2">
                  <span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
                    <span className="h-1 w-1 bg-emerald-400 shadow-[0_0_4px_#34D399]" />
                    {label.toUpperCase()} GREETING SYNERGY
                  </span>
                  <p className="text-[11px] font-mono text-zinc-400 leading-relaxed italic">
                    {card.firstMessageSynergy}
                  </p>
                </div>
                <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-2">
                  <span className="text-[10px] font-mono tracking-wider font-bold text-[#FACC15] uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
                    <span className="h-1 w-1 bg-[#FACC15] shadow-[0_0_4px_#FACC15]" />
                    {label.toUpperCase()} HIDDEN DYNAMIC
                  </span>
                  <p className="text-[11px] font-mono text-zinc-400 leading-relaxed italic">
                    {card.hiddenDynamic}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CREATOR NOTES COMPARISON */}
          {(original.creatorNotesBlurb || remake.creatorNotesBlurb) && (
            <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-4">
              <span className="text-[10px] font-mono tracking-wider font-bold text-[#A855F7] uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
                <span className="h-1 w-1 bg-[#A855F7] shadow-[0_0_4px_#A855F7]" />
                NOTES ON CREATOR NOTES // METADATA CONTEXT
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 text-zinc-400">
                  <div className="text-[9px] font-mono font-black uppercase text-red-400">[{leftLabel.toUpperCase()} EXTRACT]</div>
                  <p className="text-xs leading-relaxed italic bg-black/60 p-3 rounded border border-[#141414]">
                    {original.creatorNotesBlurb || "None detected."}
                  </p>
                </div>
                <div className="space-y-1 text-zinc-300">
                  <div className="text-[9px] font-mono font-black uppercase text-cyan-400">[{rightLabel.toUpperCase()} EXTRACT]</div>
                  <p className="text-xs leading-relaxed italic bg-black/60 p-3 rounded border border-[#141414]">
                    {remake.creatorNotesBlurb || "None detected."}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {activeTab === "original" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border border-red-500/20 bg-red-950/5 p-4 rounded-xl text-center text-xs font-mono text-red-400 uppercase tracking-wider">
            {leftLabel} Diagnostic Audit Workspace
          </div>
          <IndividualAuditPanel analysis={original} />
        </div>
      )}

      {activeTab === "remake" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border border-cyan-500/20 bg-cyan-950/5 p-4 rounded-xl text-center text-xs font-mono text-cyan-400 uppercase tracking-wider">
            {rightLabel} Diagnostic Audit Workspace
          </div>
          <IndividualAuditPanel analysis={remake} />
        </div>
      )}

    </div>
  );
}

function IndividualAuditPanel({ analysis }: { analysis: AnalysisResult }) {
  if (!analysis) {
    return (
      <div className="border border-zinc-800 bg-[#0A0A0A] p-6 rounded-xl text-center border-dashed font-mono text-[11px] text-zinc-500">
        [Audit record missing or unparseable]
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SCORE CARD */}
      <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-[9px] font-mono tracking-widest font-bold text-[#555] uppercase block">
            SLOP INDEX RATING
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black font-sans tracking-tight text-[#00F0FF]">
              {analysis.overallSlopScore}
            </span>
            <span className="text-xs font-mono text-zinc-600">/100</span>
          </div>
          <span className="text-[9px] font-mono font-bold uppercase text-cyan-400 bg-cyan-950/50 border border-cyan-500/20 px-2.5 py-0.5 rounded inline-block mt-1">
            {analysis.slopLabel}
          </span>
        </div>

        <p className="text-xs italic text-zinc-400 border-l border-[#1A1A1A] pl-4 max-w-md">
          &ldquo;{analysis.slopSummary}&rdquo;
        </p>
      </div>

      {/* QUIRE */}
      <div className="p-4 bg-[#0F0F0F] border-l-2 border-[#00F0FF] rounded-r-lg">
        <span className="text-[9px] font-mono font-bold text-[#00F0FF] tracking-wider uppercase block mb-1">
          COGNITIVE ANTHOLOGY PROFILE
        </span>
        <p className="text-xs italic text-zinc-300 font-sans leading-relaxed">
          &ldquo;{analysis.quippySellSummary}&rdquo;
        </p>
      </div>

      {/* STATS */}
      <ReviewStats stats={analysis.coreAnalysis} />

      {/* DETAILED OBSERVATIONS */}
      <Observations observations={analysis.observations} />

      {/* ASSESSMENT */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-[10px] text-zinc-500 font-mono border border-zinc-800">03</span>
          <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">CRITICAL ASSESSMENT</h3>
        </div>
        <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-5 rounded-xl text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
          {analysis.criticalAssessment}
        </div>
      </div>

      {/* PROFILE VOICE STYLE */}
      {analysis.profileVoice && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-[10px] text-zinc-500 font-mono border border-zinc-800">04</span>
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">SYSTEM VOICE AUDIT</h3>
          </div>
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-1.5">
              <span className="text-[10px] font-mono tracking-wider font-bold text-[#00F0FF] uppercase">FORMAT STYLE CATEGORY</span>
              <span className="text-[10px] font-mono font-bold text-white uppercase bg-[#111] px-2 py-0.5 rounded border border-[#1A1A1A] tracking-wider">{analysis.profileVoice.format}</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-300 font-mono bg-[#050505] p-3 rounded border border-zinc-900 italic">
              &ldquo;{analysis.profileVoice.evaluation}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* DIALOGUE PORTAL */}
      {analysis.exampleDialogue && analysis.exampleDialogue.present && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-[10px] text-zinc-500 font-mono border border-zinc-800">05</span>
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">EXAMPLE DIALOGUE PORTAL</h3>
          </div>
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-1.5">
              <span className="text-[10px] font-mono tracking-wider font-bold text-purple-400 uppercase">DIALOGUE STYLE EVALUATION</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-300 font-mono bg-[#050505] p-3 rounded border border-zinc-900 italic border-l-4 border-purple-500">
              &ldquo;{analysis.exampleDialogue.evaluation}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* OPTIONAL IMMERSION MODULES (only rendered when enabled for this run) */}
      <ImmersionSections data={analysis} />
    </div>
  );
}

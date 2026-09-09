import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Cpu, Compass, FileText, Users, Globe } from "lucide-react";
import CardInput from "./components/CardInput";
import ComparisonInput from "./components/ComparisonInput";
import ComparisonView from "./components/ComparisonView";
import GroupInput from "./components/GroupInput";
import GroupView from "./components/GroupView";
import MultiCharView from "./components/MultiCharView";
import ReviewStats from "./components/ReviewStats";
import Observations from "./components/Observations";
import VisualMatch from "./components/VisualMatch";
import ExportButtons from "./components/ExportButtons";
import ImmersionSections from "./components/ImmersionSections";
import { AnalysisResult, ComparisonResult, GroupResult, MultiCharResult } from "./types";
import { runAnalyze, runCompare, runGroup, runMultichar } from "./aiClient";
import { ImmersionModuleId } from "./immersionModules";
import { getSlopScoreMeta } from "./scoreMeta";


export default function App() {
  const [appMode, setAppMode] = useState<"audit" | "comparison" | "group" | "multichar">("audit");
  const [extractedName, setExtractedName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [groupResult, setGroupResult] = useState<GroupResult | null>(null);
  const [multiCharResult, setMultiCharResult] = useState<MultiCharResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkLatency, setNetworkLatency] = useState("14ms");
  
  // Real-time terminal diagnostic simulation lines during analysis
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Initializing neural auditing protocols...",
    "Tokenizing instruction maps & compiling context weight lists...",
    "Scanning negative space configuration and blank token densities...",
    "Evaluating trope mechanics against 100k roleplay datasets...",
    "Executing syntactic slop filters on narrative writing patterns...",
    "Cross-referencing trope signatures against archetype heuristics...",
    "Assembling diagnostic scorecards and baking sardonic feedback..."
  ];

  // Rotate network latency for immersive realism
  useEffect(() => {
    const interval = setInterval(() => {
      const lat = Math.floor(Math.random() * 8) + 11;
      setNetworkLatency(`${lat}ms`);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => Math.min(prev + 1, loadingMessages.length - 1));
      }, 900);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleAnalyze = async (
    description: string,
    imageBase64: string | null,
    imageMimeType: string | null,
    customApiKey: string | null,
    selectedModel: string | null,
    provider: string,
    customBaseUrl: string | null = null,
    analyzerNotes: string | null = null,
    thinkingMode: boolean = false,
    reasoningEffort: string = "medium",
    modules: ImmersionModuleId[] = [],
    maxOutputTokens: number = 32768
  ) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await runAnalyze(
        { description, imageBase64, imageMimeType, analyzerNotes },
        { provider, apiKey: customApiKey || "", model: selectedModel, customBaseUrl, thinkingMode, reasoningEffort, modules, maxOutputTokens }
      );
      setAnalysis(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to complete AI character audit.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = async (
    originalDescription: string,
    remakeDescription: string,
    _originalImageBase64: string | null,
    _originalImageMimeType: string | null,
    _remakeImageBase64: string | null,
    _remakeImageMimeType: string | null,
    customApiKey: string | null,
    selectedModel: string | null,
    provider: string,
    customBaseUrl: string | null = null,
    thinkingMode: boolean = false,
    reasoningEffort: string = "medium",
    modules: ImmersionModuleId[] = [],
    maxOutputTokens: number = 32768
  ) => {
    setIsLoading(true);
    setError(null);
    setComparisonResult(null);

    try {
      const result = await runCompare(
        { originalDescription, remakeDescription },
        { provider, apiKey: customApiKey || "", model: selectedModel, customBaseUrl, thinkingMode, reasoningEffort, modules, maxOutputTokens }
      );
      setComparisonResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to complete character comparison audit.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroup = async (
    characters: Array<{ name: string; description: string }>,
    customApiKey: string | null,
    selectedModel: string | null,
    provider: string,
    customBaseUrl: string | null = null,
    thinkingMode: boolean = false,
    reasoningEffort: string = "medium",
    modules: ImmersionModuleId[] = [],
    maxOutputTokens: number = 32768
  ) => {
    setIsLoading(true);
    setError(null);
    setGroupResult(null);

    try {
      const result = await runGroup(
        { characters },
        { provider, apiKey: customApiKey || "", model: selectedModel, customBaseUrl, thinkingMode, reasoningEffort, modules, maxOutputTokens }
      );
      setGroupResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to complete group character audit.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMultiCharAnalyze = async (
    description: string,
    _imageBase64: string | null,
    _imageMimeType: string | null,
    customApiKey: string | null,
    selectedModel: string | null,
    provider: string,
    customBaseUrl: string | null = null,
    analyzerNotes: string | null = null,
    thinkingMode: boolean = false,
    reasoningEffort: string = "medium",
    modules: ImmersionModuleId[] = [],
    maxOutputTokens: number = 32768
  ) => {
    setIsLoading(true);
    setError(null);
    setMultiCharResult(null);

    try {
      const result = await runMultichar(
        { description, analyzerNotes },
        { provider, apiKey: customApiKey || "", model: selectedModel, customBaseUrl, thinkingMode, reasoningEffort, modules, maxOutputTokens }
      );
      setMultiCharResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to complete multi-character AI audit.");
    } finally {
      setIsLoading(false);
    }
  };

  const styleMeta = analysis ? getSlopScoreMeta(analysis.overallSlopScore) : null;

  return (
    <div className="min-h-screen text-[#E0E0E0] bg-[#050505] font-sans flex flex-col justify-between selection:bg-[#00F0FF]/30 selection:text-white border-4 border-[#1A1A1A]">
      
      <div>
        {/* Main HUD Nav bar */}
        <header className="min-h-14 py-3 border-b border-[#2A2A2A] bg-[#0A0A0A] flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-[#00F0FF] rounded-full shadow-[0_0_10px_#00F0FF] animate-pulse"></div>
            <h1 className="uppercase tracking-[0.2em] text-xs font-bold text-white font-mono flex flex-wrap items-center gap-2">
              Auditor v4.2 <span className="opacity-40">//</span> Character Performance Index
            </h1>
          </div>
          
          <div className="hidden md:flex gap-8 text-[10px] font-mono text-[#666] items-center">
            <span>DB_INDEX: <strong className="text-zinc-400">104,291_CARDS</strong></span>
            <span>LATENCY: <strong className="text-zinc-400">{networkLatency}</strong></span>
            <span className="text-[#00F0FF] font-semibold">STATUS: SYSTEM_READY</span>
          </div>
        </header>

        {/* Main Container Layout */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-20 space-y-6">
          
          {/* Intro parameters guide card styled in high tech minimalist line */}
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00F0FF]"></div>
            <div className="space-y-1 pl-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#00F0FF] text-[10px] font-mono tracking-wider">[ RUNTIME_MANDATE ]</span>
                <span className="text-xs font-bold text-zinc-200">Non-Academic Instruction Auditor</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed max-w-5xl">
                Evaluating instruction templates for raw LLM playability. Safe space for benign character quirks & trope setups as long as they guide behavior models efficiently without introducing AI placeholder formatting or word redundancy.
              </p>
            </div>

            {/* MODE SWITCHER PILL */}
            <div className="grid grid-cols-2 sm:grid-cols-4 w-full md:w-auto min-w-0 bg-black border border-[#1A1A1A] p-1 rounded-lg select-none">
              <button
                type="button"
                onClick={() => {
                  setAppMode("audit");
                  setError(null);
                }}
                disabled={isLoading}
                className={`min-w-0 px-2 py-2 rounded font-mono text-[10px] uppercase tracking-wider transition-all ${
                  appMode === "audit"
                    ? "bg-[#111] text-[#00F0FF] font-bold shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] border border-[#222]"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                [ Single Audit ]
              </button>
              <button
                type="button"
                onClick={() => {
                  setAppMode("comparison");
                  setError(null);
                }}
                disabled={isLoading}
                className={`min-w-0 px-2 py-2 rounded font-mono text-[10px] uppercase tracking-wider transition-all ${
                  appMode === "comparison"
                    ? "bg-[#111] text-cyan-400 font-bold shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] border border-[#222]"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                [ Comparison Mode ]
              </button>
              <button
                type="button"
                onClick={() => {
                  setAppMode("group");
                  setError(null);
                }}
                disabled={isLoading}
                className={`min-w-0 px-2 py-2 rounded font-mono text-[10px] uppercase tracking-wider transition-all ${
                  appMode === "group"
                    ? "bg-[#111] text-purple-400 font-bold shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] border border-[#222]"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                [ Group Audit ]
              </button>
              <button
                type="button"
                onClick={() => {
                  setAppMode("multichar");
                  setError(null);
                }}
                disabled={isLoading}
                className={`min-w-0 px-2 py-2 rounded font-mono text-[10px] uppercase tracking-wider transition-all ${
                  appMode === "multichar"
                    ? "bg-[#111] text-emerald-400 font-bold shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] border border-[#222]"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                [ Multi-Char System ]
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-xl text-sm flex gap-3 text-rose-300 font-mono">
              <span className="text-[#F43F5E]">[!]</span>
              <div className="text-xs">
                <span className="font-bold block mb-0.5 uppercase tracking-wider text-rose-400">Daemon Thread Error</span>
                <p className="text-zinc-400 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {appMode === "audit" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT PANEL: Inputs, Uploads and Actions */}
              <div className="min-w-0 lg:col-span-5 space-y-6">
                <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-6 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-10 w-10 bg-gradient-to-bl from-[#00F0FF]/5 to-transparent pointer-events-none" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#777] flex items-center gap-2 mb-4">
                    <FileText size={14} className="text-[#00F0FF]" /> Setup Source Panel
                  </h3>
                  <CardInput onAnalyze={handleAnalyze} isLoading={isLoading} onNameExtracted={setExtractedName} />
                </div>
              </div>

              {/* RIGHT PANEL: Outputs and Analysis Card views */}
              <div className="min-w-0 lg:col-span-7">
                <AnimatePresence mode="wait">
                  {isLoading && (
                    <motion.div
                      key="loading-terminal"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border border-[#1A1A1A] bg-[#0A0A0A] p-8 rounded-xl flex flex-col items-center justify-center min-h-[550px] space-y-6"
                    >
                      <div className="relative flex h-16 w-16 items-center justify-center">
                        <div className="absolute inset-0 bg-[#00F0FF]/10 rounded-full animate-ping pointer-events-none" />
                        <div className="h-10 w-10 rounded-full border-2 border-dashed border-[#00F0FF] animate-spin" />
                      </div>

                      <div className="space-y-2 text-center max-w-sm">
                        <h4 className="text-xs font-bold font-mono tracking-[0.22em] text-[#00F0FF] uppercase">
                          COMPILED_DAEMON: ACTIVE
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Target Thread: LoreSieve Core v4.2
                        </p>
                      </div>

                      {/* Real-time stepping log block */}
                      <div className="w-full max-w-md bg-[#050505] rounded-lg p-4 border border-[#1A1A1A] font-mono text-[11px] space-y-2.5">
                        <div className="flex justify-between text-[10px] text-[#555] border-b border-[#1A1A1A] pb-1.5">
                          <span>DAEMON INTEGRATION FEED</span>
                          <span>{Math.round(((loadingStep + 1) / loadingMessages.length) * 100)}%</span>
                        </div>
                        
                        <div className="space-y-1 h-20 overflow-hidden flex flex-col justify-end">
                          {loadingMessages.slice(0, loadingStep).map((msg, i) => (
                            <div key={i} className="text-[#444] flex gap-2">
                              <span>//</span>
                              <span className="truncate">{msg}</span>
                            </div>
                          ))}
                          <div className="text-[#00F0FF] font-medium flex gap-2">
                            <span>&gt;&gt;</span>
                            <span className="truncate">{loadingMessages[loadingStep]}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!isLoading && !analysis && (
                    <motion.div
                      key="empty-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border border-zinc-800 bg-[#0A0A0A] p-8 rounded-xl flex flex-col items-center justify-center min-h-[550px] text-center border-dashed"
                    >
                      <div className="h-12 w-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 shadow-inner">
                        <Compass size={20} className="text-[#555] animate-pulse" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#888]">No active diagnostics loaded</h3>
                      <p className="text-[11px] text-zinc-500 max-w-sm mt-2 leading-relaxed">
                        Drop or select your SillyTavern character card PNG file, or open the manual text input editor to paste prompt instructions, then run the AI character audit.
                      </p>
                    </motion.div>
                  )}

                  {!isLoading && analysis && styleMeta && (
                    <motion.div
                      key="audit-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="flex justify-end mb-2">
                        <ExportButtons data={analysis} type="audit" charName={extractedName} />
                      </div>
                      {/* HERO SCORE CARD: SLOP RATING */}
                      <div
                        id="hero-score-card"
                        className={`border rounded-xl p-8 relative overflow-hidden ${styleMeta.bg}`}
                      >
                        <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-bl from-[#00F0FF]/5 to-transparent pointer-events-none" />
                        
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono tracking-widest font-bold text-[#555] uppercase block">
                              Overall Slop Index
                            </span>
                            
                            <div className="flex items-baseline gap-2">
                              <span className={`text-6xl font-black font-sans tracking-tight ${styleMeta.text} ${styleMeta.glow}`}>
                                {analysis.overallSlopScore}
                              </span>
                              <span className="text-sm font-mono text-zinc-600">/100</span>
                            </div>

                            <div className="mt-2.5">
                              <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded ${styleMeta.badge}`}>
                                {analysis.slopLabel}
                              </span>
                            </div>
                          </div>

                          <div className="md:max-w-xs space-y-1 bg-[#050505] p-3.5 rounded border border-[#1A1A1A]">
                            <span className="text-[9px] font-mono font-bold tracking-wider text-[#555] uppercase block">
                              PROMPT INDEX SUMMARY
                            </span>
                            <p className="text-xs italic text-[#AAA] leading-relaxed">
                              &ldquo;{analysis.slopSummary}&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* QUIPPY SUMMARY BANNER */}
                      <div id="quippy-summary" className="relative p-5 bg-[#0F0F0F] border-l-2 border-[#00F0FF] rounded-r-lg">
                        <span className="text-[9px] font-mono font-bold text-[#00F0FF] tracking-wider uppercase block mb-1">
                          COGNITIVE ANTHOLOGY PROFILE
                        </span>
                        <p className="text-xs italic text-zinc-300 font-sans leading-relaxed">
                          &ldquo;{analysis.quippySellSummary}&rdquo;
                        </p>
                      </div>

                      {/* SECTION 01: Core diagnostics sliders */}
                      <ReviewStats stats={analysis.coreAnalysis} />

                      {/* IMMERSION & SCENARIO BLUEPRINTS */}
                      <div id="immersion-playplay-blueprints" className="space-y-4 animate-fadeIn">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#0A0A0A] text-[10px] text-zinc-500 font-mono border border-[#1A1A1A]">
                            02
                          </span>
                          <h3 className="text-xs font-mono uppercase tracking-widest text-[#777]">
                            IMMERSION DIAGNOSTICS // BEHAVIOR SIMULATIONS
                          </h3>
                        </div>

                        {/* Capabilities Comparison */}
                        <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-4">
                          {/* Does Best */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
                              PROMPT_STRENGTH // APEX_PERFORMANCE
                            </span>
                            <div className="text-[11px] leading-relaxed text-zinc-300 font-mono bg-[#050505] p-3 rounded border border-[#1A1A1A] italic">
                              &ldquo;{analysis.doesBest}&rdquo;
                            </div>
                          </div>

                          {/* Does Worst */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono tracking-wider font-bold text-rose-500 uppercase flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#EF4444]" />
                              PROMPT_WEAKNESS // UNSTABLE_VULNERABILITIES
                            </span>
                            <div className="text-[11px] leading-relaxed text-zinc-300 font-mono bg-[#050505] p-3 rounded border border-[#1A1A1A] italic">
                              &ldquo;{analysis.doesWorst}&rdquo;
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* First Message Synergy */}
                          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-2">
                            <span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
                              <span className="h-1 w-1 bg-emerald-400 shadow-[0_0_4px_#34D399]" />
                              ACTIVE GREETING SYNERGY
                            </span>
                            <p className="text-[11px] font-mono text-zinc-400 leading-relaxed italic">
                              {analysis.firstMessageSynergy}
                            </p>
                          </div>

                          {/* Hidden Dynamic */}
                          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-2">
                            <span className="text-[10px] font-mono tracking-wider font-bold text-[#FACC15] uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
                              <span className="h-1 w-1 bg-[#FACC15] shadow-[0_0_4px_#FACC15]" />
                              HIDDEN SUBTEXT DYNAMIC
                            </span>
                            <p className="text-[11px] font-mono text-zinc-400 leading-relaxed italic">
                              {analysis.hiddenDynamic}
                            </p>
                          </div>
                        </div>

                        {/* META NOTES */}
                        {analysis.creatorNotesBlurb && (
                          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-2 max-w-full">
                            <span className="text-[10px] font-mono tracking-wider font-bold text-[#A855F7] uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
                              <span className="h-1 w-1 bg-[#A855F7] shadow-[0_0_4px_#A855F7]" />
                              NOTES ON CREATOR NOTES // METADATA CONTEXT
                            </span>
                            <p className="text-[11px] font-mono text-zinc-400 leading-relaxed italic">
                              {analysis.creatorNotesBlurb}
                            </p>
                          </div>
                        )}

                        {/* OPTIONAL IMMERSION MODULES (only the ones enabled for this run) */}
                        <ImmersionSections data={analysis} />
                      </div>

                      {/* VISUAL ACCURACY (if loaded) */}
                      {analysis.visualComparison && (
                        <VisualMatch data={analysis.visualComparison} />
                      )}

                      {/* SECTION 02: Auditing observations collapsible bullet checklist */}
                      <Observations observations={analysis.observations} />

                      {/* SECTION 03: Critical runtime playability analysis assessment */}
                      <div id="critical-assessment-block" className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-[10px] text-zinc-500 font-mono border border-zinc-800">
                            03
                          </span>
                          <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                            CRITICAL PLAYABILITY ASSESSMENT // AUDIT
                          </h3>
                        </div>

                        <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-5 rounded-xl whitespace-pre-wrap leading-relaxed text-xs text-zinc-300 font-mono">
                          {analysis.criticalAssessment}
                        </div>
                      </div>

                      {/* SECTION 04: System Voice Audit */}
                      {analysis.profileVoice && (
                        <div id="profile-voice-block" className="space-y-2 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-[10px] text-zinc-500 font-mono border border-zinc-800">
                              04
                            </span>
                            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                              SYSTEM VOICE AUDIT // FORMAT EVALUATION
                            </h3>
                          </div>

                          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-2">
                              <span className="text-[10px] font-mono tracking-wider font-bold text-[#00F0FF] uppercase">
                                FORMAT STYLE CATEGORY
                              </span>
                              <span className="text-[10px] font-mono font-bold text-white uppercase bg-[#111] px-2.5 py-1 rounded border border-[#1A1A1A] tracking-wider">
                                {analysis.profileVoice.format}
                              </span>
                            </div>
                            
                            <p className="text-[11px] leading-relaxed text-zinc-300 font-mono bg-[#050505] p-3 rounded border border-[#1A1A1A] italic">
                              &ldquo;{analysis.profileVoice.evaluation}&rdquo;
                            </p>
                          </div>
                        </div>
                      )}

                      {/* SECTION 05: Example Dialogue Audit */}
                      {analysis.exampleDialogue && analysis.exampleDialogue.present && (
                        <div id="example-dialogue-block" className="space-y-2 pt-2 animate-fadeIn">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-[10px] text-zinc-500 font-mono border border-zinc-800">
                              05
                            </span>
                            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                              EXAMPLE DIALOGUE AUDIT // DIALOGUE STYLE
                            </h3>
                          </div>

                          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-2">
                              <span className="text-[10px] font-mono tracking-wider font-bold text-purple-400 uppercase">
                                DIALOGUE VOICE EVALUATION
                              </span>
                              <span className="text-[10px] font-mono font-bold text-white uppercase bg-[#111] px-2.5 py-1 rounded border border-[#1A1A1A] tracking-wider">
                                DETECTED_EXAMPLES
                              </span>
                            </div>
                            
                            <p className="text-[11px] leading-relaxed text-zinc-300 font-mono bg-[#050505] p-3 rounded border border-[#1A1A1A] italic border-l-4 border-l-purple-500">
                              &ldquo;{analysis.exampleDialogue.evaluation}&rdquo;
                            </p>
                          </div>
                        </div>
                      )}

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          ) : appMode === "comparison" ? (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Comparison Input Panels in full horizontal workspace */}
              <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-6 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-10 w-10 bg-gradient-to-bl from-[#00F0FF]/5 to-transparent pointer-events-none" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2 mb-4">
                  <Sparkles size={14} className="text-cyan-400" /> Comparison Deck Compiler
                </h3>
                <ComparisonInput onCompare={handleCompare} isLoading={isLoading} />
              </div>

              {/* Comparison results or state loaders */}
              <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-6 rounded-xl min-h-[450px]">
                <AnimatePresence mode="wait">
                  {isLoading && (
                    <motion.div
                      key="cmp-loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12 space-y-6"
                    >
                      <div className="relative flex h-16 w-16 items-center justify-center">
                        <div className="absolute inset-0 bg-[#00F0FF]/10 rounded-full animate-ping pointer-events-none" />
                        <div className="h-10 w-10 rounded-full border-2 border-dashed border-[#00F0FF] animate-spin" />
                      </div>

                      <div className="space-y-2 text-center max-w-sm">
                        <h4 className="text-xs font-bold font-mono tracking-[0.22em] text-[#00F0FF] uppercase">
                          COMPARISON_DAEMON: ACTIVE
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Mapping instruction drifts & testing behavior loops...
                        </p>
                      </div>

                      <div className="w-full max-w-md bg-[#050505] rounded-lg p-4 border border-[#1A1A1A] font-mono text-[11px] space-y-2">
                        <div className="flex justify-between text-[10px] text-[#555] border-b border-[#1A1A1A] pb-1">
                          <span>DAEMON SYSTEM PROGRESS</span>
                          <span>{Math.round(((loadingStep + 1) / loadingMessages.length) * 100)}%</span>
                        </div>
                        <div className="space-y-1 h-14 overflow-hidden flex flex-col justify-end">
                          <div className="text-[#444] flex gap-2">
                            <span>//</span>
                            <span className="truncate">Contrasting Negative space matrices & slop signatures...</span>
                          </div>
                          <div className="text-cyan-400 font-medium flex gap-2">
                            <span>&gt;&gt;</span>
                            <span className="truncate">{loadingMessages[loadingStep]}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!isLoading && !comparisonResult && (
                    <motion.div
                      key="cmp-empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <div className="h-12 w-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 shadow-inner">
                        <Sparkles size={20} className="text-[#555]" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#888]">No dual matchup initialized</h3>
                      <p className="text-[11px] text-zinc-500 max-w-sm mt-2 leading-relaxed">
                        Attach or paste both character versions above to trigger a head-to-head performance combat analysis.
                      </p>
                    </motion.div>
                  )}

                  {!isLoading && comparisonResult && (
                    <motion.div
                      key="cmp-report"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="mt-6"
                    >
                      <div className="flex justify-end mb-4">
                        <ExportButtons data={comparisonResult} type="comparison" />
                      </div>
                      <ComparisonView comparisonData={comparisonResult} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          ) : appMode === "group" ? (
            <div className="space-y-8 animate-fadeIn">
              {/* Group View */}
              <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-6 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-10 w-10 bg-gradient-to-bl from-purple-500/10 to-transparent pointer-events-none" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2 mb-4">
                  <Users size={14} className="text-purple-400" /> Group Roster Compiler
                </h3>
                <GroupInput onAnalyze={handleGroup} isLoading={isLoading} />
              </div>

              <div className="border border-[#1A1A1A] bg-[#0A0A0A] p-6 rounded-xl min-h-[450px]">
                <AnimatePresence mode="wait">
                  {isLoading && (
                    <motion.div
                      key="grp-loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12 space-y-6"
                    >
                      <div className="relative flex h-16 w-16 items-center justify-center">
                        <div className="absolute inset-0 bg-purple-500/10 rounded-full animate-ping pointer-events-none" />
                        <div className="h-10 w-10 rounded-full border-2 border-dashed border-purple-500 animate-spin" />
                      </div>

                      <div className="space-y-2 text-center max-w-sm">
                        <h4 className="text-xs font-bold font-mono tracking-[0.22em] text-purple-400 uppercase">
                          SYNERGY_DAEMON: ACTIVE
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Mapping roster dynamics and redundancy...
                        </p>
                      </div>

                      <div className="w-full max-w-md bg-[#050505] rounded-lg p-4 border border-[#1A1A1A] font-mono text-[11px] space-y-2">
                        <div className="flex justify-between text-[10px] text-[#555] border-b border-[#1A1A1A] pb-1">
                          <span>DAEMON SYSTEM PROGRESS</span>
                          <span>{Math.round(((loadingStep + 1) / loadingMessages.length) * 100)}%</span>
                        </div>
                        <div className="space-y-1 h-14 overflow-hidden flex flex-col justify-end">
                          <div className="text-[#444] flex gap-2">
                            <span>//</span>
                            <span className="truncate">Simulating bank heist scenario...</span>
                          </div>
                          <div className="text-purple-400 font-medium flex gap-2">
                            <span>&gt;&gt;</span>
                            <span className="truncate">{loadingMessages[loadingStep]}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!isLoading && !groupResult && (
                    <motion.div
                      key="grp-empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <div className="h-12 w-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 shadow-inner">
                        <Users size={20} className="text-[#555]" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#888]">No group evaluation active</h3>
                      <p className="text-[11px] text-zinc-500 max-w-sm mt-2 leading-relaxed">
                        Add two or more characters to evaluate their roleplay group chat synergy.
                      </p>
                    </motion.div>
                  )}

                  {!isLoading && groupResult && (
                    <motion.div
                      key="grp-report"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="mt-6"
                    >
                      <div className="flex justify-end mb-4">
                        <ExportButtons data={groupResult} type="group" />
                      </div>
                      <GroupView data={groupResult} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : appMode === "multichar" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
              <div className="lg:col-span-4 space-y-4">
                <CardInput onAnalyze={handleMultiCharAnalyze} isLoading={isLoading} onNameExtracted={setExtractedName} supportsVisualAudit={false} moduleMode="multichar" />
              </div>

              {/* REPORT DISPLAY AREA */}
              <div className="lg:col-span-8">
                <AnimatePresence mode="wait">
                  {isLoading && (
                    <motion.div
                      key="mc-loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 border border-zinc-800 bg-[#0A0A0A] rounded-xl relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-[#00F0FF]/5 animate-pulse rounded-xl" />
                      <Cpu size={48} className="text-[#00F0FF] mb-6 drop-shadow-[0_0_15px_rgba(0,240,255,0.5)] animate-bounce" />
                      
                      <div className="w-full max-w-md bg-black border border-zinc-800 rounded p-4 font-mono text-[10px] space-y-2">
                        <div className="flex justify-between text-zinc-500 mb-2">
                          <span>[ ANALYSIS_THREAD_ACTIVE ]</span>
                          <span className="text-[#00F0FF] animate-pulse">EXECUTING</span>
                        </div>
                        <div className="h-px w-full bg-zinc-800 mb-2"></div>
                        <div className="space-y-1">
                          <div className="text-zinc-600 block">&gt; System Rules & World State ...</div>
                          <div className="text-purple-400 font-medium flex gap-2">
                            <span>&gt;&gt;</span>
                            <span className="truncate">{loadingMessages[loadingStep]}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!isLoading && !multiCharResult && (
                    <motion.div
                      key="mc-empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-20 text-center"
                    >
                      <div className="h-16 w-16 rounded-2xl bg-[#050505] border border-[#1A1A1A] flex items-center justify-center text-zinc-600 mb-4 shadow-inner">
                        <Globe size={24} className="text-[#555]" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#888]">No Multi-Char audit data</h3>
                      <p className="text-[11px] text-zinc-500 max-w-sm mt-3 leading-relaxed">
                        Awaiting input telemetry. Upload an RPG world, twin bot, or multi-character card to generate a detailed systemic evaluation.
                      </p>
                    </motion.div>
                  )}

                  {!isLoading && multiCharResult && (
                    <motion.div
                      key="mc-report"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="flex justify-end mb-2">
                        <ExportButtons data={multiCharResult} type="multichar" />
                      </div>
                      <MultiCharView data={multiCharResult} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : null}

        </main>
      </div>

      {/* Footer Bar */}
      <footer className="h-10 bg-black border-t border-[#1A1A1A] px-6 flex items-center justify-between text-[9px] font-mono text-[#444] uppercase tracking-widest mt-auto">
        <div className="flex gap-6">
          <span>SESSION_LORE_ACTIVE</span>
          <span>COMPILER_OPTIMIZATION: 100%</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[#333]">HARSH_BUT_FAIR_ENGINE_v4.2</span>
          <div className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full shadow-[0_0_8px_#00F0FF]"></div>
        </div>
      </footer>
    </div>
  );
}


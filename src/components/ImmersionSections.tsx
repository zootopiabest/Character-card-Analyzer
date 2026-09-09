import { AnalysisResult } from "../types";
import { Heart, ShoppingCart, Music, Skull, Brain, Drama, Coffee, Flame } from "lucide-react";

// Renders whichever optional immersion modules are present on a result.
// Every section is conditional, so a run with no modules renders nothing.
// Used by the single-audit view (App.tsx) and per-card in ComparisonView.

const REGISTER_STYLES: Array<{
  key: "sad" | "angry" | "happy" | "grief" | "comedy";
  label: string;
  dot: string;
  text: string;
}> = [
  { key: "sad", label: "SAD", dot: "bg-sky-400 shadow-[0_0_6px_#38BDF8]", text: "text-sky-400" },
  { key: "angry", label: "ANGRY", dot: "bg-rose-500 shadow-[0_0_6px_#F43F5E]", text: "text-rose-500" },
  { key: "happy", label: "HAPPY", dot: "bg-amber-400 shadow-[0_0_6px_#FBBF24]", text: "text-amber-400" },
  { key: "grief", label: "GRIEF", dot: "bg-indigo-400 shadow-[0_0_6px_#818CF8]", text: "text-indigo-400" },
  { key: "comedy", label: "COMEDY", dot: "bg-emerald-400 shadow-[0_0_6px_#34D399]", text: "text-emerald-400" },
];

export default function ImmersionSections({ data }: { data: AnalysisResult }) {
  const hasSongs = !!(data.topSongs && data.topSongs.length > 0);
  const hasList = !!(data.shoppingList && data.shoppingList.items && data.shoppingList.items.length > 0);
  const hasTuesday = !!(data.boringTuesday && (data.boringTuesday.inconvenience || data.boringTuesday.beat));
  const hasPiss = !!(data.pissThemOff && (data.pissThemOff.trivial || data.pissThemOff.personal || data.pissThemOff.denied));
  const hasAny =
    data.datingProfile || hasList || hasSongs || data.demise || data.psychoanalysis || data.emotionalRegisters || hasTuesday || hasPiss;
  if (!hasAny) return null;

  return (
    <div id="immersion-modules-output" className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DATING PROFILE */}
        {data.datingProfile && (
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-2">
            <span className="text-[10px] font-mono tracking-wider font-bold text-rose-400 uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
              <Heart size={12} className="text-rose-400" />
              IN-UNIVERSE DATING PROFILE // MATCHFEED_SIM
            </span>
            <p className="text-xs text-zinc-200 font-sans leading-relaxed bg-[#050505] p-3 rounded border border-[#1A1A1A] italic">
              &ldquo;{data.datingProfile}&rdquo;
            </p>
          </div>
        )}

        {/* AGAINST-TYPE SHOPPING LIST */}
        {hasList && (
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-2">
            <span className="text-[10px] font-mono tracking-wider font-bold text-[#FACC15] uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
              <ShoppingCart size={12} className="text-[#FACC15]" />
              AGAINST-TYPE SHOPPING LIST // OFF_ROUTINE_RUN
            </span>
            <ul className="space-y-1.5 bg-[#050505] p-3 rounded border border-[#1A1A1A]">
              {data.shoppingList!.items.map((item, i) => (
                <li key={i} className="text-[11px] font-mono text-zinc-300 leading-relaxed flex items-start gap-2">
                  <span className="text-[#FACC15] select-none">[{String(i + 1).padStart(2, "0")}]</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {data.shoppingList!.notes && (
              <p className="text-[10px] text-zinc-500 font-mono italic leading-relaxed pt-1">
                {data.shoppingList!.notes}
              </p>
            )}
          </div>
        )}
      </div>

      {/* TOP 5 ROTATION */}
      {hasSongs && (
        <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-3">
          <span className="text-[10px] font-mono tracking-wider font-bold text-purple-400 uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
            <Music size={12} className="text-purple-400" />
            TOP ROTATION // IN-UNIVERSE AUDIO FEED
          </span>
          <ol className="space-y-2">
            {data.topSongs!.map((song, i) => (
              <li key={i} className="flex items-start gap-3 bg-[#050505] p-2.5 rounded border border-[#1A1A1A]">
                <span className="text-lg font-black font-mono text-purple-400/60 select-none leading-none pt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] font-mono font-bold text-zinc-200 truncate">
                    {song.title} <span className="text-zinc-500 font-normal">— {song.artist}</span>
                  </span>
                  {song.vibe && (
                    <span className="text-[10px] text-zinc-500 font-sans italic leading-snug">{song.vibe}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DEMISE & OBITUARY */}
        {data.demise && (data.demise.howTheyDie || data.demise.obituary) && (
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-3">
            <span className="text-[10px] font-mono tracking-wider font-bold text-red-500 uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
              <Skull size={12} className="text-red-500" />
              PROJECTED DEMISE // TERMINAL EVENT
            </span>
            {data.demise.howTheyDie && (
              <p className="text-[11px] text-zinc-300 font-mono leading-relaxed bg-[#050505] p-3 rounded border border-[#1A1A1A]">
                {data.demise.howTheyDie}
              </p>
            )}
            {data.demise.obituary && (
              <div className="bg-[#0F0E0C] border border-[#2A2620] rounded p-3.5 space-y-1">
                <span className="text-[9px] font-serif tracking-[0.3em] text-[#8A8070] uppercase block text-center border-b border-[#2A2620] pb-1.5">
                  ✝ In Memoriam ✝
                </span>
                <p className="text-[11px] text-[#C7BFAE] font-serif italic leading-relaxed pt-1">
                  {data.demise.obituary}
                </p>
              </div>
            )}
          </div>
        )}

        {/* PSYCHOANALYSIS */}
        {data.psychoanalysis && (
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-2">
            <span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
              <Brain size={12} className="text-emerald-400" />
              COUCH SESSION // PSYCHOANALYSIS
            </span>
            <p className="text-[11px] font-mono text-zinc-300 leading-relaxed bg-[#050505] p-3 rounded border border-[#1A1A1A] italic">
              {data.psychoanalysis}
            </p>
          </div>
        )}
      </div>

      {/* EMOTIONAL REGISTERS */}
      {data.emotionalRegisters && (
        <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-3">
          <span className="text-[10px] font-mono tracking-wider font-bold text-[#00F0FF] uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
            <Drama size={12} className="text-[#00F0FF]" />
            EMOTIONAL REGISTER RESPONSES // STRESS MATRIX
          </span>
          <div className="space-y-2">
            {REGISTER_STYLES.map(({ key, label, dot, text }) => {
              const value = data.emotionalRegisters![key];
              if (!value) return null;
              return (
                <div key={key} className="flex items-start gap-3 bg-[#050505] p-2.5 rounded border border-[#1A1A1A]">
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${text} flex items-center gap-1.5 w-16 shrink-0 pt-0.5`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                    {label}
                  </span>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">{value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* THE BORING TUESDAY TEST */}
        {hasTuesday && (
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-2">
            <span className="text-[10px] font-mono tracking-wider font-bold text-amber-300 uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
              <Coffee size={12} className="text-amber-300" />
              THE BORING TUESDAY TEST // LOW-STAKES BEAT
            </span>
            {data.boringTuesday!.inconvenience && (
              <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
                <span className="text-amber-300/80 font-bold uppercase">Inconvenience: </span>
                {data.boringTuesday!.inconvenience}
              </p>
            )}
            {data.boringTuesday!.beat && (
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed bg-[#050505] p-3 rounded border border-[#1A1A1A] italic">
                {data.boringTuesday!.beat}
              </p>
            )}
          </div>
        )}

        {/* THREE WAYS TO PISS THEM OFF */}
        {hasPiss && (
          <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl p-5 space-y-2">
            <span className="text-[10px] font-mono tracking-wider font-bold text-orange-500 uppercase flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
              <Flame size={12} className="text-orange-500" />
              THREE WAYS TO PISS THEM OFF // TRIGGER MAP
            </span>
            <div className="space-y-2">
              {([
                ["trivial", "Trivial irritation"],
                ["personal", "Personal hurt"],
                ["denied", "Claims it doesn't bother them"],
              ] as const).map(([key, label]) => {
                const value = data.pissThemOff![key];
                if (!value) return null;
                return (
                  <div key={key} className="bg-[#050505] p-2.5 rounded border border-[#1A1A1A]">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-orange-500/80 block mb-0.5">{label}</span>
                    <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">{value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

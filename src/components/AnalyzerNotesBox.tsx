// The OOC / Analyzer Notes box shared by every input screen. Whatever is typed
// here is appended to the request as external context for the AI auditor
// (see analyzerNotesBlock in aiClient.ts); an empty box sends nothing.
interface AnalyzerNotesBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function AnalyzerNotesBox({
  value,
  onChange,
  placeholder = "e.g., 'The card is supposed to be overly verbose because it's a parody character...'",
}: AnalyzerNotesBoxProps) {
  return (
    <div className="border border-[#1A1A1A] bg-[#050505] rounded-lg overflow-hidden transition-all">
      <div className="p-3 bg-[#080808] border-b border-[#1A1A1A]">
        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-500">
          OOC / Analyzer Notes
        </span>
      </div>
      <div className="p-4 space-y-3">
        <span className="text-[9px] font-mono text-[#555] uppercase font-bold">
          External context specifically for the AI auditor (e.g., explaining a deliberate choice)
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-16 bg-[#0A0A0A] leading-relaxed font-mono text-xs p-3 rounded border border-[#1A1A1A] text-zinc-200 focus:outline-none focus:border-[#00F0FF] transition-all resize-y"
        />
      </div>
    </div>
  );
}

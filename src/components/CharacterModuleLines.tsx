// Compact per-character immersion-module rows, shared by the group and
// multi-char roster cards. Renders nothing when no module fields are present
// (i.e. the user ran with every module off).

export interface CharacterModuleFields {
  datingProfile?: string | null;
  shoppingList?: string | null;
  topSongs?: string | null;
  demise?: string | null;
  psychoanalysis?: string | null;
  emotionalRegisters?: string | null;
}

const LINES: Array<{ key: keyof CharacterModuleFields; label: string; color: string }> = [
  { key: "datingProfile", label: "Dating Profile", color: "text-rose-400" },
  { key: "shoppingList", label: "Against-Type Shopping", color: "text-[#FACC15]" },
  { key: "topSongs", label: "On Repeat", color: "text-purple-400" },
  { key: "demise", label: "Demise & Obituary", color: "text-red-500" },
  { key: "psychoanalysis", label: "Psychoanalysis", color: "text-emerald-400" },
  { key: "emotionalRegisters", label: "Emotional Registers", color: "text-[#00F0FF]" },
];

export default function CharacterModuleLines({ char }: { char: CharacterModuleFields }) {
  const present = LINES.filter(({ key }) => char[key]);
  if (present.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-[#1A1A1A] space-y-2">
      {present.map(({ key, label, color }) => (
        <div key={key}>
          <span className={`text-[9px] font-mono uppercase font-bold ${color}`}>{label}</span>
          <p className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5 italic">{char[key]}</p>
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";
import {
  AppModeId,
  ImmersionModuleId,
  IMMERSION_MODULES,
  DEFAULT_IMMERSION_MODULES,
  isImmersionModuleId,
} from "../immersionModules";

// The immersion-module picker shared by every input mode. Selections persist
// to localStorage per mode the moment they change (same pattern as
// ModelSettings), so a choice made once sticks across sessions.

export function useImmersionModules(mode: AppModeId) {
  const storageKey = `loresieve_immersion_modules_${mode}`;
  const [enabled, setEnabled] = useState<ImmersionModuleId[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(isImmersionModuleId);
      }
    } catch {
      // Corrupt storage entry — fall through to defaults.
    }
    return DEFAULT_IMMERSION_MODULES[mode];
  });

  const toggle = (id: ImmersionModuleId) => {
    setEnabled((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return { enabled, toggle };
}

export type ImmersionModulesState = ReturnType<typeof useImmersionModules>;

export default function ImmersionModulesPanel({ m }: { m: ImmersionModulesState }) {
  const [open, setOpen] = useState(false);

  return (
    <div id="immersion-modules-panel" className="border border-[#1A1A1A] bg-[#050505] rounded-lg p-4 space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex flex-wrap gap-3 items-center justify-between text-left"
      >
        <div className="flex flex-col">
          <span className="text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">
            Immersion Modules // Optional Extras
          </span>
          <span className="text-[9px] font-mono text-zinc-500 uppercase mt-0.5">
            Fewer modules = fewer tokens = faster, cheaper runs
          </span>
        </div>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-mono font-bold text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/30 px-2 py-0.5 rounded uppercase tracking-wider">
            {m.enabled.length} Active
          </span>
          <span className="text-[9px] font-mono border border-[#1A1A1A] px-1.5 py-0.5 rounded text-zinc-400 uppercase">
            {open ? "Close" : "Configure"}
          </span>
        </span>
      </button>

      {open && (
        <div className="space-y-1.5 pt-3 border-t border-[#1A1A1A] animate-fadeIn">
          {IMMERSION_MODULES.map((mod) => {
            const active = m.enabled.includes(mod.id);
            return (
              <label
                key={mod.id}
                className={`flex items-start gap-3 p-2.5 rounded border cursor-pointer transition-colors ${
                  active
                    ? "bg-[#0A0A0A] border-[#00F0FF]/40"
                    : "bg-[#050505] border-[#1A1A1A] hover:border-[#2A2A2A]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => m.toggle(mod.id)}
                  className="mt-0.5 rounded border-[#1A1A1A] bg-[#0A0A0A] text-[#00F0FF] focus:ring-[#00F0FF]/30"
                />
                <span className="flex flex-col gap-0.5">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${active ? "text-[#00F0FF]" : "text-zinc-400"}`}>
                    {mod.label}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 leading-relaxed">
                    {mod.blurb}
                  </span>
                </span>
              </label>
            );
          })}
          <p className="text-[9px] text-[#555] font-mono pt-1.5">
            These are non-scoring fun sections — they never change the card's grades. Selections are remembered per mode.
          </p>
        </div>
      )}
    </div>
  );
}

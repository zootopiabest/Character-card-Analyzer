import { useState } from "react";
import { OPENROUTER_MODELS } from "../data/models";

// The one shared Model & API Key settings panel, used by all three input
// modes (single audit, comparison, group). Every value persists to
// localStorage the moment it changes, so a key entered in one mode is
// instantly available in the others — even if the user never hits Run.

function usePersisted(key: string, fallback: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? fallback);
  const set = (v: string) => {
    setValue(v);
    localStorage.setItem(key, v);
  };
  return [value, set] as const;
}

export function useModelSettings() {
  const [provider, setProvider] = usePersisted("loresieve_selected_provider", "gemini");
  const [model, setModel] = usePersisted("loresieve_selected_model", "gemini-3.5-flash");
  const [apiKey, setApiKey] = usePersisted("loresieve_custom_api_key", "");
  const [baseUrl, setBaseUrl] = usePersisted("loresieve_custom_base_url", "");
  const [thinkingRaw, setThinkingRaw] = usePersisted("loresieve_thinking_mode", "false");
  const [reasoningEffort, setReasoningEffort] = usePersisted("loresieve_reasoning_effort", "medium");

  return {
    provider,
    setProvider,
    model,
    setModel,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    thinkingMode: thinkingRaw === "true",
    setThinkingMode: (v: boolean) => setThinkingRaw(v ? "true" : "false"),
    reasoningEffort,
    setReasoningEffort,
  };
}

export type ModelSettings = ReturnType<typeof useModelSettings>;

const PROVIDERS = [
  { id: "gemini", label: "Google Gemini", defaultModel: "gemini-3.5-flash" },
  { id: "openrouter", label: "OpenRouter", defaultModel: OPENROUTER_MODELS[0] },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-5.5" },
  { id: "custom", label: "Custom", defaultModel: "" },
];

export default function ModelSettingsPanel({ s }: { s: ModelSettings }) {
  const [open, setOpen] = useState(() => localStorage.getItem("loresieve_use_custom") !== "false");
  const [isManualModel, setIsManualModel] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const toggleOpen = (v: boolean) => {
    setOpen(v);
    localStorage.setItem("loresieve_use_custom", v ? "true" : "false");
  };

  const keyLabel =
    s.provider === "openrouter" ? "OpenRouter API Key"
    : s.provider === "openai" ? "OpenAI API Key"
    : s.provider === "custom" ? "API Key"
    : "Gemini API Key";

  const keyPlaceholder =
    s.provider === "openrouter" ? "sk-or-v1-..."
    : s.provider === "openai" ? "sk-proj-..."
    : s.provider === "custom" ? "sk-..."
    : "AIzaSy...";

  return (
    <div id="model-settings-panel" className="border border-[#1A1A1A] bg-[#050505] rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">
            Model & API Key Settings
          </span>
          <span className="text-[9px] font-mono text-zinc-500 uppercase mt-0.5">
            BRING_YOUR_OWN_MODEL_AND_KEY // TOGGLE TO SHOW/HIDE
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={open}
            onChange={(e) => toggleOpen(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-[#1A1A1A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-600 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00F0FF]/30 peer-checked:after:bg-[#00F0FF] peer-checked:after:border-transparent"></div>
        </label>
      </div>

      {open && (
        <div className="space-y-4 pt-2 border-t border-[#1A1A1A] animate-fadeIn">
          {/* Provider selector */}
          <div className="space-y-1.5 pb-2 border-b border-[#1A1A1A]">
            <label className="block text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">
              Select Provider Corridor
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    s.setProvider(p.id);
                    s.setModel(p.defaultModel);
                  }}
                  className={`py-1.5 px-2.5 rounded text-[10px] font-mono text-center font-bold tracking-wider uppercase border transition-colors ${
                    s.provider === p.id
                      ? "bg-[#0A0A0A] border-[#00F0FF] text-white"
                      : "bg-[#050505] border-[#1A1A1A] text-zinc-500 hover:text-zinc-300 hover:bg-[#0A0A0A]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* API Key input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
              <label className="uppercase font-bold text-[#555]">{keyLabel}</label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="hover:text-[#00F0FF] transition-colors focus:outline-none uppercase text-[8px]"
              >
                {showKey ? "Hide key" : "Show key"}
              </button>
            </div>
            <input
              type={showKey ? "text" : "password"}
              value={s.apiKey}
              onChange={(e) => s.setApiKey(e.target.value)}
              placeholder={keyPlaceholder}
              className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded p-2 text-xs font-mono text-[#00F0FF] placeholder-zinc-700 focus:outline-none focus:border-[#00F0FF]/60"
            />
            <span className="text-[9px] leading-snug text-zinc-500 font-mono block">
              {s.provider === "custom" ? (
                "Your key is saved on this device and sent directly to the custom endpoint. It persists until you clear it or your browser data."
              ) : (
                <>
                  Your key is saved on this device and sent directly to{" "}
                  {s.provider === "openrouter" ? "OpenRouter" : s.provider === "openai" ? "OpenAI" : "Google"}; it never
                  passes through any server of ours. Get credentials at{" "}
                  <a
                    href={
                      s.provider === "openrouter"
                        ? "https://openrouter.ai/keys"
                        : s.provider === "openai"
                        ? "https://platform.openai.com/api-keys"
                        : "https://aistudio.google.com/"
                    }
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[#00F0FF] hover:underline"
                  >
                    {s.provider === "openrouter" ? "OpenRouter" : s.provider === "openai" ? "OpenAI Platform" : "Google AI Studio"}
                  </a>.
                </>
              )}
            </span>
          </div>

          {/* Base URL (custom endpoints only) */}
          {s.provider === "custom" && (
            <div className="space-y-1.5 pt-2">
              <label className="block text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">
                Base URL
              </label>
              <input
                type="text"
                value={s.baseUrl}
                onChange={(e) => s.setBaseUrl(e.target.value)}
                placeholder="e.g. http://localhost:11434/v1"
                className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded p-2 text-xs font-mono text-[#00F0FF] placeholder-zinc-700 focus:outline-none focus:border-[#00F0FF]/60"
              />
            </div>
          )}

          {/* Model selection */}
          {s.provider === "gemini" ? (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">
                Model Selection Protocol
              </label>
              <div className="relative">
                <select
                  value={s.model}
                  onChange={(e) => s.setModel(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded p-2 text-xs font-mono text-zinc-200 appearance-none focus:outline-none focus:border-[#00F0FF]/60 cursor-pointer"
                >
                  <option value="gemini-3.5-flash">gemini-3.5-flash // Balanced and Ultra-Fast (Default)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro // Analytical Logic reasoning</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-500 font-mono text-xs">
                  ▼
                </div>
              </div>
            </div>
          ) : s.provider === "openrouter" ? (
            <div className="space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">
                  Active LLM Model String
                </label>
                <label className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isManualModel}
                    onChange={(e) => setIsManualModel(e.target.checked)}
                    className="rounded border-[#1A1A1A] bg-[#0A0A0A] text-[#00F0FF] focus:ring-[#00F0FF]/30"
                  />
                  ENTER MANUALLY
                </label>
              </div>

              {isManualModel ? (
                <input
                  type="text"
                  value={s.model}
                  onChange={(e) => s.setModel(e.target.value)}
                  placeholder="e.g. gryphe/mythomax-l2-13b"
                  className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded p-2 text-xs font-mono text-[#00F0FF] placeholder-zinc-700 focus:outline-none focus:border-[#00F0FF]/60"
                />
              ) : (
                <div className="relative">
                  <select
                    value={s.model}
                    onChange={(e) => s.setModel(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded p-2 text-xs font-mono text-zinc-200 appearance-none focus:outline-none focus:border-[#00F0FF]/60 cursor-pointer"
                  >
                    {OPENROUTER_MODELS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-500 font-mono text-xs">
                    ▼
                  </div>
                </div>
              )}
              <span className="text-[9px] leading-snug text-zinc-500 font-mono block">
                Pick a model from the list, or check ENTER MANUALLY to type any OpenRouter model ID.
              </span>
            </div>
          ) : (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">
                Active LLM Model String
              </label>
              <input
                type="text"
                value={s.model}
                onChange={(e) => s.setModel(e.target.value)}
                placeholder={s.provider === "openai" ? "e.g. gpt-5.5" : "e.g. meta-llama/Llama-3-8b"}
                className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded p-2 text-xs font-mono text-[#00F0FF] placeholder-zinc-700 focus:outline-none focus:border-[#00F0FF]/60"
              />
              <span className="text-[9px] leading-snug text-zinc-500 font-mono block">
                Type the exact model ID from {s.provider === "openai" ? "OpenAI" : "your custom endpoint"}.
              </span>
            </div>
          )}

          {/* Reasoning / Thinking Mode */}
          <div className="space-y-3 pt-3 border-t border-[#1A1A1A]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full inline-block animate-pulse"></span>
                Reasoning / Thinking Mode
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={s.thinkingMode}
                  onChange={(e) => s.setThinkingMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#1A1A1A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-600 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00F0FF]/30 peer-checked:after:bg-[#00F0FF] peer-checked:after:border-transparent"></div>
              </label>
            </div>

            {s.thinkingMode && (
              <div className="space-y-1.5 pt-2 border-t border-[#1A1A1A]/50 animate-fadeIn">
                <label className="block text-[9px] font-mono font-bold tracking-widest text-[#444] uppercase mb-1.5 ml-0.5">
                  Effort Level
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["low", "medium", "high"].map((level) => (
                    <button
                      type="button"
                      key={level}
                      onClick={() => s.setReasoningEffort(level)}
                      className={`py-1.5 px-2.5 rounded text-[10px] font-mono text-center font-bold tracking-wider uppercase border transition-all ${
                        s.reasoningEffort === level
                          ? "bg-[#00F0FF]/10 border-[#00F0FF] text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                          : "bg-[#050505] border-[#1A1A1A] text-zinc-600 hover:text-zinc-400 hover:bg-[#0A0A0A] hover:border-zinc-800"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-[#555] font-mono mt-2 ml-0.5">
                  Allocates more tokens to the model's scratchpad before answering.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

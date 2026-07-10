import mammoth from 'mammoth';
import React, { useState, useRef } from "react";
import { Upload, CheckCircle2, RotateCcw, ArrowRightLeft } from "lucide-react";
import { OPENROUTER_MODELS } from "../data/models";

interface ComparisonInputProps {
  onCompare: (
    originalDescription: string,
    remakeDescription: string,
    originalImageBase64: string | null,
    originalImageMimeType: string | null,
    remakeImageBase64: string | null,
    remakeImageMimeType: string | null,
    customApiKey: string | null,
    selectedModel: string | null,
    provider: string,
    customBaseUrl: string | null,
    thinkingMode?: boolean,
    reasoningEffort?: string
  ) => void;
  isLoading: boolean;
}

import { buildDescriptionFromJson, decodeBase64UTF8, tryExtractCharaMetadata } from "../utils";

export default function ComparisonInput({ onCompare, isLoading }: ComparisonInputProps) {
  // Original states
  const [origDesc, setOrigDesc] = useState("");
  const [origImgPreview, setOrigImgPreview] = useState<string | null>(null);
  const [origImgBase64, setOrigImgBase64] = useState<string | null>(null);
  const [origImgMimeType, setOrigImgMimeType] = useState<string | null>(null);
  const [origFileName, setOrigFileName] = useState<string | null>(null);
  const [origExtractedName, setOrigExtractedName] = useState<string | null>(null);
  const [origManualOpen, setOrigManualOpen] = useState(false);
  const [origIsDragging, setOrigIsDragging] = useState(false);

  // Remake states
  const [remakeDesc, setRemakeDesc] = useState("");
  const [remakeImgPreview, setRemakeImgPreview] = useState<string | null>(null);
  const [remakeImgBase64, setRemakeImgBase64] = useState<string | null>(null);
  const [remakeImgMimeType, setRemakeImgMimeType] = useState<string | null>(null);
  const [remakeFileName, setRemakeFileName] = useState<string | null>(null);
  const [remakeExtractedName, setRemakeExtractedName] = useState<string | null>(null);
  const [remakeManualOpen, setRemakeManualOpen] = useState(false);
  const [remakeIsDragging, setRemakeIsDragging] = useState(false);

  // Custom configuration states
  
const [useCustomSettings, setUseCustomSettings] = useState<boolean>(() => {
    return localStorage.getItem("loresieve_use_custom") !== "false";
  });
  const [thinkingMode, setThinkingMode] = useState<boolean>(() => {
    return localStorage.getItem("loresieve_thinking_mode") === "true";
  });
  const [reasoningEffort, setReasoningEffort] = useState<string>(() => {
    return localStorage.getItem("loresieve_reasoning_effort") || "medium";
  });

  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    return localStorage.getItem("loresieve_selected_provider") || "gemini";
  });
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem("loresieve_custom_api_key") || "";
  });
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(() => {
    return localStorage.getItem("loresieve_custom_base_url") || "";
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem("loresieve_selected_model") || "gemini-3.5-flash";
  });
  const [isManualModel, setIsManualModel] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const origInputRef = useRef<HTMLInputElement>(null);
  const remakeInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File, isOriginal: boolean) => {
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("File size exceeds 15MB limit.");
      return;
    }

    const setFileName = isOriginal ? setOrigFileName : setRemakeFileName;
    const setImgPreview = isOriginal ? setOrigImgPreview : setRemakeImgPreview;
    const setImgBase64 = isOriginal ? setOrigImgBase64 : setRemakeImgBase64;
    const setImgMimeType = isOriginal ? setOrigImgMimeType : setRemakeImgMimeType;
    const setExtractedName = isOriginal ? setOrigExtractedName : setRemakeExtractedName;
    const setDesc = isOriginal ? setOrigDesc : setRemakeDesc;

    setFileName(file.name);

    if (file.type === "application/json" || file.name.toLowerCase().endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const data = JSON.parse(result);
          const extracted = buildDescriptionFromJson(data);
          if (extracted) {
            setExtractedName(extracted.name || (isOriginal ? "Original Character" : "Remade Character"));
            if (extracted.description) {
              setDesc(extracted.description);
            }
          }
        } catch (error) {
          alert("Failed to parse JSON file.");
        }
      };
      reader.readAsText(file);
    
    } else if (file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md") || file.name.toLowerCase().endsWith(".rtf") || file.type === "text/plain" || file.type === "text/markdown") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setDesc(text);
      };
      reader.readAsText(file);
    } else if (file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc")) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          setDesc(result.value);
        } catch (error) {
          alert("Failed to read document.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Read image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImgPreview(result);
        const commaIndex = result.indexOf(",");
        if (commaIndex !== -1) {
          setImgBase64(result.substring(commaIndex + 1));
          const mimeTypeMatch = result.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
          if (mimeTypeMatch) {
            setImgMimeType(mimeTypeMatch[1]);
          }
        }
      };
      reader.readAsDataURL(file);

      // Extract Tavern metadata if PNG
      if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
        const bufferReader = new FileReader();
        bufferReader.onload = (e) => {
          if (e.target?.result) {
            const buffer = e.target.result as ArrayBuffer;
            const extracted = tryExtractCharaMetadata(buffer);
            if (extracted) {
              setExtractedName(extracted.name || (isOriginal ? "Original Character" : "Remade Character"));
              if (extracted.description) {
                setDesc(extracted.description);
              }
            }
          }
        };
        bufferReader.readAsArrayBuffer(file);
      }
    }
  };

  const origReset = () => {
    setOrigImgPreview(null);
    setOrigImgBase64(null);
    setOrigImgMimeType(null);
    setOrigFileName(null);
    setOrigExtractedName(null);
    setOrigDesc("");
    if (origInputRef.current) origInputRef.current.value = "";
  };

  const remakeReset = () => {
    setRemakeImgPreview(null);
    setRemakeImgBase64(null);
    setRemakeImgMimeType(null);
    setRemakeFileName(null);
    setRemakeExtractedName(null);
    setRemakeDesc("");
    if (remakeInputRef.current) remakeInputRef.current.value = "";
  };

  const handleOrigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, true);
  };

  const handleRemakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origDesc.trim() || !remakeDesc.trim()) {
      alert("Please provide descriptions/cards for BOTH the original and the remake character.");
      return;
    }

    localStorage.setItem("loresieve_use_custom", useCustomSettings ? "true" : "false");
    localStorage.setItem("loresieve_selected_provider", selectedProvider);
    localStorage.setItem("loresieve_custom_api_key", customApiKey);
    localStorage.setItem("loresieve_thinking_mode", thinkingMode ? "true" : "false");
    localStorage.setItem("loresieve_reasoning_effort", reasoningEffort);
    localStorage.setItem("loresieve_custom_base_url", customBaseUrl);
    localStorage.setItem("loresieve_selected_model", selectedModel);

    // BYOK: always pass the entered key/model/provider; the panel only shows/hides
    // these fields and must never null the key (no server fallback exists).
    onCompare(
      origDesc,
      remakeDesc,
      origImgBase64,
      origImgMimeType,
      remakeImgBase64,
      remakeImgMimeType,
      customApiKey,
      selectedModel,
      selectedProvider,
      customBaseUrl, thinkingMode, reasoningEffort);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* COLUMN 1: ORIGINAL CARD */}
        <div className="border border-[#1E1E1E] bg-[#080808] p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-2">
            <span className="text-[10px] font-mono tracking-widest font-bold text-red-500 uppercase flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              [01] ORIGINAL VERSION
            </span>
            {origExtractedName && (
              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                {origExtractedName}
              </span>
            )}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setOrigIsDragging(true); }}
            onDragLeave={() => setOrigIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOrigIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processFile(file, true);
            }}
            onClick={() => origInputRef.current?.click()}
            className={`relative rounded-lg border border-dashed text-center min-h-[140px] flex flex-col items-center justify-center p-4 cursor-pointer transition-all ${
              origIsDragging
                ? "border-red-500 bg-red-500/5"
                : origImgPreview
                ? "border-red-500/40 bg-[#0A0A0A]"
                : "border-[#222] bg-[#0A0A0A] hover:border-red-500/30"
            }`}
          >
            <input
              ref={origInputRef}
              type="file"
              accept="image/*,application/json,.json,.txt,.md,.rtf,.docx,.doc"
              className="hidden"
              onChange={handleOrigChange}
            />

            {origImgPreview ? (
              <div className="space-y-2 py-1 flex flex-col items-center">
                <img
                  src={origImgPreview}
                  alt="Original Avatar"
                  className="w-14 h-14 object-cover rounded-md border border-red-500/40 shadow-md"
                  referrerPolicy="no-referrer"
                />
                <div className="text-center">
                  <span className="text-[10px] font-mono text-zinc-400 block max-w-[180px] truncate">
                    {origFileName}
                  </span>
                  {origExtractedName ? (
                    <span className="text-[9px] font-mono text-emerald-400 block font-bold uppercase tracking-wider mt-0.5">
                      Tavern Tag Loaded Successfully
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-zinc-500 block font-bold uppercase tracking-wider mt-0.5">
                      Image attached — no embedded card data found
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1 py-3 text-center">
                <Upload size={20} className="text-zinc-600 mx-auto" />
                <p className="text-[10px] font-mono text-zinc-400">
                  Drag & Drop <span className="text-red-500 font-bold">Original PNG</span> card
                </p>
                <p className="text-[8px] font-mono text-zinc-600">
                  Or click to open file browser (PNG embedded chunks supported)
                </p>
              </div>
            )}
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setOrigManualOpen(!origManualOpen)}
              className="text-[10px] font-mono text-zinc-500 hover:text-white underline transition"
            >
              {origManualOpen ? "Hide Manual String Editor" : "Open Manual String Editor / Copy-Paste"}
            </button>
          </div>

          {(origManualOpen || !origDesc) && (
            <textarea
              value={origDesc}
              onChange={(e) => setOrigDesc(e.target.value)}
              placeholder="Paste original character prompt description here if you didn't upload a metadata-configured PNG or JSON file..."
              rows={5}
              className="w-full text-[11px] font-mono bg-black text-zinc-300 p-3 rounded-lg border border-[#222] focus:border-red-500 focus:outline-none placeholder-zinc-700 resize-y"
            />
          )}

          {origDesc && (
            <div className="flex items-center justify-between bg-[#0F0F0F] p-2.5 rounded-lg border border-[#1E1E1E]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span className="text-[10px] font-mono font-bold text-zinc-400">Original Prompt: Packed & Ready</span>
              </div>
              <button
                type="button"
                onClick={origReset}
                className="text-zinc-600 hover:text-zinc-300 transition"
                title="Reset Original Card"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}
        </div>

        {/* COLUMN 2: REMAKE CARD */}
        <div className="border border-[#1E1E1E] bg-[#080808] p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-2">
            <span className="text-[10px] font-mono tracking-widest font-bold text-cyan-400 uppercase flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              [02] REMAKE VERSION
            </span>
            {remakeExtractedName && (
              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                {remakeExtractedName}
              </span>
            )}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setRemakeIsDragging(true); }}
            onDragLeave={() => setRemakeIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setRemakeIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processFile(file, false);
            }}
            onClick={() => remakeInputRef.current?.click()}
            className={`relative rounded-lg border border-dashed text-center min-h-[140px] flex flex-col items-center justify-center p-4 cursor-pointer transition-all ${
              remakeIsDragging
                ? "border-cyan-400 bg-cyan-400/5"
                : remakeImgPreview
                ? "border-cyan-400/40 bg-[#0A0A0A]"
                : "border-[#222] bg-[#0A0A0A] hover:border-cyan-400/30"
            }`}
          >
            <input
              ref={remakeInputRef}
              type="file"
              accept="image/*,application/json,.json,.txt,.md,.rtf,.docx,.doc"
              className="hidden"
              onChange={handleRemakeChange}
            />

            {remakeImgPreview ? (
              <div className="space-y-2 py-1 flex flex-col items-center">
                <img
                  src={remakeImgPreview}
                  alt="Remake Avatar"
                  className="w-14 h-14 object-cover rounded-md border border-cyan-400/40 shadow-md"
                  referrerPolicy="no-referrer"
                />
                <div className="text-center">
                  <span className="text-[10px] font-mono text-zinc-400 block max-w-[180px] truncate">
                    {remakeFileName}
                  </span>
                  {remakeExtractedName ? (
                    <span className="text-[9px] font-mono text-emerald-400 block font-bold uppercase tracking-wider mt-0.5">
                      Tavern Tag Loaded Successfully
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-zinc-500 block font-bold uppercase tracking-wider mt-0.5">
                      Image attached — no embedded card data found
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1 py-3 text-center">
                <Upload size={20} className="text-zinc-600 mx-auto" />
                <p className="text-[10px] font-mono text-zinc-400">
                  Drag & Drop <span className="text-cyan-400 font-bold">Remake PNG</span> card
                </p>
                <p className="text-[8px] font-mono text-zinc-600">
                  Or click to open file browser (PNG embedded chunks supported)
                </p>
              </div>
            )}
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setRemakeManualOpen(!remakeManualOpen)}
              className="text-[10px] font-mono text-zinc-500 hover:text-white underline transition"
            >
              {remakeManualOpen ? "Hide Manual String Editor" : "Open Manual String Editor / Copy-Paste"}
            </button>
          </div>

          {(remakeManualOpen || !remakeDesc) && (
            <textarea
              value={remakeDesc}
              onChange={(e) => setRemakeDesc(e.target.value)}
              placeholder="Paste remake character prompt description here if you didn't upload a metadata-configured PNG or JSON file..."
              rows={5}
              className="w-full text-[11px] font-mono bg-black text-zinc-300 p-3 rounded-lg border border-[#222] focus:border-cyan-400 focus:outline-none placeholder-zinc-700 resize-y"
            />
          )}

          {remakeDesc && (
            <div className="flex items-center justify-between bg-[#0F0F0F] p-2.5 rounded-lg border border-[#1E1E1E]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span className="text-[10px] font-mono font-bold text-zinc-400">Remake Prompt: Packed & Ready</span>
              </div>
              <button
                type="button"
                onClick={remakeReset}
                className="text-zinc-600 hover:text-zinc-300 transition"
                title="Reset Remake Card"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* CUSTOM OVERRIDE OPTIONS (Collapsible) */}
      <div className="border border-[#1E1E1E] bg-[#0A0A0A] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="custom-override-chk"
              checked={useCustomSettings}
              onChange={(e) => setUseCustomSettings(e.target.checked)}
              className="rounded border-[#333] bg-black text-[#00F0FF] focus:ring-0 w-3.5 h-3.5 accent-[#00F0FF]"
            />
            <label htmlFor="custom-override-chk" className="text-[10px] font-mono font-bold text-zinc-300 cursor-pointer uppercase tracking-wider">
              Activate Custom Runner Overrides (API keys, provider or alternative models)
            </label>
          </div>
        </div>

        {useCustomSettings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#1E1E1E] animate-fadeIn">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[9px] font-mono text-[#555] uppercase block font-bold">Provider</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "gemini", label: "Gemini", model: "gemini-3.5-flash" },
                  { id: "openrouter", label: "OpenRouter", model: OPENROUTER_MODELS[0] },
                  { id: "openai", label: "OpenAI", model: "" },
                  { id: "custom", label: "Custom", model: "" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(p.id);
                      setSelectedModel(p.model);
                    }}
                    className={`py-1.5 px-2 rounded text-[9px] font-mono text-center font-bold tracking-wider uppercase border transition-colors ${
                      selectedProvider === p.id
                        ? "bg-[#0A0A0A] border-[#00F0FF] text-white"
                        : "bg-black border-[#222] text-zinc-500 hover:text-zinc-300 hover:bg-[#0A0A0A]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
              <label className="text-[9px] font-mono text-[#555] uppercase block font-bold">Active LLM Model</label>
              {selectedProvider !== "gemini" && (
                <label className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400 cursor-pointer">
                  <input type="checkbox" checked={isManualModel} onChange={(e) => setIsManualModel(e.target.checked)} className="rounded border-[#222] bg-black text-[#00F0FF] focus:ring-0" />
                  ENTER MANUALLY
                </label>
              )}
            </div>
            {selectedProvider !== "gemini" ? (
              isManualModel || selectedProvider === "custom" ? (
                <input
                  type="text"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  placeholder={selectedProvider === "openai" ? "e.g. gpt-5.5" : selectedProvider === "custom" ? "e.g. meta-llama/Llama-3-8b" : "e.g. anthropic/claude-3.5-sonnet"}
                  className="w-full text-xs font-mono bg-black border border-[#222] p-2 rounded text-zinc-300 focus:outline-none"
                />
              ) : (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full text-xs font-mono bg-black border border-[#222] p-2 rounded text-zinc-300 focus:outline-none cursor-pointer"
                >
                  {OPENROUTER_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )
            ) : (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full text-xs font-mono bg-black border border-[#222] p-2 rounded text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="gemini-3.5-flash">gemini-3.5-flash // Balanced and Ultra-Fast</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro // Analytical Logic</option>
              </select>
            )}
          </div>

          <div className={`col-span-1 ${selectedProvider === "custom" ? "md:col-span-1" : "md:col-span-2"} space-y-1.5`}>
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-mono text-[#555] uppercase block font-bold">
                  {selectedProvider === "custom" ? "API Key" : "Secret Credentials / API Authorization Token"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300"
                >
                  {showKey ? "MASK_CREDENTIAL" : "UNMASK_CREDENTIAL"}
                </button>
              </div>
              <input
                type={showKey ? "text" : "password"}
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder={selectedProvider === "openrouter" ? "OpenRouter sk-or-... api key" : selectedProvider === "openai" ? "OpenAI sk-proj-... api key" : selectedProvider === "custom" ? "sk-..." : "AI Studio GEMINI_API_KEY"}
                className="w-full text-xs font-mono bg-black border border-[#222] p-2 rounded text-[#00F0FF] placeholder-zinc-700 focus:outline-none"
              />
            </div>
            {selectedProvider === "custom" && (
              <div className="space-y-1.5 col-span-1 md:col-span-1">
                <label className="text-[9px] font-mono text-[#555] uppercase block font-bold">Base URL</label>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="e.g. http://localhost:11434/v1"
                  className="w-full text-xs font-mono bg-black border border-[#222] p-2 rounded text-[#00F0FF] placeholder-zinc-700 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* TRIGGER ACTION */}
      <button
        type="submit"
        disabled={isLoading || !origDesc.trim() || !remakeDesc.trim()}
        className={`w-full py-3.5 rounded-lg font-mono font-bold tracking-widest text-xs uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
          isLoading
            ? "bg-[#111] text-[#333] border border-[#222] cursor-not-allowed"
            : !origDesc.trim() || !remakeDesc.trim()
            ? "bg-[#0A0A0A] text-zinc-600 border border-[#1A1A1A] cursor-not-allowed"
            : "bg-gradient-to-r from-red-600 via-[#00F0FF] to-cyan-500 text-black hover:brightness-110 active:scale-[0.985] hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]"
        }`}
      >
        <ArrowRightLeft size={14} className={isLoading ? "" : "animate-pulse"} />
        {isLoading ? "Running Comparative Character Analysis..." : "Initiate Design Combat Comparison"}
      </button>
    </form>
  );
}

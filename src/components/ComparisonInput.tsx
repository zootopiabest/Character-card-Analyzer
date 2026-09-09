import React, { useState, useRef } from "react";
import { Upload, CheckCircle2, RotateCcw, ArrowRightLeft } from "lucide-react";
import { readCardFile } from "../utils";
import ModelSettingsPanel, { useModelSettings } from "./ModelSettings";
import ImmersionModulesPanel, { useImmersionModules } from "./ImmersionModulesPanel";
import { ImmersionModuleId } from "../immersionModules";

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
    reasoningEffort?: string,
    modules?: ImmersionModuleId[],
    maxOutputTokens?: number,
    efficientGrading?: boolean
  ) => void;
  isLoading: boolean;
}

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

  // Shared provider/model/key/thinking settings (persisted as they change).
  const settings = useModelSettings();
  // Optional immersion-module selection (all off by default in comparison
  // mode, since every module is produced twice — once per card).
  const immersion = useImmersionModules("comparison");

  const origInputRef = useRef<HTMLInputElement>(null);
  const remakeInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File, isOriginal: boolean) => {
    const setFileName = isOriginal ? setOrigFileName : setRemakeFileName;
    const setImgPreview = isOriginal ? setOrigImgPreview : setRemakeImgPreview;
    const setImgBase64 = isOriginal ? setOrigImgBase64 : setRemakeImgBase64;
    const setImgMimeType = isOriginal ? setOrigImgMimeType : setRemakeImgMimeType;
    const setExtractedName = isOriginal ? setOrigExtractedName : setRemakeExtractedName;
    const setDesc = isOriginal ? setOrigDesc : setRemakeDesc;

    setFileName(file.name);

    readCardFile(file, {
      onText: ({ text, name, source }) => {
        setDesc(text);
        if (source !== "png-embedded") {
          setImgPreview(null);
          setImgBase64(null);
          setImgMimeType(null);
          setExtractedName(name || null);
        }
        if (source === "json" || source === "png-embedded") {
          setExtractedName(name || (isOriginal ? "Original Character" : "Remade Character"));
        }
      },
      onImage: ({ dataUrl, base64, mimeType }) => {
        setImgPreview(dataUrl);
        setImgBase64(base64);
        setImgMimeType(mimeType);
      },
      onError: (msg) => alert(msg),
    });
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

    // BYOK: always pass the entered key/model/provider; the panel only shows/hides
    // these fields and must never null the key (no server fallback exists).
    onCompare(
      origDesc,
      remakeDesc,
      origImgBase64,
      origImgMimeType,
      remakeImgBase64,
      remakeImgMimeType,
      settings.apiKey,
      settings.model,
      settings.provider,
      settings.baseUrl,
      settings.thinkingMode,
      settings.reasoningEffort,
      immersion.enabled,
      settings.outputLimit,
      settings.efficientGrading
    );
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

      {/* Optional immersion modules (produced for both cards, so off by default) */}
      <ImmersionModulesPanel m={immersion} />

      {/* Shared Model & API Key settings (provider, model, key, thinking mode) */}
      <ModelSettingsPanel s={settings} />

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

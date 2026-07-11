import React, { useState, useRef } from "react";
import { Upload, Sparkles, CheckCircle2, RotateCcw } from "lucide-react";
import { readCardFile } from "../utils";
import { PRESET_CHARACTERS } from "../data/examples";
import ModelSettingsPanel, { useModelSettings } from "./ModelSettings";

interface CardInputProps {
  onAnalyze: (
    description: string,
    imageBase64: string | null,
    imageMimeType: string | null,
    customApiKey: string | null,
    selectedModel: string | null,
    provider: string,
    customBaseUrl: string | null,
    analyzerNotes?: string | null,
    thinkingMode?: boolean,
    reasoningEffort?: string
  ) => void;
  isLoading: boolean;
  onNameExtracted?: (name: string | null) => void;
  // Multi-char mode reuses this panel but doesn't send the image to the AI,
  // so it passes false to keep the upload copy honest.
  supportsVisualAudit?: boolean;
}

export default function CardInput({ onAnalyze, isLoading, onNameExtracted, supportsVisualAudit = true }: CardInputProps) {
  const [description, setDescription] = useState("");
  const [analyzerNotes, setAnalyzerNotes] = useState("");

  // Image states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  // Extracted tag notifications
  const [extractedName, setExtractedName] = useState<string | null>(null);
  const [showExtractedBanner, setShowExtractedBanner] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Collapsible display toggle (hidden/closed by default so nobody has to read the card content)
  const [showBlueprintTextarea, setShowBlueprintTextarea] = useState(false);

  // Shared provider/model/key/thinking settings (persisted as they change).
  const settings = useModelSettings();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearImageState = () => {
    setImageBase64(null);
    setImagePreview(null);
    setImageMimeType(null);
  };

  const processFile = (file: File) => {
    setImageFileName(file.name);
    readCardFile(file, {
      onText: ({ text, name, source }) => {
        setDescription(text);
        if (source === "json" || source === "png-embedded") {
          // JSON cards carry no image; embedded PNG cards keep their own art.
          if (source === "json") clearImageState();
          const extractedNameVal =
            name || (source === "json" ? "JSON Character" : "Embedded Tavern Character");
          setExtractedName(extractedNameVal);
          onNameExtracted?.(extractedNameVal);
          setShowExtractedBanner(true);
        } else {
          // Plain text / document uploads replace everything.
          clearImageState();
          setExtractedName(null);
          setShowExtractedBanner(false);
        }
      },
      onImage: ({ dataUrl, base64, mimeType }) => {
        setImagePreview(dataUrl);
        setImageBase64(base64);
        setImageMimeType(mimeType);
      },
      onError: (msg) => alert(msg),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleResetImage = () => {
    clearImageState();
    setImageFileName(null);
    setShowExtractedBanner(false);
    setExtractedName(null);
    onNameExtracted?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    // BYOK: always pass the entered key/model/provider. The settings panel only
    // shows/hides these fields; it must never null out the key (that would make
    // the app unrunnable, since there is no server fallback).
    onAnalyze(
      description,
      imageBase64,
      imageMimeType,
      settings.apiKey,
      settings.model,
      settings.provider,
      settings.baseUrl,
      analyzerNotes.trim() ? analyzerNotes : null,
      settings.thinkingMode,
      settings.reasoningEffort
    );
  };

  return (
    <div id="card-input-container" className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Dropzone Panel */}
        <div>
          <label className="block text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase mb-2">
            Character Poster Art / Card PNG / JSON (Optional)
          </label>

          <div
            id="drag-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-lg border border-dashed text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[#00F0FF] bg-[#00F0FF]/5"
                : imagePreview
                ? "border-[#00F0FF]/40 bg-[#0F0F0F]"
                : "border-[#1A1A1A] bg-[#0F0F0F] hover:border-[#2A2A2A]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/json,.json,.txt,.md,.rtf,.docx,.doc"
              className="hidden"
              onChange={handleFileChange}
            />

            {imagePreview ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 text-left p-2">
                <div className="relative h-20 w-20 flex-shrink-0 bg-black rounded overflow-hidden border border-[#1A1A1A]">
                  <img
                    src={imagePreview}
                    alt="Character profile blueprint preview"
                    className="h-full w-full object-cover animate-pulse"
                  />
                </div>
                <div className="flex-grow space-y-1 overflow-hidden">
                  <div className="flex items-center gap-1.5 text-[#00F0FF] text-[10px] font-mono font-bold uppercase">
                    <CheckCircle2 size={12} /> PNG_DATA_VERIFIED
                  </div>
                  <p className="text-xs font-semibold text-zinc-200 truncate font-mono uppercase">
                    {imageFileName || "character_art.png"}
                  </p>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                    {supportsVisualAudit
                      ? "Will compare descriptions directly with visual render features."
                      : "Embedded card text is extracted; the art itself isn't analyzed in this mode."}
                  </p>
                </div>

                <button
                  id="reset-image-btn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetImage();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-[9px] text-zinc-500 font-mono hover:text-white bg-[#050505] border border-[#1A1A1A] rounded hover:border-rose-500/50 transition-all ml-auto uppercase"
                >
                  <RotateCcw size={10} /> Clear art
                </button>
              </div>
            ) : (
              <div className="py-6 space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded bg-[#050505] border border-[#1A1A1A] text-zinc-500">
                  <Upload size={16} />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase text-zinc-400">
                    DRAG_CARD_PNG_OR_CLICK_TO_ATTACH
                  </p>
                  <p className="text-[9px] text-[#555] font-mono mt-1">
                    Accepts PNG/JPG illustration or standard V2/SillyTavern PNG card
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SillyTavern embedded Extraction Success Alert banner */}
          {showExtractedBanner && extractedName && (
            <div id="metadata-extracted-alert" className="mt-3 flex items-start gap-2.5 bg-[#0A0A0A] border border-[#00F0FF]/25 p-3 rounded-lg text-cyan-200">
              <Sparkles size={14} className="text-[#00F0FF] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] space-y-0.5">
                <span className="font-bold text-[#00F0FF] font-mono uppercase text-[10px]">Tavern Metadata Extracted!</span>
                <p className="opacity-90 leading-relaxed font-sans text-zinc-300">
                  Found integrated character data for <strong className="text-white font-mono">&ldquo;{extractedName}&rdquo;</strong> inside PNG chunks. All greetings and lorebook entries loaded under the hood.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Analyzer Notes Textarea */}
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
              id="analyzer-notes-textarea"
              value={analyzerNotes}
              onChange={(e) => setAnalyzerNotes(e.target.value)}
              placeholder="e.g., 'The card is supposed to be overly verbose because it's a parody character...'"
              className="w-full h-16 bg-[#0A0A0A] leading-relaxed font-mono text-xs p-3 rounded border border-[#1A1A1A] text-zinc-200 focus:outline-none focus:border-[#00F0FF] transition-all resize-y"
            />
          </div>
        </div>

        {/* Collapsible Manual Text Input / Raw Prompt editor (Hidden by default for simplicity) */}
        <div className="border border-[#1A1A1A] bg-[#050505] rounded-lg overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setShowBlueprintTextarea(!showBlueprintTextarea)}
            className="w-full flex items-center justify-between p-3 text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors bg-[#080808]"
          >
            <span>Manual Text Input / Raw Prompt Editor</span>
            <span className="text-[9px] font-mono border border-[#1A1A1A] px-1.5 py-0.5 rounded text-zinc-400">
              {showBlueprintTextarea ? "CLOSE_EDITOR" : "OPEN_EDITOR"}
            </span>
          </button>

          {showBlueprintTextarea && (
            <div className="p-4 border-t border-[#1A1A1A] space-y-3 animate-fadeIn">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono text-[#555] uppercase font-bold">
                  Paste or modify instructions manually below if not using a PNG card
                </span>
                {description.length > 0 && (
                  <span className="text-[10px] font-mono text-[#555]">
                    {description.length} CHARS
                  </span>
                )}
              </div>
              <textarea
                id="character-blueprint-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste your character card JSON, W++ formatting, or narrative prompt instructions here..."
                className="w-full h-80 bg-[#0A0A0A] leading-relaxed font-mono text-xs p-4 rounded border border-[#1A1A1A] text-zinc-200 focus:outline-none focus:border-[#00F0FF] transition-all resize-y"
              />
            </div>
          )}
        </div>

        {/* Example card loader (demo cards for first-time users) */}
        <div className="border border-[#1A1A1A] bg-[#050505] rounded-lg p-3 space-y-2">
          <span className="text-[9px] font-mono text-[#555] uppercase font-bold block">
            No card handy? Load a demo:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {PRESET_CHARACTERS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDescription(preset.description);
                  clearImageState();
                  setImageFileName(null);
                  setShowExtractedBanner(false);
                  setExtractedName(preset.name);
                  onNameExtracted?.(preset.name);
                  setShowBlueprintTextarea(true);
                }}
                title={preset.tagline}
                className="py-1.5 px-2 rounded text-[9px] font-mono text-left font-bold tracking-wider uppercase border bg-[#0A0A0A] border-[#1A1A1A] text-zinc-500 hover:text-[#00F0FF] hover:border-[#00F0FF]/40 transition-colors"
              >
                {preset.tropeGroup}
              </button>
            ))}
          </div>
        </div>

        {/* Shared Model & API Key settings (provider, model, key, thinking mode) */}
        <ModelSettingsPanel s={settings} />

        {/* Action Button */}
        <button
          id="trigger-analysis-btn"
          type="submit"
          disabled={isLoading || !description.trim()}
          className={`w-full py-4 text-[10px] uppercase font-bold tracking-[0.3em] border transition-colors flex items-center justify-center gap-2 ${
            isLoading
              ? "bg-[#050505] border-zinc-800 text-zinc-600 cursor-not-allowed"
              : "border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black cursor-pointer bg-transparent"
          }`}
        >
          {isLoading ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
              INSTRUCTION_AUDIT_IN_PROGRESS
            </>
          ) : (
            <>
              <Sparkles size={14} />
              RUN_CHARACTER_CARD_AUDIT
            </>
          )}
        </button>
      </form>
    </div>
  );
}

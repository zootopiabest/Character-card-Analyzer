import mammoth from 'mammoth';
import React, { useState, useRef } from "react";
import { Upload, Sparkles, CheckCircle2, RotateCcw } from "lucide-react";

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

import { buildDescriptionFromJson, decodeBase64UTF8, tryExtractCharaMetadata } from "../utils";
import { OPENROUTER_MODELS } from "../data/models";
import { PRESET_CHARACTERS } from "../data/examples";

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

  // Custom runner and API key states
  
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;

    // Check size limit (e.g. 15MB max)
    if (file.size > 15 * 1024 * 1024) {
      alert("File size exceeds 15MB limit. Please attach a smaller file.");
      return;
    }

    setImageFileName(file.name);

    if (file.type === "application/json" || file.name.toLowerCase().endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const data = JSON.parse(result);
          const extracted = buildDescriptionFromJson(data);
          
          if (extracted) {
            // A JSON card carries no image, so drop any image from a prior upload.
            setImageBase64(null);
            setImagePreview(null);
            setImageMimeType(null);
            const extractedNameVal = extracted.name || "JSON Character";
            setExtractedName(extractedNameVal);
            onNameExtracted?.(extractedNameVal);
            if (extracted.description) {
              setDescription(extracted.description);
              setShowExtractedBanner(true);
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
        setDescription(text);
        setImageBase64(null);
        setImagePreview(null);
        setImageMimeType(null);
        setExtractedName(null);
        setShowExtractedBanner(false);
      };
      reader.readAsText(file);
    } else if (file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc")) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          setDescription(result.value);
          setImageBase64(null);
          setImagePreview(null);
          setImageMimeType(null);
          setExtractedName(null);
          setShowExtractedBanner(false);
        } catch (error) {
          alert("Failed to read document.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // 1. Read image as Data URL for preview and base64 extraction
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        
        const commaIndex = result.indexOf(",");
        if (commaIndex !== -1) {
          setImageBase64(result.substring(commaIndex + 1));
          const mimeTypeMatch = result.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
          if (mimeTypeMatch) {
            setImageMimeType(mimeTypeMatch[1]);
          }
        }
      };
      reader.readAsDataURL(file);

      // 2. Read array buffer to check for SillyTavern embedded metadata tags
      if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
        const bufferReader = new FileReader();
        bufferReader.onload = (e) => {
          if (e.target?.result) {
            const buffer = e.target.result as ArrayBuffer;
            const extracted = tryExtractCharaMetadata(buffer);
            if (extracted) {
              const extractedNameVal = extracted.name || "Embedded Tavern Character";
              setExtractedName(extractedNameVal);
              onNameExtracted?.(extractedNameVal);
              if (extracted.description) {
                setDescription(extracted.description);
                setShowExtractedBanner(true);
              }
            }
          }
        };
        bufferReader.readAsArrayBuffer(file);
      }
    }
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
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    setImageFileName(null);
    setShowExtractedBanner(false);
    setExtractedName(null);
    onNameExtracted?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    // Save configuration states to localStorage
    localStorage.setItem("loresieve_use_custom", useCustomSettings ? "true" : "false");
    localStorage.setItem("loresieve_selected_provider", selectedProvider);
    localStorage.setItem("loresieve_custom_api_key", customApiKey);
    localStorage.setItem("loresieve_thinking_mode", thinkingMode ? "true" : "false");
    localStorage.setItem("loresieve_reasoning_effort", reasoningEffort);
    localStorage.setItem("loresieve_custom_base_url", customBaseUrl);
    localStorage.setItem("loresieve_selected_model", selectedModel);

    // BYOK: always pass the entered key/model/provider. The settings panel only
    // shows/hides these fields; it must never null out the key (that would make
    // the app unrunnable, since there is no server fallback).
    onAnalyze(
      description,
      imageBase64,
      imageMimeType,
      customApiKey,
      selectedModel,
      selectedProvider,
      customBaseUrl,
      analyzerNotes.trim() ? analyzerNotes : null,
      thinkingMode,
      reasoningEffort
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
                  setImageBase64(null);
                  setImagePreview(null);
                  setImageMimeType(null);
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

        {/* Reasoning / Thinking Mode (applies to all analysis modes) */}
        <div id="thinking-mode-panel" className="border border-[#1A1A1A] bg-[#050505] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full inline-block animate-pulse"></span>
              Reasoning / Thinking Mode
            </span>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={thinkingMode}
                onChange={(e) => setThinkingMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#1A1A1A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-600 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00F0FF]/30 peer-checked:after:bg-[#00F0FF] peer-checked:after:border-transparent"></div>
            </label>
          </div>

          {thinkingMode && (
            <div className="space-y-1.5 pt-2 border-t border-[#1A1A1A]/50 animate-fadeIn">
              <label className="block text-[9px] font-mono font-bold tracking-widest text-[#444] uppercase mb-1.5 ml-0.5">
                Effort Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {["low", "medium", "high"].map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setReasoningEffort(level)}
                    className={`py-1.5 px-2.5 rounded text-[10px] font-mono text-center font-bold tracking-wider uppercase border transition-all ${
                      reasoningEffort === level
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

        {/* Custom Runner override section */}
        <div id="custom-runner-override" className="border border-[#1A1A1A] bg-[#050505] rounded-lg p-4 space-y-4">
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
                checked={useCustomSettings}
                onChange={(e) => setUseCustomSettings(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#1A1A1A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-600 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00F0FF]/30 peer-checked:after:bg-[#00F0FF] peer-checked:after:border-transparent"></div>
            </label>
          </div>

          {useCustomSettings && (
            <div className="space-y-4 pt-2 border-t border-[#1A1A1A] animate-fadeIn">
              {/* Provider selector */}
              <div className="space-y-1.5 pb-2 border-b border-[#1A1A1A]">
                <label className="block text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">
                  Select Provider Corridor
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider("gemini");
                      setSelectedModel("gemini-3.5-flash");
                    }}
                    className={`py-1.5 px-2.5 rounded text-[10px] font-mono text-center font-bold tracking-wider uppercase border transition-colors ${
                      selectedProvider === "gemini"
                        ? "bg-[#0A0A0A] border-[#00F0FF] text-white"
                        : "bg-[#050505] border-[#1A1A1A] text-zinc-500 hover:text-zinc-300 hover:bg-[#0A0A0A]"
                    }`}
                  >
                    Google Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider("openrouter");
                      setSelectedModel(OPENROUTER_MODELS[0]);
                    }}
                    className={`py-1.5 px-2.5 rounded text-[10px] font-mono text-center font-bold tracking-wider uppercase border transition-colors ${
                      selectedProvider === "openrouter"
                        ? "bg-[#0A0A0A] border-[#00F0FF] text-white"
                        : "bg-[#050505] border-[#1A1A1A] text-zinc-500 hover:text-zinc-300 hover:bg-[#0A0A0A]"
                    }`}
                  >
                    OpenRouter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider("openai");
                      setSelectedModel("");
                    }}
                    className={`py-1.5 px-2.5 rounded text-[10px] font-mono text-center font-bold tracking-wider uppercase border transition-colors ${
                      selectedProvider === "openai"
                        ? "bg-[#0A0A0A] border-[#00F0FF] text-white"
                        : "bg-[#050505] border-[#1A1A1A] text-zinc-500 hover:text-zinc-300 hover:bg-[#0A0A0A]"
                    }`}
                  >
                    OpenAI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider("custom");
                      setSelectedModel("");
                    }}
                    className={`py-1.5 px-2.5 rounded text-[10px] font-mono text-center font-bold tracking-wider uppercase border transition-colors ${
                      selectedProvider === "custom"
                        ? "bg-[#0A0A0A] border-[#00F0FF] text-white"
                        : "bg-[#050505] border-[#1A1A1A] text-zinc-500 hover:text-zinc-300 hover:bg-[#0A0A0A]"
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* API Key input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                  <label className="uppercase font-bold text-[#555]">
                    {selectedProvider === "openrouter" ? "OpenRouter API Key" : selectedProvider === "openai" ? "OpenAI API Key" : selectedProvider === "custom" ? "API Key" : "Gemini API Key"}
                  </label>
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
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder={selectedProvider === "openrouter" ? "sk-or-v1-..." : selectedProvider === "openai" ? "sk-proj-..." : selectedProvider === "custom" ? "sk-..." : "AIzaSy..."}
                  className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded p-2 text-xs font-mono text-[#00F0FF] placeholder-zinc-700 focus:outline-none focus:border-[#00F0FF]/60"
                />
                <span className="text-[9px] leading-snug text-zinc-500 font-mono block">
                  {selectedProvider === "custom" ? (
                    "Your key is saved on this device (browser storage) and sent directly to the custom endpoint. It persists until you clear it or your browser data."
                  ) : (
                    <>
                      Your key is saved on this device (browser storage) and sent directly to {selectedProvider === "openrouter" ? "OpenRouter" : selectedProvider === "openai" ? "OpenAI" : "Google"}; it never passes through any server of ours. It persists on this device until you clear it. Get credentials at{" "}
                      <a
                        href={selectedProvider === "openrouter" ? "https://openrouter.ai/keys" : selectedProvider === "openai" ? "https://platform.openai.com/api-keys" : "https://aistudio.google.com/"}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[#00F0FF] hover:underline"
                      >
                        {selectedProvider === "openrouter" ? "OpenRouter AI" : selectedProvider === "openai" ? "OpenAI Platform" : "Google AI Studio"}
                      </a>.
                    </>
                  )}
                </span>
              </div>

              {/* Base URL input */}
              {selectedProvider === "custom" && (
                <div className="space-y-1.5 pt-2">
                  <label className="block text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder="e.g. http://localhost:11434/v1"
                    className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded p-2 text-xs font-mono text-[#00F0FF] placeholder-zinc-700 focus:outline-none focus:border-[#00F0FF]/60"
                  />
                </div>
              )}

              {/* Model Select */}
              {selectedProvider === "gemini" ? (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">
                    Model Selection Protocol
                  </label>
                  <div className="relative">
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
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
              ) : (
                <div className="space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">
                      Active LLM Model String
                    </label>
                    <label className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400 cursor-pointer">
                      <input type="checkbox" checked={isManualModel} onChange={(e) => setIsManualModel(e.target.checked)} className="rounded border-[#1A1A1A] bg-[#0A0A0A] text-[#00F0FF] focus:ring-[#00F0FF]/30" />
                      ENTER MANUALLY
                    </label>
                  </div>
                  
                  {isManualModel || selectedProvider === "custom" ? (
                    <input
                      type="text"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      placeholder={selectedProvider === "openai" ? "e.g. gpt-5.5" : selectedProvider === "custom" ? "e.g. meta-llama/Llama-3-8b" : "e.g. gryphe/mythomax-l2-13b"}
                      className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded p-2 text-xs font-mono text-[#00F0FF] placeholder-zinc-700 focus:outline-none focus:border-[#00F0FF]/60"
                    />
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
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
                    Type or select an identifier from {selectedProvider === "openai" ? "OpenAI" : selectedProvider === "custom" ? "your custom endpoint" : "OpenRouter"} to run the custom prompt audit model sweep.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
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

import { useState } from "react";
import { Download, FileJson, FileText, ChevronDown, Clipboard, Check } from "lucide-react";
import { downloadFile, generateAuditMarkdown, generateComparisonMarkdown, generateGroupMarkdown, generateMultiCharMarkdown } from "../exportUtils";
import { AnalysisResult, ComparisonResult, GroupResult, MultiCharResult } from "../types";
import VerificationBadge from "./VerificationBadge";

interface ExportButtonsProps {
  data: any;
  type: "audit" | "comparison" | "group" | "multichar";
  charName?: string;
}

export default function ExportButtons({ data, type, charName }: ExportButtonsProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildMarkdown = (): string => {
    if (type === "audit") return generateAuditMarkdown(data as AnalysisResult, charName);
    if (type === "comparison") return generateComparisonMarkdown(data as ComparisonResult);
    if (type === "group") return generateGroupMarkdown(data as GroupResult);
    return generateMultiCharMarkdown(data as MultiCharResult, charName);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    downloadFile(jsonStr, `report_${type}_${Date.now()}.json`, "application/json");
    setOpen(false);
  };

  const handleExportMd = () => {
    downloadFile(buildMarkdown(), `report_${type}_${Date.now()}.md`, "text/markdown");
    setOpen(false);
  };

  // File downloads can silently fail inside a mobile WebView (the Android
  // app), so clipboard copy is the reliable path there.
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      alert("Couldn't access the clipboard. Try the Markdown download instead.");
    }
  };

  return (
    <div className="relative min-w-0 text-left z-50">
      {typeof data.requestModel === "string" && <p className="mb-2 text-[10px] font-mono text-zinc-400 [overflow-wrap:anywhere]">Model: {data.requestModel}</p>}
      <VerificationBadge verification={data.verification} />
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#222] border border-[#333] text-zinc-300 font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded transition-all shadow-sm"
      >
        <Download size={14} className="text-[#00F0FF]" />
        Export Report
        <ChevronDown size={14} className="text-zinc-500" />
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-[#0A0A0A] ring-1 ring-white/10 z-50 overflow-hidden border border-[#222]">
            <div className="py-1" role="menu" aria-orientation="vertical">
              <button
                onClick={handleCopy}
                className="w-full text-left px-4 py-2 text-[11px] font-mono whitespace-nowrap text-zinc-300 hover:bg-[#1A1A1A] hover:text-white flex items-center gap-2 border-b border-[#1A1A1A]"
                role="menuitem"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Clipboard size={14} className="text-emerald-400" /> Copy report
                  </>
                )}
              </button>
              <button
                onClick={handleExportMd}
                className="w-full text-left px-4 py-2 text-[11px] font-mono whitespace-nowrap text-zinc-300 hover:bg-[#1A1A1A] hover:text-white flex items-center gap-2 border-b border-[#1A1A1A]"
                role="menuitem"
              >
                <FileText size={14} className="text-[#00F0FF]" /> Markdown (.md)
              </button>
              <button
                onClick={handleExportJson}
                className="w-full text-left px-4 py-2 text-[11px] font-mono whitespace-nowrap text-zinc-300 hover:bg-[#1A1A1A] hover:text-white flex items-center gap-2"
                role="menuitem"
              >
                <FileJson size={14} className="text-purple-400" /> JSON (.json)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

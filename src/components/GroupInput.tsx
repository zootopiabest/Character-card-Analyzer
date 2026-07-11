import React, { useState } from "react";
import { Upload, X, Plus } from "lucide-react";
import { readCardFile } from "../utils";
import ModelSettingsPanel, { useModelSettings } from "./ModelSettings";

interface GroupInputProps {
  onAnalyze: (
    characters: Array<{ name: string; description: string }>,
    customApiKey: string | null,
    selectedModel: string | null,
    provider: string,
    customBaseUrl: string | null,
    thinkingMode?: boolean,
    reasoningEffort?: string
  ) => void;
  isLoading: boolean;
}

interface GroupMember {
  id: string;
  name: string;
  description: string;
  previewUrl: string | null;
}

export default function GroupInput({ onAnalyze, isLoading }: GroupInputProps) {
  const [members, setMembers] = useState<GroupMember[]>([
    { id: "1", name: "", description: "", previewUrl: null },
    { id: "2", name: "", description: "", previewUrl: null },
  ]);

  // Shared provider/model/key/thinking settings (persisted as they change).
  const settings = useModelSettings();

  const addMember = () => {
    setMembers([
      ...members,
      { id: Date.now().toString(), name: "", description: "", previewUrl: null },
    ]);
  };

  const removeMember = (id: string) => {
    if (members.length <= 2) {
      alert("A group must have at least 2 characters.");
      return;
    }
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleMemberChange = (id: string, field: "name" | "description", value: string) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const handleFileChange = (id: string, file: File) => {
    readCardFile(file, {
      onText: ({ text, name, source }) => {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  description: text,
                  name:
                    source === "json" || source === "png-embedded"
                      ? name || m.name || "Embedded Character"
                      : m.name,
                }
              : m
          )
        );
      },
      onImage: ({ dataUrl }) => {
        setMembers((prev) =>
          prev.map((m) => (m.id === id ? { ...m, previewUrl: dataUrl } : m))
        );
      },
      onError: (msg) => alert(msg),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (members.some((m) => !m.description.trim())) {
      alert("Please provide instructions/description for all characters in the group.");
      return;
    }

    const characters = members.map((m, i) => ({
      name: m.name || `Character ${i + 1}`,
      description: m.description
    }));

    onAnalyze(
      characters,
      settings.apiKey.trim() || null,
      settings.model,
      settings.provider,
      settings.baseUrl.trim() || null,
      settings.thinkingMode,
      settings.reasoningEffort
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member, index) => (
          <div key={member.id} className="bg-[#050505] border border-[#1A1A1A] rounded p-4 relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-mono text-[#00F0FF] font-bold uppercase tracking-widest">
                Member 0{index + 1}
              </span>
              {members.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  className="text-zinc-600 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Character Name"
                value={member.name}
                onChange={(e) => handleMemberChange(member.id, "name", e.target.value)}
                className="w-full text-xs font-mono bg-black border border-[#222] p-2 rounded text-white focus:outline-none focus:border-[#00F0FF]/50"
              />

              <div
                className="relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileChange(member.id, file);
                }}
              >
                <textarea
                  value={member.description}
                  onChange={(e) => handleMemberChange(member.id, "description", e.target.value)}
                  placeholder="Paste instructions/prompt, or use Upload below..."
                  rows={4}
                  className="w-full text-[10px] font-mono bg-black text-zinc-300 p-2 rounded border border-[#222] focus:border-[#00F0FF]/50 focus:outline-none resize-none"
                />

                {!member.description && !member.previewUrl && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-30 text-zinc-400">
                    <Upload size={16} className="mb-1" />
                    <span className="text-[9px] uppercase tracking-wider font-mono">Drop or upload a card</span>
                  </div>
                )}

                {member.previewUrl && !member.description && (
                  <div className="absolute inset-0 pointer-events-none p-1 opacity-20">
                     <img src={member.previewUrl} className="w-full h-full object-cover rounded" alt="Preview"/>
                  </div>
                )}
              </div>

              <label className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-zinc-400 hover:text-[#00F0FF] cursor-pointer bg-black border border-[#222] rounded px-2 py-1 transition-colors w-fit">
                <Upload size={11} /> Upload card file
                <input
                  type="file"
                  accept="image/*,application/json,.json,.txt,.md,.rtf,.docx,.doc"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(member.id, file);
                  }}
                />
              </label>
            </div>
          </div>
        ))}

        {members.length < 8 && (
          <div
            onClick={addMember}
            className="bg-[#0A0A0A] border border-[#1A1A1A] border-dashed rounded p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-[#111] hover:border-[#00F0FF]/30 transition-all text-zinc-500 hover:text-[#00F0FF] group"
          >
            <div className="h-10 w-10 rounded-full bg-black border border-[#222] flex items-center justify-center mb-2 group-hover:border-[#00F0FF]/50 transition-colors">
              <Plus size={18} />
            </div>
            <span className="text-[10px] font-mono tracking-widest uppercase font-bold">Add Character</span>
          </div>
        )}
      </div>

      {/* Shared Model & API Key settings (provider, model, key, thinking mode) */}
      <ModelSettingsPanel s={settings} />

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#E0E0E0] hover:bg-white text-black font-bold uppercase tracking-[0.2em] text-sm py-4 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]"
      >
        {isLoading ? "Running Group Synergy Audit..." : "Initiate Group Synergy Audit"}
      </button>
    </form>
  );
}

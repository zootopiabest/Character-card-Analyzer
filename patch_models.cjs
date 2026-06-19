const fs = require('fs');

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');

  // Add the state var if it doesn't exist
  if (!content.includes('const [isManualModel, setIsManualModel] = useState(false);')) {
    content = content.replace(/(const \[selectedModel, setSelectedModel\] = useState.*?\n)/, '$1  const [isManualModel, setIsManualModel] = useState(false);\n');
  }

  // Find the label block
  // Depending on the file, the block starts a little differently, but usually there's a label for the model text.
  
  // IN CARDINPUT
  if (filepath.includes('CardInput.tsx')) {
    const cardInputRegex = /\{\/\* Model Select \*\/\}.*?(?=\{\/\* Action Button \*\/\})/s;
    const replacement = `\{/* Model Select */\}
              \{selectedProvider === "gemini" ? (
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
                      <option value="gemini-2.5-flash">gemini-2.5-flash // Speed-Optimized Model</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro // Legacy Deep Concordance context</option>
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
                      placeholder={selectedProvider === "openai" ? "e.g. gpt-4o or gpt-4-turbo" : selectedProvider === "custom" ? "e.g. meta-llama/Llama-3-8b" : "e.g. gryphe/mythomax-l2-13b"}
                      className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded p-2 text-xs font-mono text-[#00F0FF] placeholder-zinc-700 focus:outline-none focus:border-[#00F0FF]/60"
                    />
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded p-2 text-xs font-mono text-zinc-200 appearance-none focus:outline-none focus:border-[#00F0FF]/60 cursor-pointer"
                      >
                        <option value="Deepseek/deepseek-v4-flash">Deepseek/deepseek-v4-flash</option>
                        <option value="Deepseek/deepseek-v4-pro">Deepseek/deepseek-v4-pro</option>
                        <option value="Google/gemma-4-31b-it">Google/gemma-4-31b-it</option>
                        <option value="Google/gemini-3.1-flash-lite">Google/gemini-3.1-flash-lite</option>
                        <option value="Google/Gemini-3.1-pro-preview">Google/Gemini-3.1-pro-preview</option>
                        <option value="Google/Gemini-3.5-flash">Google/Gemini-3.5-flash</option>
                        <option value="Anthropic/Claude-4.6-opus">Anthropic/Claude-4.6-opus</option>
                        <option value="Anthropic/Claude-4.6-sonnet">Anthropic/Claude-4.6-sonnet</option>
                        <option value="Anthropic/Claude-4.8-opus">Anthropic/Claude-4.8-opus</option>
                        <option value="Anthropic/Claude-4.8-sonnet">Anthropic/Claude-4.8-sonnet</option>
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
`;
    content = content.replace(cardInputRegex, replacement);
  } else if (filepath.includes('GroupInput.tsx') || filepath.includes('ComparisonInput.tsx')) {
    const groupInputRegex = /<label className="text-\[9px\].*?Active LLM Model<\/label>\s*\{selectedProvider !== "gemini" \? \([\s\S]*?\) : \([\s\S]*?\)\}/s;
    const replacement = `<div className="flex items-center justify-between">
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
                  placeholder={selectedProvider === "openai" ? "e.g. gpt-4o or gpt-4-turbo" : selectedProvider === "custom" ? "e.g. meta-llama/Llama-3-8b" : "e.g. anthropic/claude-3.5-sonnet"}
                  className="w-full text-xs font-mono bg-black border border-[#222] p-2 rounded text-zinc-350 focus:outline-none"
                />
              ) : (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full text-xs font-mono bg-black border border-[#222] p-2 rounded text-zinc-300 focus:outline-none cursor-pointer"
                >
                  <option value="Deepseek/deepseek-v4-flash">Deepseek/deepseek-v4-flash</option>
                  <option value="Deepseek/deepseek-v4-pro">Deepseek/deepseek-v4-pro</option>
                  <option value="Google/gemma-4-31b-it">Google/gemma-4-31b-it</option>
                  <option value="Google/gemini-3.1-flash-lite">Google/gemini-3.1-flash-lite</option>
                  <option value="Google/Gemini-3.1-pro-preview">Google/Gemini-3.1-pro-preview</option>
                  <option value="Google/Gemini-3.5-flash">Google/Gemini-3.5-flash</option>
                  <option value="Anthropic/Claude-4.6-opus">Anthropic/Claude-4.6-opus</option>
                  <option value="Anthropic/Claude-4.6-sonnet">Anthropic/Claude-4.6-sonnet</option>
                  <option value="Anthropic/Claude-4.8-opus">Anthropic/Claude-4.8-opus</option>
                  <option value="Anthropic/Claude-4.8-sonnet">Anthropic/Claude-4.8-sonnet</option>
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
                <option value="gemini-2.5-flash">gemini-2.5-flash // Balanced / Fast</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro // Deprecated</option>
              </select>
            )}`;
    content = content.replace(groupInputRegex, replacement);
  }

  fs.writeFileSync(filepath, content);
  console.log('patched ' + filepath);
}

patchFile('src/components/CardInput.tsx');
patchFile('src/components/ComparisonInput.tsx');
patchFile('src/components/GroupInput.tsx');

const fs = require('fs');

// We will place it before the Action Button
const uiBlock = `
          <div className="space-y-4 pt-2 border-t border-[#1A1A1A] animate-fadeIn mt-4 bg-[#0a0a0a] p-3 rounded-md border border-zinc-800/50 shadow-inner">
            <div className="flex items-center justify-between pb-1">
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
              <div className="space-y-1.5 pt-2 border-t border-[#1A1A1A]/50">
                <label className="block text-[9px] font-mono font-bold tracking-widest text-[#444] uppercase mb-1.5 ml-0.5">
                  Effort Level
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["low", "medium", "high"].map((level) => (
                    <button
                      type="button"
                      key={level}
                      onClick={() => setReasoningEffort(level)}
                      className={\`py-1.5 px-2.5 rounded text-[10px] font-mono text-center font-bold tracking-wider uppercase border transition-all \${
                        reasoningEffort === level
                          ? "bg-[#00F0FF]/10 border-[#00F0FF] text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                          : "bg-[#050505] border-[#1A1A1A] text-zinc-600 hover:text-zinc-400 hover:bg-[#0A0A0A] hover:border-zinc-800"
                      }\`}
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
`;

const stateHooksString = `
$1
  const [thinkingMode, setThinkingMode] = useState<boolean>(() => {
    return localStorage.getItem("loresieve_thinking_mode") === "true";
  });
  const [reasoningEffort, setReasoningEffort] = useState<string>(() => {
    return localStorage.getItem("loresieve_reasoning_effort") || "medium";
  });
`;

const localStorageString = `$1\n    localStorage.setItem("loresieve_thinking_mode", thinkingMode ? "true" : "false");\n    localStorage.setItem("loresieve_reasoning_effort", reasoningEffort);`;

const path = require('path');
const componentsDir = 'src/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes("useCustomSettings") || content.includes("customApiKey")) {
    
    if (!content.includes("const [thinkingMode")) {
      // Find the first useState declaration to inject after it
      content = content.replace(/(const \[.*?\] = useState.*?\n.*?\n\s*\}\);)/, stateHooksString);
    }
    
    if (content.includes('localStorage.setItem("loresieve_custom_api_key"')) {
      content = content.replace(/(localStorage\.setItem\("loresieve_custom_api_key"[^\)]*\);)/, localStorageString);
    }
    
    // Patch onAnalyze
    if (filePath.includes("CardInput")) {
      content = content.replace(
        /(useCustomSettings \? selectedProvider : "gemini",[\s\n]*useCustomSettings \? customBaseUrl : null,[\s\n]*analyzerNotes)\s*\)/,
        "$1, thinkingMode, reasoningEffort)"
      );
    } else if (filePath.includes("ComparisonInput")) {
      content = content.replace(
        /(useCustomSettings \? selectedProvider : "gemini",[\s\n]*useCustomSettings \? customBaseUrl : null)\s*\)/,
        "$1, thinkingMode, reasoningEffort)"
      );
    } else if (filePath.includes("GroupInput")) {
       // GroupInput might not use customBaseUrl
       content = content.replace(
        /(customApiKey\.trim\(\) \|\| null,[\s\n]*selectedModel \|\| "gemini-3\.5-flash",[\s\n]*"openrouter")\s*\)/,
        "$1, thinkingMode, reasoningEffort)"
       );
    }

    content = content.replace(/(<button[\s\S]*?id="trigger-analysis-btn")/, uiBlock + "\n        $1");
    
    fs.writeFileSync(filePath, content);
  }
}
console.log("Patched component UI successfully");

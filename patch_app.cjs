const fs = require("fs");
let appSrc = fs.readFileSync("src/App.tsx", "utf8");

// handleAnalyze
appSrc = appSrc.replace(
  /const handleAnalyze = async \(([\s\S]*?)analyzerNotes: string \| null = null\s*\) => \{/,
  `const handleAnalyze = async ($1analyzerNotes: string | null = null, thinkingMode: boolean = false, reasoningEffort: string = "medium") => {`
);
appSrc = appSrc.replace(
  /body: JSON\.stringify\(\{\s*description,\s*imageBase64,\s*imageMimeType,\s*customApiKey,\s*selectedModel,\s*provider,\s*customBaseUrl,\s*analyzerNotes,?\s*\}\),/,
  `body: JSON.stringify({
          description,
          imageBase64,
          imageMimeType,
          customApiKey,
          selectedModel,
          provider,
          customBaseUrl,
          analyzerNotes,
          thinkingMode,
          reasoningEffort
        }),`
);

// handleCompare
appSrc = appSrc.replace(
  /const handleCompare = async \(([\s\S]*?)provider: string(,\s*customBaseUrl: string \| null = null)?\s*\) => \{/,
  `const handleCompare = async ($1provider: string$2, thinkingMode: boolean = false, reasoningEffort: string = "medium") => {`
);
appSrc = appSrc.replace(
  /body: JSON\.stringify\(\{\s*originalDescription,\s*remakeDescription,\s*originalImageBase64,\s*originalImageMimeType,\s*remakeImageBase64,\s*remakeImageMimeType,\s*customApiKey,\s*selectedModel,\s*provider,?\s*(?:customBaseUrl,?)?\s*\}\),/,
  `body: JSON.stringify({
          originalDescription,
          remakeDescription,
          originalImageBase64,
          originalImageMimeType,
          remakeImageBase64,
          remakeImageMimeType,
          customApiKey,
          selectedModel,
          provider,
          customBaseUrl,
          thinkingMode,
          reasoningEffort
        }),`
);
appSrc = appSrc.replace(
  /fetchOpenRouterClient\(\s*"compare",\s*\{ originalDescription, remakeDescription \},\s*customApiKey,\s*selectedModel\s*\)/,
  `fetchOpenRouterClient("compare", { originalDescription, remakeDescription }, customApiKey, selectedModel, thinkingMode, reasoningEffort)`
);

// handleGroup
appSrc = appSrc.replace(
  /const handleGroup = async \(([\s\S]*?)provider: string\s*\) => \{/,
  `const handleGroup = async ($1provider: string, thinkingMode: boolean = false, reasoningEffort: string = "medium") => {`
);
appSrc = appSrc.replace(
  /body: JSON\.stringify\(\{\s*characters,\s*customApiKey,\s*selectedModel,\s*provider,?\s*\}\),/,
  `body: JSON.stringify({
          characters,
          customApiKey,
          selectedModel,
          provider,
          thinkingMode,
          reasoningEffort
        }),`
);
appSrc = appSrc.replace(
  /fetchOpenRouterClient\(\s*"group",\s*\{ characters \},\s*customApiKey,\s*selectedModel\s*\)/,
  `fetchOpenRouterClient("group", { characters }, customApiKey, selectedModel, thinkingMode, reasoningEffort)`
);

// handleMultiCharAnalyze
appSrc = appSrc.replace(
  /const handleMultiCharAnalyze = async \(([\s\S]*?)provider: string\s*\) => \{/,
  `const handleMultiCharAnalyze = async ($1provider: string, thinkingMode: boolean = false, reasoningEffort: string = "medium") => {`
);
appSrc = appSrc.replace(
  /body: JSON\.stringify\(\{\s*description,\s*customApiKey,\s*selectedModel,\s*provider,?\s*\}\),/,
  `body: JSON.stringify({
          description,
          customApiKey,
          selectedModel,
          provider,
          thinkingMode,
          reasoningEffort
        }),`
);
appSrc = appSrc.replace(
  /fetchOpenRouterClient\(\s*"multichar",\s*\{ description \},\s*customApiKey,\s*selectedModel\s*\)/,
  `fetchOpenRouterClient("multichar", { description }, customApiKey, selectedModel, thinkingMode, reasoningEffort)`
);

fs.writeFileSync("src/App.tsx", appSrc);
console.log("Patched handlers in App.tsx");

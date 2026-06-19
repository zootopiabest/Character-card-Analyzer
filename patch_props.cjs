const fs = require('fs');

function patchFile(file, replacer) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = replacer(content);
    fs.writeFileSync(file, content);
  }
}

patchFile('src/components/CardInput.tsx', content => {
  return content.replace(
    /onAnalyze: \([\s\S]*?analyzerNotes: string \| null\s*\) => void;/,
    `onAnalyze: (description: string, imageBase64: string | null, imageMimeType: string | null, customApiKey: string | null, selectedModel: string | null, provider: string, customBaseUrl: string | null, analyzerNotes: string | null, thinkingMode: boolean, reasoningEffort: string) => void;`
  );
});

patchFile('src/components/ComparisonInput.tsx', content => {
  return content.replace(
    /onAnalyze: \([\s\S]*?provider: string,\s*customBaseUrl: string \| null\s*\) => void;/,
    `onAnalyze: (originalDesc: string, remakeDesc: string, originalImageBase64: string | null, originalImageMimeType: string | null, remakeImageBase64: string | null, remakeImageMimeType: string | null, customApiKey: string | null, selectedModel: string | null, provider: string, customBaseUrl: string | null, thinkingMode: boolean, reasoningEffort: string) => void;`
  );
});

patchFile('src/components/GroupInput.tsx', content => {
  return content.replace(
    /onAnalyze: \([\s\S]*?provider: string\s*\) => void;/,
    `onAnalyze: (characters: Array<{name: string, description: string}>, customApiKey: string | null, selectedModel: string | null, provider: string, thinkingMode: boolean, reasoningEffort: string) => void;`
  );
});

console.log("Patched prop definitions");

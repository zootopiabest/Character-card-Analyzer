const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replacements for req.body
content = content.replace(
  /const { description, imageBase64, imageMimeType, analyzerNotes, customApiKey, selectedModel, provider } = req.body;/,
  'const { description, imageBase64, imageMimeType, analyzerNotes, customApiKey, selectedModel, provider, thinkingMode = false, reasoningEffort = "medium" } = req.body;'
);

content = content.replace(
  /const \{\s*originalDescription,\s*remakeDescription,\s*originalImageBase64,\s*originalImageMimeType,\s*remakeImageBase64,\s*remakeImageMimeType,\s*customApiKey,\s*selectedModel,\s*provider\s*\} = req\.body;/,
  'const { originalDescription, remakeDescription, originalImageBase64, originalImageMimeType, remakeImageBase64, remakeImageMimeType, customApiKey, selectedModel, provider, thinkingMode = false, reasoningEffort = "medium" } = req.body;'
);

content = content.replace(
  /const \{\s*characters,\s*customApiKey,\s*selectedModel,\s*provider\s*\} = req\.body;/,
  'const { characters, customApiKey, selectedModel, provider, thinkingMode = false, reasoningEffort = "medium" } = req.body;'
);

content = content.replace(
  /const { description, customApiKey, selectedModel, provider } = req\.body;/,
  'const { description, customApiKey, selectedModel, provider, thinkingMode = false, reasoningEffort = "medium" } = req.body;'
);

content = content.replace(
  /body: JSON\.stringify\(\{[\s\n]*model: modelToUse,[\s\n]*messages,[\s\n]*\.\.\.\(provider === "openai" && \{ response_format: \{ type: "json_object" \} \}\),[\s\n]*max_tokens: 8192[\s\n]*\}\)/g,
  `body: JSON.stringify({
          model: modelToUse,
          messages,
          ...(provider === "openai" && { response_format: { type: "json_object" } }),
          ...(thinkingMode && { reasoning_effort: reasoningEffort }),
          max_tokens: 8192
        })`
);

content = content.replace(
  /config: \{\s*maxOutputTokens: 8192,\s*systemInstruction,\s*responseMimeType: "application\/json",\s*responseSchema: ([a-zA-Z]+Schema)\s*\}/g,
  `config: {
          maxOutputTokens: 8192,
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: $1,
          ...(thinkingMode && {
            thinkingConfig: {
              thinkingLevel: reasoningEffort === "low" ? "LOW" : reasoningEffort === "medium" ? "MEDIUM" : "HIGH"
            }
          })
        }`
);

content = content.replace(
  /config: \{\s*maxOutputTokens: 8192,\s*systemInstruction,\s*responseMimeType: "application\/json"\s*\}/g,
  `config: {
          maxOutputTokens: 8192,
          systemInstruction,
          responseMimeType: "application/json",
          ...(thinkingMode && {
            thinkingConfig: {
              thinkingLevel: reasoningEffort === "low" ? "LOW" : reasoningEffort === "medium" ? "MEDIUM" : "HIGH"
            }
          })
        }`
);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts successfully");

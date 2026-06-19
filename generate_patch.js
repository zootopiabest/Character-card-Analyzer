const fs = require('fs');
let serverSrc = fs.readFileSync('server.ts', 'utf8');

// 1. Analyze
serverSrc = serverSrc.replace(
  /const {\s*description,\s*imageBase64,\s*imageMimeType,\s*analyzerNotes,\s*customApiKey,\s*selectedModel,\s*provider\s*} = req\.body;/,
  `const { description, imageBase64, imageMimeType, analyzerNotes, customApiKey, selectedModel, provider, thinkingMode, reasoningEffort } = req.body;`
);

// 2. Compare
serverSrc = serverSrc.replace(
  /const \{\s*originalDescription,\s*remakeDescription,\s*originalImageBase64,\s*originalImageMimeType,\s*remakeImageBase64,\s*remakeImageMimeType,\s*customApiKey,\s*selectedModel,\s*provider\s*\} = req\.body;/,
  `const { originalDescription, remakeDescription, originalImageBase64, originalImageMimeType, remakeImageBase64, remakeImageMimeType, customApiKey, selectedModel, provider, thinkingMode, reasoningEffort } = req.body;`
);

// 3. Group
serverSrc = serverSrc.replace(
  /const \{\s*characters,\s*\/\/ Array<\{name,\s*description\}>\s*customApiKey,\s*selectedModel,\s*provider\s*\} = req\.body;/,
  `const { characters, customApiKey, selectedModel, provider, thinkingMode, reasoningEffort } = req.body;`
);

// 4. MultiChar
serverSrc = serverSrc.replace(
  /const \{ description, customApiKey, selectedModel, provider \} = req\.body;/,
  `const { description, customApiKey, selectedModel, provider, thinkingMode, reasoningEffort } = req.body;`
);

// OpenRouter payloads
serverSrc = serverSrc.replace(
  /body: JSON\.stringify\(\{\s*model: modelToUse,\s*messages,\s*\.\.\.\(provider === "openai" && \{ response_format: \{ type: "json_object" \} \}\),\s*max_tokens: 8192\s*\}\)/g,
  `body: JSON.stringify({
          model: modelToUse,
          messages,
          ...(provider === "openai" && { response_format: { type: "json_object" } }),
          ...(thinkingMode && { reasoning_effort: reasoningEffort }),
          max_tokens: 8192
        })`
);

// Gemini payload
serverSrc = serverSrc.replace(
  /config: \{\s*maxOutputTokens: 8192,\s*systemInstruction(?:,\s*responseMimeType: "application\/json")?\s*(?:,\s*responseSchema:\s*[\s\S]*?)?\}\s*\}\s*\)*;/g,
  (match) => {
    return match.replace(/\}$/, `  ...(thinkingMode && {\n            thinkingConfig: {\n              thinkingLevel: reasoningEffort === "low" ? "LOW" : reasoningEffort === "medium" ? "MEDIUM" : "HIGH"\n            }\n          })\n        }`);
  }
);

// Wait, I should do the Gemini payload replace carefully!
fs.writeFileSync('patch_server.cjs', `
const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replacements for req.body
content = content.replace(
  /const { description, imageBase64, imageMimeType, analyzerNotes, customApiKey, selectedModel, provider } = req.body;/,
  'const { description, imageBase64, imageMimeType, analyzerNotes, customApiKey, selectedModel, provider, thinkingMode = false, reasoningEffort = "medium" } = req.body;'
);

content = content.replace(
  /const \{\\s*originalDescription,[\\s\\S]*?provider\\s*\\} = req\\.body;/,
  'const { originalDescription, remakeDescription, originalImageBase64, originalImageMimeType, remakeImageBase64, remakeImageMimeType, customApiKey, selectedModel, provider, thinkingMode = false, reasoningEffort = "medium" } = req.body;'
);

content = content.replace(
  /const {\\s*characters,[\\s\\S]*?provider\\s*\\} = req\\.body;/,
  'const { characters, customApiKey, selectedModel, provider, thinkingMode = false, reasoningEffort = "medium" } = req.body;'
);

content = content.replace(
  /const { description, customApiKey, selectedModel, provider } = req\\.body;/,
  'const { description, customApiKey, selectedModel, provider, thinkingMode = false, reasoningEffort = "medium" } = req.body;'
);

content = content.replace(
  /body: JSON\\.stringify\\(\\{[\\s\\S]*?max_tokens: 8192\\s*\\}\\)/g,
  \`body: JSON.stringify({
          model: modelToUse,
          messages,
          ...(provider === "openai" && { response_format: { type: "json_object" } }),
          ...(thinkingMode && { reasoning_effort: reasoningEffort }),
          max_tokens: 8192
        })\`
);

content = content.replace(
  /config: \\{\\s*maxOutputTokens: 8192,\\s*systemInstruction,\\s*responseMimeType: "application\\/json",\\s*responseSchema: ([a-zA-Z]+)Schema\\s*\\},/g,
  \`config: {
          maxOutputTokens: 8192,
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: $1Schema,
          ...(thinkingMode && {
            thinkingConfig: {
              thinkingLevel: reasoningEffort === "low" ? "LOW" : reasoningEffort === "medium" ? "MEDIUM" : "HIGH"
            }
          })
        },\`
);

content = content.replace(
  /config: \\{\\s*maxOutputTokens: 8192,\\s*systemInstruction,\\s*responseMimeType: "application\\/json"\\s*\\},/g,
  \`config: {
          maxOutputTokens: 8192,
          systemInstruction,
          responseMimeType: "application/json",
          ...(thinkingMode && {
            thinkingConfig: {
              thinkingLevel: reasoningEffort === "low" ? "LOW" : reasoningEffort === "medium" ? "MEDIUM" : "HIGH"
            }
          })
        },\`
);


fs.writeFileSync('server.ts', content);
console.log("Patched server.ts");
`);

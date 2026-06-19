const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  /maxOutputTokens: 8192,/g,
  `maxOutputTokens: 8192,
        ...(thinkingMode && {
          thinkingConfig: {
            thinkingLevel: reasoningEffort === "low" ? "LOW" : reasoningEffort === "medium" ? "MEDIUM" : "HIGH"
          }
        }),`
);

fs.writeFileSync('server.ts', content);
console.log("Patched config objects in server.ts");

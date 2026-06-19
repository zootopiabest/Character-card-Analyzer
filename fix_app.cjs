const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

// remove analyzerNotes from body
appTsx = appTsx.replace(
  /body: JSON.stringify\(\{\n          analyzerNotes,\n        model: modelToUse,/g,
  `body: JSON.stringify({\n        model: modelToUse,`
);

// Add analyzerNotes correctly to userContent in App.tsx
// It's structured with imageBase64 and imageMimeType. Let's find it.
appTsx = appTsx.replace(
  /const directResult = await fetchOpenRouterClient\(\n          "analyze",\n          \{ description, imageBase64, imageMimeType, analyzerNotes \},/g,
  `const directResult = await fetchOpenRouterClient(\n          "analyze",\n          { description, imageBase64, imageMimeType, analyzerNotes },`
);

appTsx = appTsx.replace(
  /CHARACTER DESCRIPTION \/ INSTRUCTIONS:\n"""\n\$\{description\}\n"""`/g,
  `CHARACTER DESCRIPTION / INSTRUCTIONS:\n"""\n\${description}\n"""\n\${payload.analyzerNotes ? \`\\n[OOC/ANALYZER NOTES - EXTERNAL CONTEXT FOR YOU, THE AUDITOR]\\n"""\\n\${payload.analyzerNotes}\\n"""\` : ""}\``
);

fs.writeFileSync('src/App.tsx', appTsx);
console.log('fixed');

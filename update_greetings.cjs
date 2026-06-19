const fs = require('fs');

let content = fs.readFileSync('src/systemInstructions.ts', 'utf8');

const regex = /GREETING MECHANICS:\nOnly ONE single selected greeting is ever injected into the active runtime context at a time\. The LLM does NOT see all alternate greetings at once\.\nCRITICAL: NEVER penalize a card for "context bloat" or "heavy context" because it has multiple greetings\. They are completely separate starting points\. Alternate greetings DO NOT affect context window size during roleplay\.\nDo NOT penalize a card if different alternate greetings contradict each other—they are isolated scenarios\./g;

const replacement = `GREETING MECHANICS:
CRITICAL: Example dialogue and Greetings are TEMPORARY and fall out of context. They are good for setting up a specific cadence or tone, but putting key characteristics in there is bad since obviously it will disappear. You can not put load bearing characterization in example dialogue or greetings!
Each greeting is a PORTAL, not part of the house. Do not treat greetings as load bearing characterization!
Only ONE single selected greeting is ever injected into the active runtime context at a time. The LLM does NOT see all alternate greetings at once.
CRITICAL: NEVER penalize a card for "context bloat" or "heavy context" because it has multiple greetings. They are completely separate starting points. Alternate greetings DO NOT affect context window size during roleplay.
Do NOT penalize a card if different alternate greetings contradict each other—they are isolated scenarios.`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/systemInstructions.ts', content);
console.log("Updated!");

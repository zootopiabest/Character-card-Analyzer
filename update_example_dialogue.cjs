const fs = require('fs');
let content = fs.readFileSync('src/systemInstructions.ts', 'utf8');

const regex = /EXAMPLE DIALOGUE:\nThe presence or absence of example dialogue is neutral\./g;
const replacement = `EXAMPLE DIALOGUE:\nThe presence or absence of example dialogue is neutral. CRITICAL: Example dialogue is TEMPORARY and falls out of context. It is good for setting up a specific cadence or tone, but putting key characteristics in there is bad since it will disappear. You can not put load bearing characterization in example dialogue.`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/systemInstructions.ts', content);
console.log("Updated!");

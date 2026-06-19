const fs = require('fs');
let content = fs.readFileSync('src/systemInstructions.ts', 'utf8');

const regex = /TROPES:\nTropes are neutral\./g;
const replacement = `TAGS:
Tags do not affect runtime. Consider them completely unimportant.

TROPES:
Tropes are neutral.`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/systemInstructions.ts', content);
console.log("Updated!");

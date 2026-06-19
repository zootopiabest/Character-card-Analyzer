const fs = require('fs');
let content = fs.readFileSync('src/systemInstructions.ts', 'utf8');

const replacement = `- 20-point fetish checklists for anatomy (NOTE: stating basic anatomy like bust size or body type to prevent LLM hallucination is completely fine and NOT slop.)
- generic erotic anatomy descriptors when they are interchangeable across characters. "Tight," "pink," "sensitive," "slick," "perky," "needy," and similar stock terms should not be rewarded unless they connect to concrete behavior, limitations, preferences, medical/biological traits, or scene-relevant mechanics. Otherwise treat them as AI/goon-card filler.`;

content = content.replaceAll(
  '- 20-point fetish checklists for anatomy (NOTE: stating basic anatomy like bust size or body type to prevent LLM hallucination is completely fine and NOT slop.)',
  replacement
);
fs.writeFileSync('src/systemInstructions.ts', content);
console.log("Updated!");

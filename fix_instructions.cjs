const fs = require('fs');

const file = 'src/systemInstructions.ts';
let content = fs.readFileSync(file, 'utf8');

const targetGreetingRegex = /Only ONE single selected greeting is ever injected into the active runtime context at a time\. The LLM does NOT see all alternate greetings at once\.\nDo NOT penalize a card if different alternate greetings contradict each other—they are completely separate starting points\.\n\nFurthermore, greetings can be AUs \(Alternate Universes\) or situational "what ifs"\. LLMs are smart enough to adapt even if a greeting contradicts the main profile \(e\.g\., changing a setting, relationship status, or physical trait for that specific scenario\), as long as the explanation for what is going on is inside the greeting itself\. Do NOT penalize alternate greetings for contradicting the main profile if they clearly establish a new AU context\.\n\nDo not penalize multiple alternate greetings for context bloat\./g;

const replacementGreeting = `Only ONE single selected greeting is ever injected into the active runtime context at a time. The LLM does NOT see all alternate greetings at once.
CRITICAL: NEVER penalize a card for "context bloat" or "heavy context" because it has multiple greetings. They are completely separate starting points. Alternate greetings DO NOT affect context window size during roleplay.
Do NOT penalize a card if different alternate greetings contradict each other—they are isolated scenarios.

Furthermore, greetings can be AUs (Alternate Universes) or situational "what ifs". LLMs are smart enough to adapt even if a greeting contradicts the main profile (e.g., changing a setting, relationship status, or physical trait for that specific scenario), as long as the explanation for what is going on is inside the greeting itself. Do NOT penalize alternate greetings for contradicting the main profile if they clearly establish a new AU context.`;

const targetNotesRegex = /CREATOR NOTES:\nCreator notes, post_history_instructions, or author commentary are metadata\. While they may not always be injected into the active prompt, YOU MUST ALWAYS read them and provide a short, cynical blurb about them in the creatorNotesBlurb field if they are present\. Tell the user what the creator was trying to achieve or if they just spammed links\. If there are NO creator notes, explicitly say "None provided\." Do not skip this section or leave it null\./g;

const replacementNotes = `CREATOR NOTES:
Creator notes, post_history_instructions, or author commentary are metadata. They are almost NEVER injected into the active prompt. CRITICAL: NEVER penalize a card for "context bloat" because of creator notes or author commentary. They do NOT consume runtime tokens. YOU MUST ALWAYS read them and provide a short, cynical blurb about them in the creatorNotesBlurb field if they are present. Tell the user what the creator was trying to achieve or if they just spammed links. If there are NO creator notes, explicitly say "None provided." Do not skip this section or leave it null.`;

const c1 = content.replace(targetGreetingRegex, replacementGreeting);
const c2 = c1.replace(targetNotesRegex, replacementNotes);

if (c2 === content) {
    console.log("No replacements were made. Regex didn't match.");
} else {
    fs.writeFileSync(file, c2);
    console.log("Changes applied successfully.");
}

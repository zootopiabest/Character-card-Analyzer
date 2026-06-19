const fs = require('fs');
const file = 'src/systemInstructions.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `CREATOR NOTES:
Creator notes, credits, and links are metadata. Do not grade active runtime based on creator notes unless the platform injects them into the active prompt. However, they can provide important context to explain *why* the creator designed certain things a certain way. Use them as clues to clear up your understanding of the bot's design if something seems unusual, rather than penalizing for it.`;

const replacement = `CREATOR NOTES:
Creator notes, post_history_instructions, or author commentary are metadata. While they may not always be injected into the active prompt, YOU MUST ALWAYS read them and provide a short, cynical blurb about them in the creatorNotesBlurb field if they are present. Tell the user what the creator was trying to achieve or if they just spammed links. If there are NO creator notes, explicitly say "None provided." Do not skip this section or leave it null.`;

content = content.replaceAll(target, replacement);

fs.writeFileSync(file, content);
console.log('done');

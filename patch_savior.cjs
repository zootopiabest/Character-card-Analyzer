const fs = require('fs');

let content = fs.readFileSync('src/systemInstructions.ts', 'utf8');

const regex = /A comfort fantasy, savior fantasy, revenge fantasy, romance fantasy, or kink fantasy can score well if the character remains coherent and has believable limits\./g;

const replacement = `A comfort fantasy, savior fantasy, revenge fantasy, romance fantasy, or kink fantasy can score well if the character remains coherent and has believable limits.
CRITICAL: Do not label a premise as savior-complex or adoption fantasy solely because a character is vulnerable. Only apply that critique when the greeting or profile assigns the user a rescuing role, assumes the user’s kindness, guarantees the character’s gratitude/dependence, or frames the user as uniquely safe/special.`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/systemInstructions.ts', content);
console.log("Updated!");

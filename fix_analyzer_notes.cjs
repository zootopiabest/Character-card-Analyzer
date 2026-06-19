const fs = require('fs');

const oldString = `[OOC/ANALYZER NOTES - EXTERNAL CONTEXT FOR YOU, THE AUDITOR]\\n"""\\n\${payload.analyzerNotes}\\n"""`;
const newString = `[OOC/ANALYZER NOTES - EXTERNAL CONTEXT FOR YOU, THE AUDITOR]\\nCRITICAL INSTRUCTION: The user has provided the following external context. You MUST take this into account when evaluating the card and DO NOT penalize choices that are explicitly justified by these notes:\\n"""\\n\${payload.analyzerNotes}\\n"""`;

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
appTsx = appTsx.split(oldString).join(newString);
fs.writeFileSync('src/App.tsx', appTsx);

const oldStringServer = `[OOC/ANALYZER NOTES - EXTERNAL CONTEXT FOR YOU, THE AUDITOR]\n"""\n\${analyzerNotes}\n"""`;
const newStringServer = `[OOC/ANALYZER NOTES - EXTERNAL CONTEXT FOR YOU, THE AUDITOR]\nCRITICAL INSTRUCTION: The user has provided the following external context. You MUST take this into account when evaluating the card and DO NOT penalize choices that are explicitly justified by these notes:\n"""\n\${analyzerNotes}\n"""`;

let serverTs = fs.readFileSync('server.ts', 'utf8');
serverTs = serverTs.split(oldStringServer).join(newStringServer);
fs.writeFileSync('server.ts', serverTs);

console.log('Fixed');

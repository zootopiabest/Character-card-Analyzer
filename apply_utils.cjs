const fs = require('fs');

let content = fs.readFileSync('src/utils.ts', 'utf8');

const regex = /export function buildDescriptionFromJson\(data: any\): \{ name\?: string; description\?: string \} \{[\s\S]*?return \{\n\s*name: name,\n\s*description: accumulatedDesc\.trim\(\) \|\| JSON\.stringify\(charObj, null, 2\)\n\s*\};\n\}/;

const newImplementation = `export function buildDescriptionFromJson(data: any): { name?: string; description?: string } {
  const charObj = data.data || data;
  let accumulatedDesc = "";
  let name = charObj.name || "";
  
  if (charObj.description) accumulatedDesc += \`[Description]\\n\${charObj.description}\\n\\n\`;
  if (charObj.personality) accumulatedDesc += \`[Personality]\\n\${charObj.personality}\\n\\n\`;
  if (charObj.scenario) accumulatedDesc += \`[Scenario]\\n\${charObj.scenario}\\n\\n\`;
  if (charObj.first_mes) accumulatedDesc += \`[First Message / Greeting]\\n\${charObj.first_mes}\\n\\n\`;
  
  const alternateGreetings = charObj.alternate_greetings || [];
  if (Array.isArray(alternateGreetings) && alternateGreetings.length > 0) {
    accumulatedDesc += \`[Alternate Greetings]\\n\`;
    alternateGreetings.forEach((msg: any, i: number) => {
      if (typeof msg === "string" && msg.trim()) {
        accumulatedDesc += \`Greeting #\${i + 1}:\\n\${msg.trim()}\\n\\n\`;
      } else if (msg && typeof msg === "object" && typeof msg.text === "string" && msg.text.trim()) {
        accumulatedDesc += \`Greeting #\${i + 1}:\\n\${msg.text.trim()}\\n\\n\`;
      }
    });
  }

  if (charObj.mes_example) accumulatedDesc += \`[Example Messages]\\n\${charObj.mes_example}\\n\\n\`;

  if (charObj.system_prompt) accumulatedDesc += \`[System Prompt]\\n\${charObj.system_prompt}\\n\\n\`;
  if (charObj.creator_notes) accumulatedDesc += \`[Creator Notes]\\n\${charObj.creator_notes}\\n\\n\`;
  if (charObj.creatorcomment) accumulatedDesc += \`[Creator Comment]\\n\${charObj.creatorcomment}\\n\\n\`;
  if (charObj.post_history_instructions) accumulatedDesc += \`[Post History Instructions]\\n\${charObj.post_history_instructions}\\n\\n\`;
  if (charObj.author_note) accumulatedDesc += \`[Author Note]\\n\${charObj.author_note}\\n\\n\`;

  if (charObj.tags && Array.isArray(charObj.tags) && charObj.tags.length > 0) accumulatedDesc += \`[Tags]\\n\${charObj.tags.join(", ")}\\n\\n\`;
  if (charObj.creator) accumulatedDesc += \`[Creator]\\n\${charObj.creator}\\n\\n\`;
  if (charObj.character_version) accumulatedDesc += \`[Character Version]\\n\${charObj.character_version}\\n\\n\`;

  const characterBook = charObj.character_book || charObj.lorebook || data.character_book || data.lorebook;
  if (characterBook && typeof characterBook === "object") {
    const bookEntries = characterBook.entries || characterBook.lorebook_entries || [];
    if (Array.isArray(bookEntries) && bookEntries.length > 0) {
      const bookNameStr = characterBook.name ? \` "\${characterBook.name}"\` : "";
      accumulatedDesc += \`[Embedded Lorebook / World Info\${bookNameStr}]\\n\`;
      bookEntries.forEach((entry: any, i: number) => {
        let keysStr = Array.isArray(entry.keys)
          ? entry.keys.join(", ")
          : (typeof entry.key === "string" ? entry.key : (typeof entry.keys === "string" ? entry.keys : "No Keys"));
          
        const secondaryKeysStr = Array.isArray(entry.secondary_keys)
          ? entry.secondary_keys.join(", ")
          : (typeof entry.secondary_keys === "string" ? entry.secondary_keys : "");
          
        if (secondaryKeysStr) {
          keysStr += \` | Secondary Keys: \${secondaryKeysStr}\`;
        }
          
        const isConstant = entry.constant === true;
        const isEnabled = entry.enabled !== false;
        
        const status = !isEnabled ? "[DISABLED] " : "";
        const triggerInfo = isConstant ? "[Always Active / Constant]" : \`[Trigger Keys: \${keysStr}]\`;
        
        const content = entry.content || entry.entry || "";
        const comment = entry.name || entry.comment ? \` (\${entry.name || entry.comment})\` : "";
        if (content && typeof content === "string" && content.trim()) {
          accumulatedDesc += \`Entry #\${i + 1}\${comment} \${status}\${triggerInfo}:\\n\${content.trim()}\\n\\n\`;
        }
      });
    }
  }

  // Process Extensions
  if (charObj.extensions && typeof charObj.extensions === "object") {
    let hasExtData = false;
    let extDesc = \`[Extensions (Structured Data)]\\n\`;
    for (const [extKey, extVal] of Object.entries(charObj.extensions)) {
      if (extKey === 'depth_prompt' && extVal && typeof extVal === 'object') {
        const dp = extVal as any;
        if (dp.prompt) {
          hasExtData = true;
          extDesc += \`--- Extension: depth_prompt ---\\n\`;
          extDesc += \`Prompt:\\n\${dp.prompt}\\n\`;
          if (dp.depth !== undefined) extDesc += \`Depth: \${dp.depth}\\n\`;
          if (dp.role !== undefined) extDesc += \`Role: \${dp.role}\\n\`;
          extDesc += \`\\n\`;
        }
      } else if (extVal && (typeof extVal === "string" ? extVal.trim() !== "" : (Array.isArray(extVal) ? extVal.length > 0 : Object.keys(extVal).length > 0))) {
         hasExtData = true;
         const valStr = typeof extVal === "string" ? extVal : JSON.stringify(extVal, null, 2);
         extDesc += \`--- Extension: \${extKey} ---\\n\${valStr}\\n\\n\`;
      }
    }
    if (hasExtData) accumulatedDesc += extDesc;
  }
  
  // Extract remaining fields
  const handledKeys = [
    "name", "description", "personality", "scenario", "first_mes", "alternate_greetings", 
    "mes_example", "system_prompt", "creator_notes", "creatorcomment", "post_history_instructions", 
    "author_note", "tags", "creator", "character_version", "character_book", "lorebook", "extensions"
  ];
  
  const unhandledKeys = Object.keys(charObj).filter(k => !handledKeys.includes(k));
  if (unhandledKeys.length > 0) {
     let hasUnhandledData = false;
     let unhandledDesc = "[Other Fields]\\n";
     unhandledKeys.forEach(k => {
       const v = charObj[k];
       if (v && (typeof v === "string" ? v.trim() !== "" : (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0))) {
          hasUnhandledData = true;
          unhandledDesc += \`--- \${k} ---\\n\${typeof v === "string" ? v : JSON.stringify(v, null, 2)}\\n\\n\`;
       }
     });
     if (hasUnhandledData) {
       accumulatedDesc += unhandledDesc;
     }
  }

  return {
    name: name,
    description: accumulatedDesc.trim() || JSON.stringify(charObj, null, 2)
  };
}`;

content = content.replace(regex, newImplementation);
fs.writeFileSync('src/utils.ts', content);
console.log('updated src/utils.ts');

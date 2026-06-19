export function buildDescriptionFromJson(data: any): { name?: string; description?: string } {
  const charObj = data.data || data;
  let accumulatedDesc = "";
  let name = charObj.name || "";
  
  if (charObj.description) accumulatedDesc += `[Description]\n${charObj.description}\n\n`;
  if (charObj.personality) accumulatedDesc += `[Personality]\n${charObj.personality}\n\n`;
  if (charObj.scenario) accumulatedDesc += `[Scenario]\n${charObj.scenario}\n\n`;
  if (charObj.first_mes) accumulatedDesc += `[First Message / Greeting]\n${charObj.first_mes}\n\n`;
  
  const alternateGreetings = charObj.alternate_greetings || [];
  if (Array.isArray(alternateGreetings) && alternateGreetings.length > 0) {
    accumulatedDesc += `[Alternate Greetings]\n`;
    alternateGreetings.forEach((msg: any, i: number) => {
      if (typeof msg === "string" && msg.trim()) {
        accumulatedDesc += `Greeting #${i + 1}:\n${msg.trim()}\n\n`;
      } else if (msg && typeof msg === "object" && typeof msg.text === "string" && msg.text.trim()) {
        accumulatedDesc += `Greeting #${i + 1}:\n${msg.text.trim()}\n\n`;
      }
    });
  }

  if (charObj.mes_example) accumulatedDesc += `[Example Messages]\n${charObj.mes_example}\n\n`;

  if (charObj.system_prompt) accumulatedDesc += `[System Prompt]\n${charObj.system_prompt}\n\n`;
  if (charObj.creator_notes) accumulatedDesc += `[Creator Notes]\n${charObj.creator_notes}\n\n`;
  if (charObj.creatorcomment) accumulatedDesc += `[Creator Comment]\n${charObj.creatorcomment}\n\n`;
  if (charObj.post_history_instructions) accumulatedDesc += `[Post History Instructions]\n${charObj.post_history_instructions}\n\n`;
  if (charObj.author_note) accumulatedDesc += `[Author Note]\n${charObj.author_note}\n\n`;

  if (charObj.tags && Array.isArray(charObj.tags) && charObj.tags.length > 0) accumulatedDesc += `[Tags]\n${charObj.tags.join(", ")}\n\n`;
  if (charObj.creator) accumulatedDesc += `[Creator]\n${charObj.creator}\n\n`;
  if (charObj.character_version) accumulatedDesc += `[Character Version]\n${charObj.character_version}\n\n`;

  const characterBook = charObj.character_book || charObj.lorebook || data.character_book || data.lorebook;
  if (characterBook && typeof characterBook === "object") {
    const bookEntries = characterBook.entries || characterBook.lorebook_entries || [];
    if (Array.isArray(bookEntries) && bookEntries.length > 0) {
      const bookNameStr = characterBook.name ? ` "${characterBook.name}"` : "";
      accumulatedDesc += `[Embedded Lorebook / World Info${bookNameStr}]\n`;
      bookEntries.forEach((entry: any, i: number) => {
        let keysStr = Array.isArray(entry.keys)
          ? entry.keys.join(", ")
          : (typeof entry.key === "string" ? entry.key : (typeof entry.keys === "string" ? entry.keys : "No Keys"));
          
        const secondaryKeysStr = Array.isArray(entry.secondary_keys)
          ? entry.secondary_keys.join(", ")
          : (typeof entry.secondary_keys === "string" ? entry.secondary_keys : "");
          
        if (secondaryKeysStr) {
          keysStr += ` | Secondary Keys: ${secondaryKeysStr}`;
        }
          
        const isConstant = entry.constant === true;
        const isEnabled = entry.enabled !== false;
        
        const status = !isEnabled ? "[DISABLED] " : "";
        const triggerInfo = isConstant ? "[Always Active / Constant]" : `[Trigger Keys: ${keysStr}]`;
        
        const content = entry.content || entry.entry || "";
        const comment = entry.name || entry.comment ? ` (${entry.name || entry.comment})` : "";
        if (content && typeof content === "string" && content.trim()) {
          accumulatedDesc += `Entry #${i + 1}${comment} ${status}${triggerInfo}:\n${content.trim()}\n\n`;
        }
      });
    }
  }

  // Process Extensions
  if (charObj.extensions && typeof charObj.extensions === "object") {
    let hasExtData = false;
    let extDesc = `[Extensions (Structured Data)]\n`;
    for (const [extKey, extVal] of Object.entries(charObj.extensions)) {
      if (extKey === 'depth_prompt' && extVal && typeof extVal === 'object') {
        const dp = extVal as any;
        if (dp.prompt) {
          hasExtData = true;
          extDesc += `--- Extension: depth_prompt ---\n`;
          extDesc += `Prompt:\n${dp.prompt}\n`;
          if (dp.depth !== undefined) extDesc += `Depth: ${dp.depth}\n`;
          if (dp.role !== undefined) extDesc += `Role: ${dp.role}\n`;
          extDesc += `\n`;
        }
      } else if (extVal && (typeof extVal === "string" ? extVal.trim() !== "" : (Array.isArray(extVal) ? extVal.length > 0 : Object.keys(extVal).length > 0))) {
         hasExtData = true;
         const valStr = typeof extVal === "string" ? extVal : JSON.stringify(extVal, null, 2);
         extDesc += `--- Extension: ${extKey} ---\n${valStr}\n\n`;
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
     let unhandledDesc = "[Other Fields]\n";
     unhandledKeys.forEach(k => {
       const v = charObj[k];
       if (v && (typeof v === "string" ? v.trim() !== "" : (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0))) {
          hasUnhandledData = true;
          unhandledDesc += `--- ${k} ---\n${typeof v === "string" ? v : JSON.stringify(v, null, 2)}\n\n`;
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
}

export function decodeBase64UTF8(base64: string): string {
  const binString = atob(base64);
  const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
  return new TextDecoder("utf-8").decode(bytes);
}

export function tryExtractCharaMetadata(arrayBuffer: ArrayBuffer): { name?: string; description?: string } | null {
  const view = new DataView(arrayBuffer);
  // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (arrayBuffer.byteLength < 8 || view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
    return null;
  }

  let offset = 8;
  const textDecoder = new TextDecoder("utf-8");

  while (offset < view.byteLength) {
    if (offset + 12 > view.byteLength) break;
    const length = view.getUint32(offset);
    const chunkType = textDecoder.decode(new Uint8Array(arrayBuffer, offset + 4, 4));

    if (chunkType === "IEND") break;

    if (chunkType === "tEXt" || chunkType === "iTXt") {
      const chunkData = new Uint8Array(arrayBuffer, offset + 8, length);
      let nullIndex = -1;
      for (let i = 0; i < chunkData.length; i++) {
        if (chunkData[i] === 0) {
          nullIndex = i;
          break;
        }
      }
      if (nullIndex !== -1) {
        const keyword = textDecoder.decode(chunkData.subarray(0, nullIndex));
        // Common keys used in Tavern character card formats
        if (keyword === "chara" || keyword === "character") {
          // Skip null separators and compression details depending on format
          let textStart = nullIndex + 1;
          if (chunkType === "iTXt" && textStart + 2 < chunkData.length) {
            for (let j = textStart; j < chunkData.length; j++) {
              if (chunkData[j] === 123) { // ASCII for '{'
                textStart = j;
                break;
              }
            }
          }

          let rawText = textDecoder.decode(chunkData.subarray(textStart));
          try {
            let decodedText = rawText.trim();
            if (!decodedText.startsWith("{")) {
              try {
                decodedText = decodeBase64UTF8(decodedText);
              } catch (_) {
              }
            }

            const data = JSON.parse(decodedText);
            
            const extracted = buildDescriptionFromJson(data);
            if (extracted && (extracted.name || extracted.description)) {
              return extracted;
            }
          } catch (e) {
            console.warn("Detected chara tag but failed JSON decode:", e);
          }
        }
      }
    }

    offset += length + 12;
  }
  return null;
}

export function safeParseJSON(text: string): any {
  if (!text || typeof text !== "string") {
    throw new Error("No text provided to JSON parser.");
  }

  let cleanText = text.trim();

  // Try direct parsing first
  try {
    return JSON.parse(cleanText);
  } catch (_) {
    // Attempt markdown block extraction
    let modified = cleanText;
    
    // Remove leading ```json or ``` markdown block markers
    if (modified.startsWith("```json")) {
      modified = modified.replace(/^```json\s*/, "");
    } else if (modified.startsWith("```")) {
      modified = modified.replace(/^```\s*/, "");
    }
    
    // Remove trailing ``` markdown block markers
    if (modified.endsWith("```")) {
      modified = modified.replace(/\s*```$/, "");
    }
    
    modified = modified.trim();

    try {
      return JSON.parse(modified);
    } catch (_) {
      // Find coordinates of first open brace and last close brace for JSON object extraction
      const firstCurly = modified.indexOf("{");
      const lastCurly = modified.lastIndexOf("}");
      
      if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        const potentialJson = modified.substring(firstCurly, lastCurly + 1);
        try {
          return JSON.parse(potentialJson);
        } catch (innerError: any) {
          console.error("Failed to parse extracted JSON block:", potentialJson, innerError);
          throw new Error("Extracted JSON text contains syntax errors: " + innerError.message);
        }
      }

      // If object extraction fails, try square braces for JSON arrays
      const firstSquare = modified.indexOf("[");
      const lastSquare = modified.lastIndexOf("]");
      
      if (firstSquare !== -1 && lastSquare !== -1 && lastSquare > firstSquare) {
        const potentialJsonArray = modified.substring(firstSquare, lastSquare + 1);
        try {
          return JSON.parse(potentialJsonArray);
        } catch (innerError: any) {
          console.error("Failed to parse extracted JSON array:", potentialJsonArray, innerError);
          throw new Error("Extracted JSON array text contains syntax errors: " + innerError.message);
        }
      }

      throw new Error("Could not find any JSON format (braces or brackets) in the response.");
    }
  }
}


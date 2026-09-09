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

export async function tryExtractCharaMetadata(arrayBuffer: ArrayBuffer): Promise<{ name?: string; description?: string } | null> {
  const view = new DataView(arrayBuffer);
  if (arrayBuffer.byteLength < 8 || view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) return null;
  const decoder = new TextDecoder("utf-8");
  let offset = 8;
  let fallback: { name?: string; description?: string } | null = null;
  let foundCardMetadata = false;
  while (offset + 12 <= view.byteLength) {
    const length = view.getUint32(offset);
    if (length > view.byteLength - offset - 12) throw new Error("The PNG contains a truncated metadata chunk.");
    const type = decoder.decode(new Uint8Array(arrayBuffer, offset + 4, 4));
    if (type === "IEND") break;
    if (["tEXt", "iTXt", "zTXt"].includes(type)) {
      const data = new Uint8Array(arrayBuffer, offset + 8, length);
      const separator = data.indexOf(0);
      const keyword = separator >= 0 ? decoder.decode(data.subarray(0, separator)) : "";
      if (["chara", "character", "ccv3"].includes(keyword)) {
        foundCardMetadata = true;
        try {
          let start = separator + 1;
          let compressed = false;
          if (type === "iTXt") {
            if (start + 2 > data.length || data[start] > 1 || data[start + 1] !== 0) throw new Error("Invalid iTXt compression header");
            compressed = data[start] === 1;
            start += 2;
            // Language tag and translated keyword are each NUL-terminated.
            for (let i = 0; i < 2; i++) {
              const end = data.indexOf(0, start);
              if (end < 0) throw new Error("Invalid iTXt text header");
              start = end + 1;
            }
          } else if (type === "zTXt") {
            if (data[start++] !== 0) throw new Error("Unsupported PNG compression");
            compressed = true;
          }
          let payload: Uint8Array = data.slice(start);
          if (compressed) {
            const stream = new Blob([payload.slice().buffer]).stream().pipeThrough(new DecompressionStream("deflate"));
            const reader = stream.getReader();
            const chunks: Uint8Array[] = [];
            let size = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              size += value.byteLength;
              if (size > 15 * 1024 * 1024) { await reader.cancel(); throw new Error("PNG metadata exceeds the 15MB limit"); }
              chunks.push(value);
            }
            payload = new Uint8Array(size);
            let cursor = 0;
            for (const chunk of chunks) { payload.set(chunk, cursor); cursor += chunk.length; }
          }
          const raw = decoder.decode(payload).trim();
          const decoded = raw.startsWith("{") ? raw : decodeBase64UTF8(raw);
          const extracted = buildDescriptionFromJson(JSON.parse(decoded));
          if (keyword === "ccv3") return extracted;
          fallback ??= extracted;
        } catch {
          // A PNG may carry both v2 and v3 metadata; try another matching chunk.
        }
      }
    }
    offset += length + 12;
  }
  if (foundCardMetadata && !fallback) throw new Error("The PNG contains character metadata, but it could not be decoded. Try exporting the card as JSON.");
  return fallback;
}

// Shared card-file reader used by all three input panels (single, comparison,
// group) so the JSON / .txt / .docx / PNG-metadata handling can't drift apart.
export interface CardFileCallbacks {
  // Fired when readable card text is available. `source` tells the caller how
  // it was obtained so it can decide what else to reset (e.g. a JSON upload
  // should clear any previously attached art, a PNG keeps its own image).
  onText?: (r: {
    text: string;
    name?: string;
    source: "json" | "text" | "docx" | "png-embedded";
  }) => void;
  // Fired for image files with the preview/data payload.
  onImage?: (r: { dataUrl: string; base64: string; mimeType: string }) => void;
  onError?: (message: string) => void;
}

export function readCardFile(file: File, cb: CardFileCallbacks): void {
  if (!file) return;

  if (file.size > 15 * 1024 * 1024) {
    cb.onError?.("File size exceeds 15MB limit. Please attach a smaller file.");
    return;
  }

  const lower = file.name.toLowerCase();

  if (file.type === "application/json" || lower.endsWith(".json")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const extracted = buildDescriptionFromJson(data);
        if (extracted && extracted.description) {
          cb.onText?.({ text: extracted.description, name: extracted.name, source: "json" });
        }
      } catch {
        cb.onError?.("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    return;
  }

  if (
    lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".rtf") ||
    file.type === "text/plain" || file.type === "text/markdown"
  ) {
    const reader = new FileReader();
    reader.onload = (e) => {
      cb.onText?.({ text: e.target?.result as string, source: "text" });
    };
    reader.readAsText(file);
    return;
  }

  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({
          arrayBuffer: e.target?.result as ArrayBuffer,
        });
        cb.onText?.({ text: result.value, source: "docx" });
      } catch {
        cb.onError?.("Failed to read document.");
      }
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  // Everything else is treated as an image.
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex !== -1) {
      const mimeTypeMatch = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
      cb.onImage?.({
        dataUrl,
        base64: dataUrl.substring(commaIndex + 1),
        mimeType: mimeTypeMatch ? mimeTypeMatch[1] : file.type || "image/png",
      });
    }
  };
  reader.readAsDataURL(file);

  // PNGs may carry an embedded SillyTavern character card.
  if (file.type === "image/png" || lower.endsWith(".png")) {
    const bufferReader = new FileReader();
    bufferReader.onload = async (e) => {
      if (e.target?.result) {
        try {
          const extracted = await tryExtractCharaMetadata(e.target.result as ArrayBuffer);
          if (extracted && extracted.description) {
            cb.onText?.({
              text: extracted.description,
              name: extracted.name,
              source: "png-embedded",
            });
          }
        } catch (error) {
          cb.onError?.(error instanceof Error ? error.message : "Failed to read PNG metadata.");
        }
      }
    };
    bufferReader.readAsArrayBuffer(file);
  }
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


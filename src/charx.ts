import type { JSZipObject } from "jszip";

export const CARD_FILE_LIMIT = 15 * 1024 * 1024;
export const CHARX_FILE_LIMIT = 100 * 1024 * 1024;

export interface CardImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
}

// JSZip documents internalStream, but its bundled typings omit it on ZipObject.
interface EntryStream {
  on(event: "data", callback: (chunk: Uint8Array) => void): EntryStream;
  on(event: "error", callback: (error: Error) => void): EntryStream;
  on(event: "end", callback: () => void): EntryStream;
  pause(): EntryStream;
  resume(): EntryStream;
}

function readEntry(entry: JSZipObject): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const stream = (entry as unknown as { internalStream(type: string): EntryStream }).internalStream("uint8array");
    let size = 0;
    let stopped = false;
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk) => {
      if (stopped) return;
      size += chunk.length;
      if (size > CARD_FILE_LIMIT) {
        stopped = true;
        stream.pause();
        chunks.length = 0;
        reject(new Error(`${entry.name} exceeds the 15MB extracted-file limit.`));
        return;
      }
      chunks.push(chunk);
    }).on("error", (error) => {
      stopped = true;
      chunks.length = 0;
      reject(error);
    }).on("end", () => {
      if (stopped) return;
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      resolve(bytes);
    }).resume();
  });
}

function safePath(path: string): boolean {
  return !!path && !path.startsWith("/") && !/[\\\u0000:]/.test(path) &&
    !path.split("/").some(part => part === ".." || part === "." || part === "");
}

function toImage(bytes: Uint8Array): CardImage {
  const starts = (...signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
  const ascii = (start: number, end: number) => new TextDecoder().decode(bytes.subarray(start, end));
  let mimeType: string;
  if (starts(137, 80, 78, 71, 13, 10, 26, 10)) mimeType = "image/png";
  else if (starts(255, 216, 255)) mimeType = "image/jpeg";
  else if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") mimeType = "image/webp";
  else if (["GIF87a", "GIF89a"].includes(ascii(0, 6))) mimeType = "image/gif";
  else throw new Error("The portrait is not a supported PNG, JPEG, WebP, or GIF image.");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const base64 = btoa(binary);
  return { mimeType, base64, dataUrl: `data:${mimeType};base64,${base64}` };
}

export async function readCharx(arrayBuffer: ArrayBuffer): Promise<{ card: any; image?: CardImage; warning?: string }> {
  if (arrayBuffer.byteLength > CHARX_FILE_LIMIT) throw new Error("CharX file exceeds the 100MB limit.");
  const { default: JSZip } = await import("jszip");
  let zip: InstanceType<typeof JSZip>;
  try {
    // Do not inflate the entire archive: only card.json and the selected portrait.
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch {
    throw new Error("Could not open CharX archive. It may be corrupt, encrypted, or not a ZIP file.");
  }
  if (Object.keys(zip.files).length > 10000) throw new Error("CharX archive contains too many files (maximum 10,000).");
  const entryAt = (path: string) => {
    if (!safePath(path)) throw new Error("CharX contains an invalid asset path.");
    const entry = zip.file(path);
    if (entry?.unsafeOriginalName && entry.unsafeOriginalName !== path) throw new Error("CharX contains an invalid archive path.");
    return entry;
  };
  const cardEntry = entryAt("card.json");
  if (!cardEntry) throw new Error("CharX archive is missing card.json at its root.");
  const bytes = await readEntry(cardEntry);
  let card: any;
  try { card = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new Error("CharX card.json is not valid UTF-8 JSON."); }
  if (card?.spec !== "chara_card_v3" || !card.data || typeof card.data !== "object" || Array.isArray(card.data)) {
    throw new Error("CharX card.json must contain a Character Card V3 object.");
  }

  const icons = Array.isArray(card.data.assets) ? card.data.assets.filter((asset: any) => asset?.type === "icon") : [];
  const portrait = icons.find((asset: any) => asset.name === "main") || icons[0];
  if (!portrait || portrait.uri === "ccdefault:") return { card };
  try {
    const uri = portrait.uri;
    if (typeof uri !== "string") throw new Error("The portrait has no valid asset URI.");
    if (/^https?:\/\//i.test(uri)) throw new Error("The portrait is hosted remotely; attach it separately to include it.");
    if (uri.startsWith("data:")) {
      const match = uri.match(/^data:image\/(?:png|jpeg|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i);
      if (!match) throw new Error("The embedded portrait data is not a supported image.");
      const binary = atob(match[1]);
      if (binary.length > CARD_FILE_LIMIT) throw new Error("The portrait exceeds the 15MB limit.");
      return { card, image: toImage(Uint8Array.from(binary, c => c.charCodeAt(0))) };
    }
    // The single-d spelling is mandated by CCv3; accept the common spelling too.
    const prefix = uri.startsWith("embeded://") ? "embeded://" : uri.startsWith("embedded://") ? "embedded://" : null;
    if (!prefix) throw new Error("The portrait uses an unsupported asset URI.");
    const imageEntry = entryAt(uri.slice(prefix.length));
    if (!imageEntry) throw new Error("The portrait file is missing from the archive.");
    return { card, image: toImage(await readEntry(imageEntry)) };
  } catch (error) {
    return { card, warning: `Card text imported without artwork. ${error instanceof Error ? error.message : "Could not read the portrait."}` };
  }
}

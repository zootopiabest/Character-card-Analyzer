// Self-contained, browser-side AI client.
//
// This replaces the old Express server: every request is sent directly from
// the app to the chosen provider using the user's own API key (BYOK). The
// prompt instructions are imported straight from systemInstructions.ts, so the
// app needs no backend at all and can be packaged into a mobile app.
import {
  analyzeSystemInstruction,
  compareSystemInstruction,
  groupSystemInstruction,
  multicharSystemInstruction,
  analyzeSchemaPrompt,
  compareSchemaPrompt,
  groupSchemaPrompt,
  multicharSchemaPrompt,
} from "./systemInstructions";
import { safeParseJSON } from "./utils";

export type EndpointType = "analyze" | "compare" | "group" | "multichar";

export interface RunnerConfig {
  provider: string; // "gemini" | "openrouter" | "openai" | "custom"
  apiKey: string;
  model: string | null;
  customBaseUrl?: string | null;
  thinkingMode?: boolean;
  reasoningEffort?: string;
}

interface ImagePart {
  mimeType: string;
  base64: string;
}

const SYSTEM_CONTENT: Record<EndpointType, string> = {
  analyze: analyzeSystemInstruction + analyzeSchemaPrompt,
  compare: compareSystemInstruction + compareSchemaPrompt,
  group: groupSystemInstruction + groupSchemaPrompt,
  multichar: multicharSystemInstruction + multicharSchemaPrompt,
};

function providerLabel(provider: string): string {
  if (provider === "openai") return "OpenAI";
  if (provider === "custom") return "the custom endpoint";
  if (provider === "gemini") return "Gemini";
  return "OpenRouter";
}

// Mirror the model-name handling the old server did, so existing saved model
// strings keep working across providers.
function normalizeModel(model: string | null | undefined, provider: string): string {
  if (!model || !model.trim()) {
    if (provider === "openrouter") return "Google/Gemini-3.5-flash";
    if (provider === "openai") return "gpt-5.5";
    return "gemini-3.5-flash";
  }
  let m = model.trim();
  if (provider === "openrouter") {
    if (m.toLowerCase().startsWith("gemini-")) m = "google/" + m;
  } else if (provider === "gemini") {
    m = m.replace(/^google\//i, "");
  }
  return m;
}

function chatCompletionsUrl(provider: string, customBaseUrl?: string | null): string {
  if (provider === "custom" && customBaseUrl && customBaseUrl.trim()) {
    const base = customBaseUrl.trim();
    return base.endsWith("/chat/completions")
      ? base
      : base.replace(/\/+$/, "") + "/chat/completions";
  }
  if (provider === "openai") return "https://api.openai.com/v1/chat/completions";
  return "https://openrouter.ai/api/v1/chat/completions";
}

// OpenAI-compatible providers: OpenRouter, OpenAI, and any custom endpoint that
// speaks the /chat/completions format.
async function callOpenAICompatible(
  endpoint: EndpointType,
  userText: string,
  images: ImagePart[],
  cfg: RunnerConfig
): Promise<string> {
  const url = chatCompletionsUrl(cfg.provider, cfg.customBaseUrl);

  const userContent: any = images.length
    ? [
        { type: "text", text: userText },
        ...images.map((img) => ({
          type: "image_url",
          image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
        })),
      ]
    : userText;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.apiKey.trim()}`,
    "Content-Type": "application/json",
  };
  if (cfg.provider === "openrouter") {
    headers["HTTP-Referer"] =
      (typeof window !== "undefined" && window.location?.origin) || "https://loresieve.app";
    headers["X-Title"] = "LoreSieve Character Audit";
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: normalizeModel(cfg.model, cfg.provider),
      messages: [
        { role: "system", content: SYSTEM_CONTENT[endpoint] },
        { role: "user", content: userContent },
      ],
      ...(cfg.provider === "openai" && { response_format: { type: "json_object" } }),
      ...(cfg.thinkingMode && { reasoning_effort: cfg.reasoningEffort || "medium" }),
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    if (res.status === 429) {
      throw new Error(
        "Rate limit reached (429). The provider is busy or your quota is used up. Wait a bit or switch models."
      );
    }
    if (res.status === 401) {
      throw new Error(`Authorization failed (401). Check that your ${providerLabel(cfg.provider)} API key is correct.`);
    }
    throw new Error(`${providerLabel(cfg.provider)} error ${res.status}: ${errText}`);
  }

  const json: any = await res.json();
  if (!json.choices?.[0]?.message) {
    throw new Error("The provider returned no usable output. Try again or switch models.");
  }
  return json.choices[0].message.content || "{}";
}

// Google Gemini via its REST API (works directly from the browser with an API key).
async function callGemini(
  endpoint: EndpointType,
  userText: string,
  images: ImagePart[],
  cfg: RunnerConfig
): Promise<string> {
  const model = normalizeModel(cfg.model, "gemini");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(cfg.apiKey.trim())}`;

  const parts: any[] = [{ text: userText }];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_CONTENT[endpoint] }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        // -1 = let the model decide its own thinking budget when thinking is on.
        ...(cfg.thinkingMode && { thinkingConfig: { thinkingBudget: -1 } }),
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    if (res.status === 429) {
      throw new Error(
        "Rate limit reached (429). Gemini is busy or your free quota is used up. Wait a bit or switch models."
      );
    }
    if ((res.status === 400 || res.status === 403) && /api[_ ]?key/i.test(errText)) {
      throw new Error("Gemini rejected the API key. Double-check your Gemini API key.");
    }
    throw new Error(`Gemini error ${res.status}: ${errText}`);
  }

  const json: any = await res.json();
  const text = (json.candidates?.[0]?.content?.parts || [])
    .map((p: any) => p.text || "")
    .join("");
  return text || "{}";
}

// Models sometimes omit fields or return null where the UI expects an array.
// Coerce the known list/object fields to safe defaults so rendering and export
// can never crash on a missing field.
const asArray = (v: any): any[] => (Array.isArray(v) ? v : []);
const asObject = (v: any): any => (v && typeof v === "object" ? v : {});

function normalizeAnalysis(d: any): any {
  const data = asObject(d);
  data.observations = asArray(data.observations);
  if (data.visualComparison) {
    data.visualComparison.matches = asArray(data.visualComparison.matches);
    data.visualComparison.mismatches = asArray(data.visualComparison.mismatches);
  }
  return data;
}

function normalizeResult(endpoint: EndpointType, d: any): any {
  if (endpoint === "analyze") return normalizeAnalysis(d);
  if (endpoint === "compare") {
    const data = asObject(d);
    data.original = normalizeAnalysis(data.original);
    data.remake = normalizeAnalysis(data.remake);
    data.comparison = asObject(data.comparison);
    data.comparison.whatImproved = asArray(data.comparison.whatImproved);
    data.comparison.whatRegressed = asArray(data.comparison.whatRegressed);
    data.comparison.verdictScorecard = asObject(data.comparison.verdictScorecard);
    return data;
  }
  if (endpoint === "group") {
    const data = asObject(d);
    data.synergyAnalysis = asObject(data.synergyAnalysis);
    data.synergyAnalysis.redundancyWarnings = asArray(data.synergyAnalysis.redundancyWarnings);
    data.characterBreakdowns = asArray(data.characterBreakdowns);
    data.groupScenarios = asObject(data.groupScenarios);
    return data;
  }
  // multichar
  const data = asObject(d);
  data.characterAssessments = asArray(data.characterAssessments);
  data.worldAndSystemAnalysis = asObject(data.worldAndSystemAnalysis);
  data.playScenarios = asObject(data.playScenarios);
  return data;
}

async function run(
  endpoint: EndpointType,
  userText: string,
  images: ImagePart[],
  cfg: RunnerConfig
): Promise<any> {
  if (!cfg.apiKey || !cfg.apiKey.trim()) {
    throw new Error(
      "No API key set. Open the 'Model & API Key Settings' panel, choose your provider, and paste your own API key."
    );
  }
  const raw =
    cfg.provider === "gemini"
      ? await callGemini(endpoint, userText, images, cfg)
      : await callOpenAICompatible(endpoint, userText, images, cfg);
  return normalizeResult(endpoint, safeParseJSON(raw));
}

function analyzerNotesBlock(notes: string | null | undefined): string {
  if (!notes || !notes.trim()) return "";
  return `\n[OOC/ANALYZER NOTES - EXTERNAL CONTEXT FOR YOU, THE AUDITOR]\nCRITICAL INSTRUCTION: The user has provided the following external context. You MUST take this into account when evaluating the card and DO NOT penalize choices that are explicitly justified by these notes:\n"""\n${notes}\n"""`;
}

export function runAnalyze(
  p: {
    description: string;
    imageBase64: string | null;
    imageMimeType: string | null;
    analyzerNotes: string | null;
  },
  cfg: RunnerConfig
): Promise<any> {
  const userText = `Analyze the following character card/description instructions intended for an LLM runtime.\n\nCHARACTER DESCRIPTION / INSTRUCTIONS:\n"""\n${p.description}\n"""${analyzerNotesBlock(p.analyzerNotes)}`;
  const images: ImagePart[] =
    p.imageBase64 && p.imageMimeType ? [{ mimeType: p.imageMimeType, base64: p.imageBase64 }] : [];
  return run("analyze", userText, images, cfg);
}

export function runCompare(
  p: { originalDescription: string; remakeDescription: string },
  cfg: RunnerConfig
): Promise<any> {
  const userText = `Compare original vs remake character designs.\n\nORIGINAL CHARACTER DESCRIPTION:\n"""\n${p.originalDescription}\n"""\n\nREMAKE CHARACTER DESCRIPTION:\n"""\n${p.remakeDescription}\n"""`;
  return run("compare", userText, [], cfg);
}

export function runGroup(
  p: { characters: Array<{ name: string; description: string }> },
  cfg: RunnerConfig
): Promise<any> {
  const userText = p.characters
    .map((c, i) => `CHAR_${i + 1} (${c.name}):\n${c.description}`)
    .join("\n\n------\n\n");
  return run("group", userText, [], cfg);
}

export function runMultichar(p: { description: string }, cfg: RunnerConfig): Promise<any> {
  const userText = `MULTI-CHARACTER CARD DATA TO ANALYZE:\n\n${p.description}`;
  return run("multichar", userText, [], cfg);
}

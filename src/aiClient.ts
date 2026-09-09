// Self-contained, browser-side AI client.
//
// This replaces the old Express server: every request is sent directly from
// the app to the chosen provider using the user's own API key (BYOK). The
// prompt instructions are imported straight from systemInstructions.ts, so the
// app needs no backend at all and can be packaged into a mobile app.
import { buildPrompt } from "./systemInstructions";
import type { ImmersionModuleId } from "./immersionModules";
import { safeParseJSON } from "./utils";
import { normalizeResult } from "./resultValidation";
import { DEFAULT_GEMINI_MODEL, DEFAULT_OPENROUTER_MODEL, selectLatestModel } from "./data/models";

export type EndpointType = "analyze" | "compare" | "group" | "multichar";

export interface RunnerConfig {
  provider: string; // "gemini" | "openrouter" | "openai" | "custom"
  apiKey: string;
  model: string | null;
  customBaseUrl?: string | null;
  thinkingMode?: boolean;
  reasoningEffort?: string;
  // User-selected optional immersion modules; only these are requested from
  // the model (the schema is assembled per request), so unchecked modules
  // cost zero output tokens.
  modules?: ImmersionModuleId[];
  maxOutputTokens?: number;
}

interface ProviderReply { text: string; model: string; }

interface ImagePart {
  mimeType: string;
  base64: string;
}

// The system prompt is assembled per request so it only demands the immersion
// modules the user actually enabled.
function systemContent(endpoint: EndpointType, cfg: RunnerConfig): string {
  return buildPrompt(endpoint, cfg.modules ?? []);
}

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
    if (provider === "openrouter") return DEFAULT_OPENROUTER_MODEL;
    if (provider === "openai") return "gpt-5.5";
    return DEFAULT_GEMINI_MODEL;
  }
  let m = model.trim();
  if (provider === "openrouter") {
    // OpenRouter model slugs are all-lowercase and case-sensitive; fix up
    // anything typed or saved with capital letters.
    m = m.toLowerCase();
    if (m.startsWith("gemini-")) m = "google/" + m;
  } else if (provider === "gemini") {
    m = m.replace(/^google\//i, "");
  }
  return m;
}

function chatCompletionsUrl(provider: string, customBaseUrl?: string | null): string {
  if (provider === "custom") {
    if (!customBaseUrl?.trim()) throw new Error("Enter the custom endpoint URL before running an analysis.");
    let parsed: URL;
    try { parsed = new URL(customBaseUrl.trim()); } catch { throw new Error("Enter a valid http:// or https:// custom endpoint URL."); }
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error("Use an http:// or https:// endpoint URL without credentials, query parameters, or a fragment.");
    }
    const base = parsed.href.replace(/\/+$/, "");
    return base.endsWith("/chat/completions") ? base : base + "/chat/completions";
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
): Promise<ProviderReply> {
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
        { role: "system", content: systemContent(endpoint, cfg) },
        { role: "user", content: userContent },
      ],
      ...(cfg.provider === "openai" && { response_format: { type: "json_object" } }),
      ...(cfg.thinkingMode && (cfg.provider === "openrouter"
        ? { reasoning: { effort: cfg.reasoningEffort || "medium", exclude: true } }
        : { reasoning_effort: cfg.reasoningEffort || "medium" })),
      // OpenAI's newer (reasoning) models reject the legacy `max_tokens` field
      // and require `max_completion_tokens` instead. Reasoning tokens also
      // count against this budget, so give OpenAI more headroom.
      ...(cfg.provider === "openai"
        ? { max_completion_tokens: cfg.maxOutputTokens }
        : { max_tokens: cfg.maxOutputTokens }),
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
  const choice = json.choices[0];
  if (choice.finish_reason === "length") throw new Error("The report reached its output-token limit. Increase Report Output Limit or disable some optional modules, then retry.");
  if (choice.message.refusal || choice.finish_reason === "content_filter") throw new Error("The provider declined this analysis. No report was generated. Try a different provider or model.");
  const content = choice.message.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("The provider returned an empty answer. No report was generated. Try again or choose another model.");
  return { text: content, model: typeof json.model === "string" ? json.model : normalizeModel(cfg.model, cfg.provider) };
}

// Google Gemini via its REST API (works directly from the browser with an API key).
async function callGemini(
  endpoint: EndpointType,
  userText: string,
  images: ImagePart[],
  cfg: RunnerConfig
): Promise<ProviderReply> {
  const model = normalizeModel(cfg.model, "gemini");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  const parts: any[] = [{ text: userText }];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  const res = await fetch(url, {
    method: "POST",
    // Send the key as a header rather than in the URL so it can't end up in
    // request logs or browser history.
    headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey.trim() },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemContent(endpoint, cfg) }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        maxOutputTokens: cfg.maxOutputTokens,
        responseMimeType: "application/json",
        // Gemini 2.5 uses token budgets; Gemini 3 uses thinking levels.
        ...(cfg.thinkingMode && { thinkingConfig: model.startsWith("gemini-2.5-")
          ? { thinkingBudget: Math.min(({ low: 1024, medium: 8192, high: 16384 }[cfg.reasoningEffort || "medium"] || 8192), Math.max(128, (cfg.maxOutputTokens || 32768) - 1024)) }
          : { thinkingLevel: cfg.reasoningEffort || "medium" } }),
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
  const candidate = json.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") throw new Error("The report reached its output-token limit. Increase Report Output Limit or disable some optional modules, then retry.");
  if (json.promptFeedback?.blockReason || (candidate?.finishReason && candidate.finishReason !== "STOP")) throw new Error("Gemini did not complete this analysis. Try another model or provider.");
  const text = (candidate?.content?.parts || [])
    .filter((p: any) => !p.thought)
    .map((p: any) => p.text || "")
    .join("");
  if (!text.trim()) throw new Error("Gemini returned an empty answer. No report was generated. Try again or choose another model.");
  return { text, model };
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
  if (!["gemini", "openrouter", "openai", "custom"].includes(cfg.provider)) throw new Error("Select a supported provider.");
  // Validate the destination before any request, including model discovery.
  if (cfg.provider === "custom") {
    chatCompletionsUrl(cfg.provider, cfg.customBaseUrl);
    if (!cfg.model?.trim()) throw new Error("Enter your custom endpoint’s exact model ID.");
  }
  let model = normalizeModel(cfg.model, cfg.provider);
  let maxOutputTokens = cfg.maxOutputTokens ?? (endpoint === "analyze" ? 16384 : 32768);
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1024 || maxOutputTokens > 131072) throw new Error("Report Output Limit must be between 1,024 and 131,072 tokens.");
  if (model.startsWith("~") && cfg.provider !== "openrouter") throw new Error("OpenRouter latest aliases require the OpenRouter provider.");
  if (model.startsWith("latest:")) {
    if (cfg.provider !== "openrouter") throw new Error("Latest model choices require the OpenRouter provider.");
    let catalog: any;
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("catalog unavailable");
      catalog = await response.json();
    } catch {
      throw new Error("Could not check OpenRouter’s latest models. Retry or select a pinned model; no analysis request was sent.");
    }
    if (!Array.isArray(catalog?.data)) throw new Error("OpenRouter returned an invalid model catalog. Choose a pinned model or retry.");
    const resolved = selectLatestModel(model, catalog.data);
    model = resolved.id;
    const ceiling = resolved.top_provider?.max_completion_tokens;
    if (typeof ceiling === "number" && ceiling > 0) maxOutputTokens = Math.min(maxOutputTokens, ceiling);
    if (images.length && resolved.architecture?.input_modalities && !resolved.architecture.input_modalities.includes("image")) {
      throw new Error(`${model} does not accept images. Remove the art for a text-only audit, or choose a vision-capable model.`);
    }
  }
  cfg = { ...cfg, model, maxOutputTokens };
  const reply =
    cfg.provider === "gemini"
      ? await callGemini(endpoint, userText, images, cfg)
      : await callOpenAICompatible(endpoint, userText, images, cfg);
  let parsed: any;
  try {
    parsed = safeParseJSON(reply.text);
  } catch {
    throw new Error(
      "The AI returned malformed JSON. Retry, increase Report Output Limit, or disable optional modules. No grades were substituted."
    );
  }
  return { ...normalizeResult(endpoint, parsed), requestModel: reply.model };
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

export function runMultichar(
  p: { description: string; analyzerNotes?: string | null },
  cfg: RunnerConfig
): Promise<any> {
  const userText = `MULTI-CHARACTER CARD DATA TO ANALYZE:\n\n${p.description}${analyzerNotesBlock(p.analyzerNotes)}`;
  return run("multichar", userText, [], cfg);
}

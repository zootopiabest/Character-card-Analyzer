// Native OpenRouter aliases verified against /api/v1/models and:
// https://openrouter.ai/docs/guides/routing/routers/latest-resolution
// DeepSeek Pro has no published latest alias (its lookup returns 404), so the
// lone "latest:" app selector resolves the newest standard Pro release at run time.
export const OPENROUTER_MODELS = [
  { id: "~google/gemini-flash-latest", label: "Gemini Flash — Latest" },
  { id: "~google/gemini-pro-latest", label: "Gemini Pro — Latest" },
  { id: "~deepseek/deepseek-v4-flash-latest", label: "DeepSeek Flash — Latest" },
  { id: "latest:deepseek-pro", label: "DeepSeek Pro — Latest" },
  { id: "~anthropic/claude-opus-latest", label: "Claude Opus — Latest" },
  { id: "~anthropic/claude-sonnet-latest", label: "Claude Sonnet — Latest" },
  { id: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];
export const DEFAULT_OPENROUTER_MODEL = OPENROUTER_MODELS[0].id;
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export interface CatalogModel {
  id: string;
  created?: number;
  top_provider?: { max_completion_tokens?: number | null };
  architecture?: { input_modalities?: string[] };
}

const families: Record<string, RegExp> = {
  "~google/gemini-flash-latest": /^google\/gemini-(\d+(?:\.\d+)*)-flash(?:-preview)?$/,
  "~google/gemini-pro-latest": /^google\/gemini-(\d+(?:\.\d+)*)-pro(?:-preview)?$/,
  "~deepseek/deepseek-v4-flash-latest": /^deepseek\/deepseek-v(\d+(?:\.\d+)*)-flash(?:-\d{4,8})?$/,
  "latest:deepseek-pro": /^deepseek\/deepseek-v(\d+(?:\.\d+)*)-pro(?:-\d{4,8})?$/,
  "~anthropic/claude-opus-latest": /^anthropic\/claude-opus-(\d+(?:\.\d+)*)$/,
  "~anthropic/claude-sonnet-latest": /^anthropic\/claude-sonnet-(\d+(?:\.\d+)*)$/,
};

export function selectLatestModel(selector: string, catalog: CatalogModel[]): CatalogModel {
  const pattern = families[selector];
  if (!pattern) throw new Error("Unknown latest-model family. Choose a model from the list.");
  const matches = catalog.flatMap(model => {
    const match = model && typeof model.id === "string" && model.id.match(pattern);
    return match ? [{ model, version: match[1].split(".").map(Number) }] : [];
  });
  matches.sort((a, b) => {
    for (let i = 0; i < Math.max(a.version.length, b.version.length); i++) {
      const difference = (b.version[i] || 0) - (a.version[i] || 0);
      if (difference) return difference;
    }
    // Prefer a stable release to the preview of that same version.
    const preview = Number(a.model.id.endsWith("-preview")) - Number(b.model.id.endsWith("-preview"));
    return preview || (b.model.created || 0) - (a.model.created || 0) || a.model.id.localeCompare(b.model.id);
  });
  if (!matches.length) throw new Error("OpenRouter has no matching release for this model family. Choose a pinned model or enter an exact ID.");
  return matches[0].model;
}

export function migrateModel(provider: string, model: string): string {
  const corrected = model.replace(/anthropic\/claude-(\d+(?:\.\d+)*?)-(opus|sonnet)$/, "anthropic/claude-$2-$1");
  if (provider === "gemini" && /^gemini-3\.[567]-flash$/.test(model)) return DEFAULT_GEMINI_MODEL;
  if (provider !== "openrouter") return corrected;
  if (OPENROUTER_MODELS.some(option => option.id === corrected)) return corrected;
  if (/^google\/gemini-.*flash/.test(corrected) || corrected.startsWith("google/gemma-")) return DEFAULT_OPENROUTER_MODEL;
  for (const [selector, pattern] of Object.entries(families)) if (pattern.test(corrected)) return selector;
  return corrected; // Preserve manually entered model IDs.
}

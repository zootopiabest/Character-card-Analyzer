import { DEFAULT_GEMINI_MODEL, DEFAULT_OPENROUTER_MODEL, migrateModel } from "./data/models";

export const PROVIDERS = [
  { id: "gemini", label: "Google Gemini", defaultModel: DEFAULT_GEMINI_MODEL },
  { id: "openrouter", label: "OpenRouter", defaultModel: DEFAULT_OPENROUTER_MODEL },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-5.5" },
  { id: "custom", label: "Custom", defaultModel: "" },
];

export function readProviderSettings(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, provider: string) {
  const definition = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];
  // The legacy key belongs only to the provider selected when upgrading.
  const legacyOwner = storage.getItem("loresieve_selected_provider") || "gemini";
  const prefix = `loresieve_${provider}_`;
  const legacyKey = provider === legacyOwner ? storage.getItem("loresieve_custom_api_key") : null;
  const key = storage.getItem(prefix + "api_key") ?? legacyKey ?? "";
  const oldModel = provider === legacyOwner ? storage.getItem("loresieve_selected_model") : null;
  const model = migrateModel(provider, storage.getItem(prefix + "model") ?? oldModel ?? definition.defaultModel);
  const baseUrl = storage.getItem(prefix + "base_url") ?? (provider === "custom" ? storage.getItem("loresieve_custom_base_url") : null) ?? "";
  storage.setItem(prefix + "api_key", key);
  storage.setItem(prefix + "model", model);
  storage.setItem(prefix + "base_url", baseUrl);
  if (provider === legacyOwner) {
    storage.removeItem("loresieve_custom_api_key");
    storage.removeItem("loresieve_selected_model");
    if (provider === "custom") storage.removeItem("loresieve_custom_base_url");
  }
  return { apiKey: key, model, baseUrl };
}

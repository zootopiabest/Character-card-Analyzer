// Pure helpers behind the OpenRouter model browser: trim OpenRouter's public
// /api/v1/models catalog to the fields the browser shows, then filter + sort.
// Fetching lives in aiClient.ts with the other provider calls.

export interface BrowserModel {
  id: string;
  name: string;
  author: string;
  created: number;
  contextLength: number;
  // USD per 1M tokens; null when OpenRouter lists no fixed price (routers).
  inputPrice: number | null;
  outputPrice: number | null;
  description: string;
  vision: boolean;
}

export type CatalogSort = "newest" | "context" | "name";

function perMillion(raw: unknown): number | null {
  const n = typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n * 1_000_000 : null;
}

export function toBrowserModels(data: unknown): BrowserModel[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((m: any) => {
    if (!m || typeof m.id !== "string" || !m.id.includes("/")) return [];
    return [{
      id: m.id,
      name: typeof m.name === "string" && m.name ? m.name : m.id,
      author: m.id.split("/")[0],
      created: typeof m.created === "number" ? m.created : 0,
      contextLength: typeof m.context_length === "number" ? m.context_length : 0,
      inputPrice: perMillion(m.pricing?.prompt),
      outputPrice: perMillion(m.pricing?.completion),
      description: typeof m.description === "string" ? m.description.slice(0, 1200) : "",
      vision: Array.isArray(m.architecture?.input_modalities) && m.architecture.input_modalities.includes("image"),
    }];
  });
}

// Provider chips, ordered by each provider's most recent release.
export function catalogAuthors(models: BrowserModel[]): string[] {
  const latest = new Map<string, number>();
  for (const m of models) latest.set(m.author, Math.max(latest.get(m.author) ?? 0, m.created));
  return [...latest.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([a]) => a);
}

export function filterAndSortModels(
  models: BrowserModel[],
  opts: { query: string; author: string | null; sort: CatalogSort; descending: boolean }
): BrowserModel[] {
  const terms = opts.query.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = models.filter(m => {
    if (opts.author && m.author !== opts.author) return false;
    const haystack = `${m.name} ${m.id}`.toLowerCase();
    return terms.every(t => haystack.includes(t));
  });
  const compare = (a: BrowserModel, b: BrowserModel) =>
    opts.sort === "name" ? a.name.localeCompare(b.name)
    : opts.sort === "context" ? a.contextLength - b.contextLength
    : a.created - b.created;
  // "Descending" means newest / largest first, but A→Z first for names.
  const sign = (opts.sort === "name" ? !opts.descending : opts.descending) ? -1 : 1;
  return matched.sort((a, b) => sign * compare(a, b) || a.id.localeCompare(b.id));
}

export function formatPrice(price: number | null): string {
  if (price === null) return "—";
  if (price === 0) return "Free";
  return `$${price < 0.01 ? price.toPrecision(2) : price.toFixed(2)}`;
}

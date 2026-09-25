import { useEffect, useMemo, useState } from "react";
import { OPENROUTER_MODELS } from "../data/models";
import { fetchOpenRouterCatalog } from "../aiClient";
import {
  catalogAuthors,
  filterAndSortModels,
  formatPrice,
  type BrowserModel,
  type CatalogSort,
} from "../data/openrouterCatalog";

// Searchable browser over OpenRouter's full public model catalog. The
// curated "Latest" aliases stay available under the Recommended chip.

const CACHE_KEY = "loresieve_openrouter_catalog";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RECOMMENDED = "__recommended__";

function readCache(): { fetchedAt: number; models: BrowserModel[] } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    return raw && Array.isArray(raw.models) && typeof raw.fetchedAt === "number" ? raw : null;
  } catch {
    return null;
  }
}

const SORTS: { id: CatalogSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "context", label: "Context Length" },
  { id: "name", label: "Name" },
];

const chip = (active: boolean) =>
  `shrink-0 whitespace-nowrap py-1.5 px-3 rounded-full text-[10px] font-mono font-bold tracking-wide border transition-colors ${
    active
      ? "bg-[#00F0FF]/10 border-[#00F0FF] text-[#00F0FF]"
      : "bg-[#050505] border-[#1A1A1A] text-zinc-400 hover:text-zinc-200 hover:bg-[#0A0A0A]"
  }`;

export default function OpenRouterModelBrowser({ model, setModel }: { model: string; setModel: (id: string) => void }) {
  const [cache, setCache] = useState(readCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState<string | null>(() =>
    OPENROUTER_MODELS.some(m => m.id === model) ? RECOMMENDED : null
  );
  const [sort, setSort] = useState<CatalogSort>("newest");
  const [descending, setDescending] = useState(true);
  const [infoOpen, setInfoOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const models = await fetchOpenRouterCatalog();
      const next = { fetchedAt: Date.now(), models };
      setCache(next);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      } catch {
        // Storage full or blocked: the list still works for this session.
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load OpenRouter's model list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cache || Date.now() - cache.fetchedAt > CACHE_MAX_AGE_MS) load();
  }, []);

  const catalog = cache?.models ?? [];
  const authors = useMemo(() => catalogAuthors(catalog), [catalog]);
  const visible = useMemo(
    () => author === RECOMMENDED ? [] : filterAndSortModels(catalog, { query, author, sort, descending }),
    [catalog, query, author, sort, descending]
  );
  const recommended = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return OPENROUTER_MODELS.filter(m => terms.every(t => `${m.label} ${m.id}`.toLowerCase().includes(t)));
  }, [query]);

  const selectedLabel =
    OPENROUTER_MODELS.find(m => m.id === model)?.label ?? catalog.find(m => m.id === model)?.name ?? model;

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-mono text-zinc-500 break-all">
        Selected: <span className="text-[#00F0FF]">{selectedLabel}</span>
        {selectedLabel !== model && <span className="text-zinc-600"> ({model})</span>}
      </div>

      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search OpenRouter models..."
        className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-2.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#00F0FF]/60"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button type="button" onClick={() => setAuthor(RECOMMENDED)} className={chip(author === RECOMMENDED)}>
          ★ Recommended
        </button>
        <button type="button" onClick={() => setAuthor(null)} className={chip(author === null)}>
          All Providers
        </button>
        {authors.map(a => (
          <button key={a} type="button" onClick={() => setAuthor(a)} className={chip(author === a)}>
            {a}
          </button>
        ))}
      </div>

      {author !== RECOMMENDED && (
        <div className="flex gap-1.5 items-center">
          <div className="flex gap-1.5 overflow-x-auto pb-1 min-w-0 flex-1">
            {SORTS.map(s => (
              <button key={s.id} type="button" onClick={() => setSort(s.id)} className={chip(sort === s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDescending(!descending)}
            aria-label={descending ? "Sort descending" : "Sort ascending"}
            className={`${chip(false)} mb-1`}
          >
            {descending ? "↓" : "↑"}
          </button>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto space-y-2 border border-[#1A1A1A] rounded-lg p-2">
        {author === RECOMMENDED ? (
          recommended.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModel(m.id)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                m.id === model ? "border-[#00F0FF] bg-[#00F0FF]/5" : "border-[#1A1A1A] bg-[#0A0A0A] hover:border-zinc-700"
              }`}
            >
              <div className="text-xs font-bold text-zinc-100">{m.label}</div>
              <div className="text-[10px] font-mono text-zinc-500 break-all">{m.id}</div>
              <div className="text-[9px] font-mono text-zinc-500 mt-1">
                {/latest/i.test(m.id) ? "Follows the newest release automatically" : "Pinned version"}
              </div>
            </button>
          ))
        ) : visible.length ? (
          visible.map(m => (
            <div
              key={m.id}
              className={`rounded-lg border transition-colors ${
                m.id === model ? "border-[#00F0FF] bg-[#00F0FF]/5" : "border-[#1A1A1A] bg-[#0A0A0A] hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start gap-2">
                <button type="button" onClick={() => setModel(m.id)} className="flex-1 min-w-0 text-left p-3">
                  <div className="text-xs font-bold text-zinc-100 break-words">{m.name}</div>
                  <div className="text-[10px] font-mono text-zinc-500">{m.author}</div>
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-2 mt-2">
                    <span className="rounded-full bg-black border border-[#1A1A1A] px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-200">
                      {m.contextLength.toLocaleString()} tokens
                    </span>
                    <span className="grid grid-cols-2 gap-x-3 text-[10px] font-mono text-zinc-400 text-center">
                      <span className="text-zinc-500">In</span>
                      <span className="text-zinc-500">Out</span>
                      <span>{formatPrice(m.inputPrice)}</span>
                      <span>{formatPrice(m.outputPrice)}</span>
                    </span>
                    {m.vision && <span className="text-[9px] font-mono text-zinc-500">🖼 reads images</span>}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setInfoOpen(infoOpen === m.id ? null : m.id)}
                  aria-label={`About ${m.name}`}
                  aria-expanded={infoOpen === m.id}
                  className={`shrink-0 m-3 w-7 h-7 rounded-full border text-xs font-bold transition-colors ${
                    infoOpen === m.id ? "border-[#00F0FF] text-[#00F0FF]" : "border-zinc-600 text-zinc-300 hover:border-zinc-400"
                  }`}
                >
                  i
                </button>
              </div>
              {infoOpen === m.id && (
                <div className="px-3 pb-3 space-y-1 text-[10px] font-mono text-zinc-400 border-t border-[#1A1A1A] pt-2">
                  <div className="break-all text-zinc-500">{m.id}</div>
                  {m.description && <p className="leading-relaxed whitespace-pre-line">{m.description}</p>}
                  <p className="text-zinc-600">Prices are USD per million tokens.</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-[10px] font-mono text-zinc-500 p-2">
            {loading ? "Loading OpenRouter's model list…" : catalog.length ? "No models match." : "Model list not loaded yet."}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-zinc-500">
        <span>
          {error ? <span className="text-red-400">{error}</span>
            : cache ? `${catalog.length} models · updated ${new Date(cache.fetchedAt).toLocaleDateString()}`
            : loading ? "Loading…" : ""}
        </span>
        <button type="button" onClick={load} disabled={loading} className="uppercase hover:text-[#00F0FF] disabled:opacity-50 disabled:cursor-wait">
          {loading ? "Refreshing…" : "⟳ Refresh list"}
        </button>
      </div>
    </div>
  );
}

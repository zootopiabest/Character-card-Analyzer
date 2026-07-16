# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A client-only React/Vite app that uses an LLM as a judge to rate AI-roleplay "character cards" on slop, originality, cohesion, tropes, and (when art is supplied) how well the image matches the writing. It is **BYOK (bring-your-own-key)**: there is **no backend**. Every analysis is a `fetch` sent straight from the browser/WebView to the AI provider the user picked, using the user's own API key. This constraint is load-bearing — the app is packaged into an Android APK via Capacitor, where a server could not run. Do not reintroduce a server, a build-time env-var API key, or any embedded secret.

## Commands

```bash
npm install          # install deps
npm run dev          # dev server at http://localhost:5173
npm run lint         # tsc --noEmit — the ONLY check; there is no test suite and no ESLint
npm run build        # tsc-less vite production build into dist/
npm run cap:android  # build + cap sync + open Android Studio (APK build happens in Studio)
```

There are **no tests**. After any change, run `npm run lint` and `npm run build` — a green build is the bar. The build emits a >500 kB chunk-size warning; that is expected, not a regression.

## Architecture

The app has four analysis **modes** (`appMode` in `src/App.tsx`): `audit` (single card), `comparison` (original vs remake), `group` (multi-card synergy), `multichar` (one file containing many characters / an RPG world). Each mode is a triplet:

- an **input component** (`CardInput` / `ComparisonInput` / `GroupInput`) that gathers text + optional image + settings,
- a **handler** in `App.tsx` (`handleAnalyze` / `handleCompare` / `handleGroup` / `handleMultiCharAnalyze`) that calls the matching runner,
- a **view component** (`ComparisonView` / `GroupView` / `MultiCharView`; single audit renders inline in `App.tsx`).

Note `CardInput` is reused for both `audit` and `multichar` modes — in multichar it's passed `supportsVisualAudit={false}` because that mode extracts embedded card text but does not send the image to the model.

### The request path (`src/aiClient.ts`)

`aiClient.ts` **is the former server**, ported into the browser. `runAnalyze/runCompare/runGroup/runMultichar` build the user-message text, then `run()` dispatches to either:
- `callGemini()` — Google's REST `generateContent` (key sent via `x-goog-api-key` header), or
- `callOpenAICompatible()` — OpenRouter / OpenAI / any custom `/chat/completions` endpoint.

Provider-specific quirks live **only** here and must stay there:
- **OpenAI** requires `max_completion_tokens` (not `max_tokens`, which its reasoning models reject) and takes `response_format: json_object`.
- **OpenRouter** model slugs are lowercase + case-sensitive; `normalizeModel()` lowercases them.
- Every raw response goes through `safeParseJSON()` (strips markdown fences, extracts the first `{…}`/`[…]`) then `normalizeResult()`, which coerces expected arrays/objects to safe defaults so a model that omits a field can't crash a view. When adding a field a view reads directly (e.g. `data.x.y.score`), add a matching guard in `normalizeResult()`.

### The prompts (`src/systemInstructions.ts`)

The grading rubric is a single `SHARED_RUBRIC` constant composed into all four `*SystemInstruction` exports, so a rubric change applies to every mode at once — **keep it that way; do not fork per-mode copies.** Each mode also has a `*_SCHEMA_TEMPLATE` (the exact JSON shape demanded of the model, with a `__…MODULE_FIELDS__` placeholder token). `buildPrompt(endpoint, modules)` is the **only** entry point `aiClient.ts` uses: it concatenates instruction + module asks + schema, substituting the placeholder with fragments for exactly the immersion modules the user enabled. If you change a schema template, update the matching TypeScript interface in `src/types.ts`, the view that renders it, and the markdown generator in `src/exportUtils.ts` together — these four are a contract.

### Immersion modules (optional, toggleable report sections)

Six extra creative sections (dating profile, against-type shopping list, top songs, demise/obituary, psychoanalysis, emotional registers) are **user-toggleable per mode** and only requested from the model when checked — the schema is assembled per request, so unchecked modules cost zero output tokens. The moving parts:

- `src/immersionModules.ts` — module ids, labels, per-mode defaults (audit defaults to dating+shopping on; comparison/group/multichar default all off because they multiply output per card/character).
- `src/components/ImmersionModulesPanel.tsx` — the checkbox panel + `useImmersionModules(mode)` hook (persists to `localStorage` under `loresieve_immersion_modules_<mode>`), rendered by all three input components.
- `MODULE_PROMPTS` in `src/systemInstructions.ts` — per-module ask text + schema fragments (rich shapes for audit/comparison, compact per-character strings for group/multichar).
- `src/components/ImmersionSections.tsx` (solo results) and `src/components/CharacterModuleLines.tsx` (roster entries) — the renderers; every field is optional, render nothing when absent.

Adding a module means touching: the id list, `MODULE_PROMPTS`, the optional fields in `types.ts`, guards in `normalizeAnalysis()` if the shape is non-string, the two renderers, and `exportUtils.ts`. The rubric already declares all modules **non-scoring** — keep new ones under that rule.

### Score scales (easy to get wrong)

`overallSlopScore` / `groupSlopScore` and the visual `accuracyScore` are **0–100**. Everything else — `coreAnalysis.*.score`, `depthScore`, worldBuilding/systemRules scores, and the comparison `verdictScorecard` (originalScore/remakeScore) — is **0–10**. The UI hardcodes `/100` vs `/10` labels per field, so a mismatch between the schema example and the view is a real bug.

### Shared building blocks (use these, don't re-inline)

- **`src/components/ModelSettings.tsx`** — the one provider/model/key/base-URL/thinking-mode panel, rendered by all three input components via `<ModelSettingsPanel s={settings}/>`. State comes from the `useModelSettings()` hook, which **persists every field to `localStorage` on change** (not on submit) under `loresieve_*` keys, so a key entered in one mode is instantly available in the others. Input components read the current values off `settings` at submit time — never null out the key based on the panel's open/closed state.
- **`src/utils.ts` `readCardFile()`** — the single file reader for all inputs. Handles JSON (via `buildDescriptionFromJson`), .txt/.md/.rtf, .docx (mammoth, **dynamically imported** to keep it out of the initial bundle), and PNGs with embedded SillyTavern `chara` metadata (`tryExtractCharaMetadata` parses PNG `tEXt`/`iTXt` chunks, base64-decoding when needed). Callbacks: `onText` (with a `source` discriminator), `onImage`, `onError`.
- **`src/scoreMeta.ts` `getSlopScoreMeta()`** — shared color/style for the 0–100 hero score cards.
- **`src/data/models.ts` `OPENROUTER_MODELS`** — the single source for the OpenRouter dropdown and its default (`OPENROUTER_MODELS[0]`).

## Repo / workflow notes

- The owner has **zero coding background** and merges PRs themselves on GitHub — never assume a change is live until they confirm a merge. Explain things plainly.
- This project was scaffolded in **Google AI Studio**, which is a separate, non-synced copy. Do **not** advise using AI Studio's "Sync to GitHub" — it would overwrite the repo with a stale snapshot. GitHub is the source of truth.
- Development happens on the `claude/code-analysis-redundancy-crmpox` branch; open a fresh PR to `main` for each batch of work.
- Header stats (DB_INDEX, LATENCY) and the loading feed are intentional cyberpunk flavor, not real telemetry. The actual "don't score everything as novel" guardrail is the `CALIBRATION BASELINE` block in `SHARED_RUBRIC` — the model never sees the UI.
- Before publishing, `appId` in `capacitor.config.ts` (`com.loresieve.cardanalyzer`) should become the owner's own reverse-domain id.

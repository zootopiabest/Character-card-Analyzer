# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A client-only React/Vite app that uses an LLM as a judge to rate AI-roleplay "character cards" on slop, originality, cohesion, tropes, and (when art is supplied) how well the image matches the writing. It is **BYOK (bring-your-own-key)**: there is **no backend**. Every analysis is a `fetch` sent straight from the browser/WebView to the AI provider the user picked, using the user's own API key. This constraint is load-bearing — the app is packaged into an Android APK via Capacitor, where a server could not run. Do not reintroduce a server, a build-time env-var API key, or any embedded secret.

## Commands

```bash
npm install          # install deps
npm run dev          # dev server at http://localhost:5173
npm run lint         # tsc --noEmit
npm test             # Node 24 regression tests; mocked providers, no API charges
npm run build        # tsc-less vite production build into dist/
npm run cap:android  # build + cap sync + open Android Studio (APK build happens in Studio)
```

After any change, run `npm test`, `npm run lint`, and `npm run build`. Tests require Node 24 or newer. The build emits a >500 kB chunk-size warning; that is expected, not a regression.

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
- Every raw response goes through `safeParseJSON()` (strips markdown fences, extracts the first `{…}`/`[…]`) then `normalizeResult()` in `src/resultValidation.ts`, which validates required grades and rendered field types before a view receives them. Missing required grades, empty answers, refusals, and truncation are errors; never invent fallback grades. When adding a field a view reads directly (e.g. `data.x.y.score`), add a matching guard in `normalizeResult()`.

### The prompts (`src/systemInstructions.ts`)

The grading rubric is a single `SHARED_RUBRIC` constant composed into all four `*SystemInstruction` exports, so a rubric change applies to every mode at once — **keep it that way; do not fork per-mode copies.** Each mode also has a `*_SCHEMA_TEMPLATE` (the exact JSON shape demanded of the model, with a `__…MODULE_FIELDS__` placeholder token). `buildPrompt(endpoint, modules, efficient)` is the **only** entry point `aiClient.ts` uses: it concatenates instruction + module asks + schema, substituting the placeholder with fragments for exactly the immersion modules the user enabled. If you change a schema template, update the matching TypeScript interface in `src/types.ts`, the view that renders it, and the markdown generator in `src/exportUtils.ts` together — these four are a contract.

**Two rubrics, one standard.** `efficient=true` (the "Token-Efficient Grading" toggle in Model Settings, persisted as `loresieve_efficient_grading`) swaps the `FULL_INSTRUCTIONS` set for `EFFICIENT_INSTRUCTIONS`: a condensed `EFFICIENT_RUBRIC` (~40% of the tokens) with short per-mode coverage sections. Schemas and module fragments are shared, so results render identically. The two rubrics must agree on every judgment standard — when a rule changes in `SHARED_RUBRIC`, change its condensed counterpart in `EFFICIENT_RUBRIC` in the same commit. A regression test asserts the efficient prompt is under 70% of the full one and that both carry the key sections.

Judgment stances the rubric commits to (owner decisions — don't relitigate them in prompt edits): profiles are behavioral guides, never graded on prose style, format, or showing-vs-telling; slop is still penalized (filler, commodity phrases, contradictions — the phrase lists stay); the greeting is the one part graded as writing, with deductions limited to objective failures (spelling/grammar, contradicting the card, scripting the user, sustained purple or drab prose) — plain writing isn't a defect but earns no praise, ornament earns nothing by itself; psychoanalysis never enters scoring (module-only); every audit carries a "🔍 Detail doing the most work" observation, with "⭐" and "⚖️" entries only when warranted.

### Immersion modules (optional, toggleable report sections)

Eight extra creative sections (dating profile, against-type shopping list, top songs, demise/obituary, psychoanalysis, emotional registers, the Boring Tuesday test, three ways to piss them off) are **user-toggleable per mode** and only requested from the model when checked — the schema is assembled per request, so unchecked modules cost zero output tokens. The moving parts:

- `src/immersionModules.ts` — module ids, labels, per-mode defaults (audit defaults to dating+shopping on; comparison/group/multichar default all off because they multiply output per card/character).
- `src/components/ImmersionModulesPanel.tsx` — the checkbox panel + `useImmersionModules(mode)` hook (persists to `localStorage` under `loresieve_immersion_modules_<mode>`), rendered by all three input components.
- `MODULE_PROMPTS` in `src/systemInstructions.ts` — per-module ask text + schema fragments (rich shapes for audit/comparison, compact per-character strings for group/multichar).
- `src/components/ImmersionSections.tsx` (solo results) and `src/components/CharacterModuleLines.tsx` (roster entries) — the renderers; every field is optional, render nothing when absent.

Adding a module means touching: the id list, `MODULE_PROMPTS`, the optional fields in `types.ts`, guards in `resultValidation.ts` if the shape is non-string, the two renderers, and `exportUtils.ts`. The rubric already declares all modules **non-scoring** — keep new ones under that rule.

### Score scales (easy to get wrong)

`overallSlopScore` / `groupSlopScore` and the visual `accuracyScore` are **0–100**. Everything else — `coreAnalysis.*.score`, `depthScore`, worldBuilding/systemRules scores, and the comparison `verdictScorecard` (originalScore/remakeScore) — is **0–10**. The UI hardcodes `/100` vs `/10` labels per field, so a mismatch between the schema example and the view is a real bug.

### Shared building blocks (use these, don't re-inline)

- **`src/components/ModelSettings.tsx`** — the one provider/model/key/base-URL/thinking-mode panel, rendered by all three input components via `<ModelSettingsPanel s={settings}/>`. State comes from the `useModelSettings()` hook, which **persists every field to `localStorage` on change** (not on submit). Provider keys, model selections, and base URLs use separate `loresieve_<provider>_*` keys, with legacy migration in `providerSettings.ts`, so a key entered in one mode is instantly available in the others. Input components read the current values off `settings` at submit time — never null out the key based on the panel's open/closed state.
- **`src/utils.ts` `readCardFile()`** — the single file reader for all inputs. Handles JSON (via `buildDescriptionFromJson`), .txt/.md/.rtf, .docx (mammoth, **dynamically imported** to keep it out of the initial bundle), and PNGs with embedded SillyTavern `chara` metadata (async `tryExtractCharaMetadata` parses PNG `tEXt`/`iTXt`/`zTXt` chunks and prefers `ccv3` metadata, base64-decoding when needed). Callbacks: `onText` (with a `source` discriminator), `onImage`, `onError`.
- **`src/scoreMeta.ts` `getSlopScoreMeta()`** — shared color/style for the 0–100 hero score cards.
- **`src/data/models.ts` `OPENROUTER_MODELS`** — the single source for labeled OpenRouter choices and `DEFAULT_OPENROUTER_MODEL`. Use verified native `~author/family-latest` aliases; DeepSeek Pro alone uses a catalog selector because it has no published alias. Report `requestModel` is the concrete response model when the provider supplies it.

## Repo / workflow notes

- The owner has **zero coding background** and merges PRs themselves on GitHub — never assume a change is live until they confirm a merge. Explain things plainly.
- This project was scaffolded in **Google AI Studio**, which is a separate, non-synced copy. Do **not** advise using AI Studio's "Sync to GitHub" — it would overwrite the repo with a stale snapshot. GitHub is the source of truth.
- Open a fresh PR to `main` for each batch of work.
- **Two release lines, by owner decision.** `main` is the **uncensored local build**: no age gate and no content refusal rule — do not add either to `main`. `public-release` is the **store/public build**: `main` plus the `AgeGate` first-launch 18+ overlay, the `MANDATORY SAFETY REFUSAL` block at the top of `SHARED_RUBRIC`, and the matching `{"refusal": ...}` detection in `aiClient.ts` `run()` (it must run before `normalizeResult`, which would otherwise reject the refusal shape as an invalid report). Keep `public-release` current by merging `main` into it; never merge it the other direction. The `ReportOutputButton` (mailto feedback) lives on both lines.
- Header stats (DB_INDEX, LATENCY) and the loading feed are intentional cyberpunk flavor, not real telemetry. The actual "don't score everything as novel" guardrail is the `CALIBRATION BASELINE` block in `SHARED_RUBRIC` — the model never sees the UI.
- Before publishing, `appId` in `capacitor.config.ts` (`com.loresieve.cardanalyzer`) should become the owner's own reverse-domain id.

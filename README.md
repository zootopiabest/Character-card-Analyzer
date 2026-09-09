# Character Card Analyzer

A self-contained web app that rates character cards on slop, originality, tropes,
cohesion, and how well the card art matches the description.

This app is **bring-your-own-key (BYOK)**: there is no server. Every analysis is
sent directly from the app to the AI provider you choose, using **your own API
key**. Nothing runs in the background and no key is ever shipped inside the app.

Supported providers: **Google Gemini**, **OpenRouter**, **OpenAI**, and any
**custom** OpenAI-compatible endpoint. You enter your key in the app under
"Model & API Key Settings".

## Install it as an app (iPhone, Android, desktop)

The web version is published automatically from the `main` branch at:

**https://zootopiabest.github.io/Character-card-Analyzer/**

It installs like a normal app — no store, no account, no expiry:

- **iPhone / iPad:** open the link in Safari, tap **Share**, then **Add to Home
  Screen**.
- **Android:** open the link in Chrome, tap the **⋮** menu, then **Install app**
  (or **Add to Home screen**).
- **Desktop (Chrome / Edge):** click the install icon at the right end of the
  address bar.

The version number in the header (`Auditor vX.Y.Z`) and the build hash in the
footer change with every update, so you can tell at a glance whether a new
version has reached your device.

Your API key and settings are stored on your device only. The app shell works
offline; analyses still need a connection to your chosen AI provider. If you
point the custom-endpoint option at a server you run yourself (for example a
local Ollama), that server must allow browser requests (CORS) for the web
version to reach it — the Android APK does not have this limitation.

---

## Run it on your computer (for development)

**You need:** [Node.js](https://nodejs.org) installed.

```bash
npm install      # one time, downloads dependencies
npm run dev      # starts the app at http://localhost:5173
```

To make the optimized version that goes into the mobile app:

```bash
npm run build    # outputs the finished app into the dist/ folder
npm run preview  # (optional) preview that built version locally
```

---

## Build an Android app (APK) with Capacitor

This wraps the web app into a real installable Android app. The app file talks
to the AI providers directly, so it still needs no server.

**You need:** [Android Studio](https://developer.android.com/studio) installed
(it brings the Android SDK and a JDK).

First time only — create the Android project:

```bash
npm install
npm run build
npx cap add android
```

Each time you change the app and want to rebuild:

```bash
npm run cap:android
```

That builds the web app, copies it into the Android project, and opens Android
Studio. In Android Studio, choose **Build → Generate Signed Bundle / APK** to
produce an installable file. The first time, Android Studio walks you through
creating a *signing key* — keep that key file safe; you need it for every future
update.

> Before publishing, change `appId` in `capacitor.config.ts` from
> `com.loresieve.cardanalyzer` to your own reverse-domain identifier
> (e.g. `com.yourname.cardanalyzer`).

## Model choices and report reliability

OpenRouter offers Latest choices for Gemini Flash/Pro, DeepSeek Flash/Pro, and
Claude Opus/Sonnet. These follow new releases automatically. The picker also
keeps Claude Opus 4.6, Gemini 3.1 Pro, and Gemini 2.5 Pro pinned.

Latest uses OpenRouter's native `~author/family-latest` aliases. DeepSeek Pro
currently has no published alias, so its Latest choice checks the public model
catalog and selects the newest standard Pro release, excluding experimental,
vision, and batch variants. If that lookup fails, the app asks you to retry or
choose a pinned model. Reports display and export the actual model ID when the
provider returns it.

Keys and model selections are remembered separately for each provider. The
existing saved key migrates to the provider selected when upgrading. Custom
endpoints require an explicit URL and model ID.

Report Output Limit controls the maximum generated tokens (including reasoning
where counted by the provider). The default is 32,768; provider limits still
apply. Customize Thinking Effort overrides the provider's default reasoning
settings. Turning customization off restores the provider default, which may
still include thinking.

Empty, refused, truncated, or invalid reports produce errors. Missing grades are
never replaced with invented scores. PNG imports support Unicode card data in
text and compressed metadata chunks, including v3 cards.

## Token-Efficient Grading

The Model Settings panel has a **Token-Efficient Grading** toggle. When on,
the app sends a condensed version of the grading rubric — about 40% of the
prompt tokens of the full one. The grading standards are the same; the
condensed rubric just carries less worked explanation for the model to lean
on. It suits cheap or small models. The full rubric gives stronger models more
to reason with, so leave the toggle off when you want the most careful audit.

## Immersion modules

Eight optional, non-scoring sections can be toggled per mode: Dating App
Profile, Against-Type Shopping List, Top 5 Songs, Demise & Obituary,
Psychoanalysis, Emotional Registers, The Boring Tuesday Test (one ordinary
inconvenience and how the character actually handles it), and Three Ways to
Piss Them Off (a trivial irritation, a personal hurt, and something they claim
doesn't bother them). Unchecked modules cost nothing.

## Regression checks

Use Node.js 24 or newer, then run:

```bash
npm test
npm run lint
npm run build
```

Tests mock generation requests; they do not call paid AI providers.

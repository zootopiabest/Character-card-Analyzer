# Character Card Analyzer

A self-contained web app that rates character cards on slop, originality, tropes,
cohesion, and how well the card art matches the description.

This app is **bring-your-own-key (BYOK)**: there is no server. Every analysis is
sent directly from the app to the AI provider you choose, using **your own API
key**. Nothing runs in the background and no key is ever shipped inside the app.

Supported providers: **Google Gemini**, **OpenRouter**, **OpenAI**, and any
**custom** OpenAI-compatible endpoint. You enter your key in the app under
"Custom Runner Override".

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

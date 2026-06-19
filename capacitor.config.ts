import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Change appId to your own reverse-domain identifier before publishing.
  appId: "com.loresieve.cardanalyzer",
  appName: "Character Card Analyzer",
  webDir: "dist",
  plugins: {
    // Route fetch() through native networking so calls to Gemini / OpenAI /
    // OpenRouter aren't blocked by browser CORS rules inside the WebView.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;

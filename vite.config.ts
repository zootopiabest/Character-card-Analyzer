import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    // GitHub Pages serves project sites from a sub-path; the deploy workflow
    // sets this. Local dev and the Capacitor build use the root.
    base: process.env.GITHUB_PAGES_BASE || '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // Registration is done by hand in main.tsx so the native Capacitor
        // app (which ships its own files) never installs a service worker.
        injectRegister: null,
        includeAssets: ['icons/apple-touch-icon.png'],
        manifest: {
          name: 'Character Card Analyzer',
          short_name: 'Card Analyzer',
          description: 'Brutally honest LLM-runtime audits of AI roleplay character cards. Bring your own API key.',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'any',
          background_color: '#050505',
          theme_color: '#050505',
          icons: [
            {src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png'},
            {src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png'},
            {src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
          // The analyzer bundle is >500 kB; raise the precache ceiling so the
          // app shell is fully available offline.
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: 'index.html',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Web-app install support (Add to Home Screen, offline shell). The native
// Capacitor build ships its own files, so it must not install a service
// worker that could serve a stale bundle after an APK update.
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({registerSW}) => registerSW({immediate: true}));
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize i18n before rendering
import './i18n';

import { installAudioUnlockListeners } from "@/lib/voicePlayback";
import { registerSW } from "virtual:pwa-register";
import { Capacitor } from "@capacitor/core";

// Install one-time unlock handlers (first user gesture) for mobile/PWA audio policies
installAudioUnlockListeners();

// Only register Service Worker on Web, not Native (Android/iOS) to avoid Promise errors
if (!Capacitor.isNativePlatform()) {
    registerSW({ immediate: true });
}

import { ThemeProvider } from "./context/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
    <ThemeProvider>
        <App />
    </ThemeProvider>
);

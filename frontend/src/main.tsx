import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize i18n before rendering
import './i18n';

import { installAudioUnlockListeners } from "@/lib/voicePlayback";

// Install one-time unlock handlers (first user gesture) for mobile/PWA audio policies
installAudioUnlockListeners();

createRoot(document.getElementById("root")!).render(<App />);

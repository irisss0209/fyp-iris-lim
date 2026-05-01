import "./index.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { registerSW } from "virtual:pwa-register";
import { TimeProvider } from "@/context/TimeContext";

// Always send the HttpOnly auth cookie with every request
const _origFetch = window.fetch;
window.fetch = (input, init) => _origFetch(input, { credentials: 'include', ...init });
// Register service worker – auto-updates silently.
// Callbacks fire custom DOM events so UpdatePrompt can react without prop-drilling.
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("pwa:update-available", { detail: { updateSW } }));
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent("pwa:offline-ready"));
  },
  onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
    if (!registration) return;
    // Poll for updates every 60 seconds while the app is open.
    setInterval(async () => {
      if (!(!registration.installing && navigator.onLine)) return;
      const resp = await fetch(swUrl, { cache: "no-store", headers: { cache: "no-store", "cache-control": "no-cache" } });
      if (resp?.status === 200) await registration.update();
    }, 60_000);
  },
});

const root = createRoot(document.getElementById("root")!);
root.render(<TimeProvider><App /></TimeProvider>);

import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "@/app/AppProviders";
import { AppRouter } from "@/app/AppRouter";
import "@/styles/index.css";

/**
 * Application entry point.
 * Renders the root React tree wrapped in all global providers.
 *
 * Dev only (`npm run dev`): /admin and /tutor open without logging in, on sample data — see src/preview.
 * Set VITE_PREVIEW=false to switch it off. The whole branch is removed from production builds.
 */
async function start() {
  if (import.meta.env.DEV && import.meta.env.VITE_PREVIEW !== "false") {
    const { installPreview } = await import("@/preview/installPreview");
    installPreview();
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </React.StrictMode>
  );
}

void start();

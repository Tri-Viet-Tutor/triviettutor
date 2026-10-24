import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "@/app/AppProviders";
import { AppRouter } from "@/app/AppRouter";
import "@/styles/index.css";


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
    </React.StrictMode>,
  );
}

void start();

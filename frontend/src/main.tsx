import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "@/app/AppProviders";
import { AppRouter } from "@/app/AppRouter";
import "@/styles/index.css";

/**
 * Application entry point.
 * Renders the root React tree wrapped in all global providers.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </React.StrictMode>
);

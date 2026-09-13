import React from "react";
import ReactDOM from "react-dom/client";
import { Providers } from "@/app/providers";
import { AppRouter } from "@/app/router";
import "@/styles/index.css";

/**
 * Application entry point.
 * Renders the root React tree wrapped in all global providers.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </React.StrictMode>
);

import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "@/app/AppProviders";
import { AppRouter } from "@/app/AppRouter";
import "@/styles/index.css";


async function start() {
  if (import.meta.env.DEV && import.meta.env.VITE_PREVIEW !== "false") {
    // Chế độ xem thử là tùy chọn: chỉ nạp khi src/preview/installPreview.ts(x) tồn tại.
    const previewModules = import.meta.glob<{ installPreview: () => void }>(
      "./preview/installPreview.{ts,tsx}",
    );
    const loadPreview = Object.values(previewModules)[0];
    if (loadPreview) {
      const { installPreview } = await loadPreview();
      installPreview();
    }
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

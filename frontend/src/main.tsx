import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "@/app/AppProviders";
import { AppRouter } from "@/app/AppRouter";
// Phông nhúng theo repo thay vì tải từ Google Fonts lúc chạy: máy nào mở cũng hiển thị y hệt
// nhau, không phụ thuộc mạng hay phông đã cài sẵn trong máy. Nạp trước index.css để các khai báo
// @font-face có sẵn khi Tailwind áp font-family.
import "@fontsource/be-vietnam-pro/300.css";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/400-italic.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "@fontsource/be-vietnam-pro/900.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "material-symbols/outlined.css";
import "@/styles/index.css";


// Khởi động web: nạp chế độ xem thử nếu có rồi gắn ứng dụng vào trang
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

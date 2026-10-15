import { Navigate, useLocation } from "react-router-dom";
import type { LegacyRedirectProps } from "@/interfaces/app";

/**
 * Chuyển đường dẫn cũ sang đường dẫn mới, giữ nguyên tham số (?buoi=…) và phần #…,
 * để các liên kết / dấu trang cũ vẫn mở đúng trang.
 */
export function LegacyRedirect({ to }: LegacyRedirectProps) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}

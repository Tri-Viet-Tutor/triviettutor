import { ErrorScreen } from "@/components/ui/ErrorScreen";

// Trang 404 — đường dẫn không tồn tại.
export function NotFoundPage() {
  return <ErrorScreen code="404" message="Không tìm thấy trang." />;
}

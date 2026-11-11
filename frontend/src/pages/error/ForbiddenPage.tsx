import { ErrorScreen } from "@/components/ui/ErrorScreen";

// Trang 403 — hiện khi người dùng mở trang không thuộc vai trò của mình.
export function ForbiddenPage() {
  return <ErrorScreen code="403" message="Bạn không có quyền xem trang này." />;
}

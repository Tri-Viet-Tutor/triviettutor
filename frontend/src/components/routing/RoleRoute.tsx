import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/constants/routes";
import type { RoleRouteProps } from "@/interfaces/app";

// Chặn theo vai trò: người dùng không đúng vai trò thì chuyển sang /403.
// Phải đặt bên trong <PrivateRoute /> để chắc chắn đã đăng nhập.
// Thực hiện quy tắc BR-01.10 ở tầng điều hướng.
// Lưu ý: backend vẫn tự kiểm tra vai trò — ở frontend chỉ để trải nghiệm tốt hơn.
// Cách dùng:
// <Route element={<RoleRoute allowedRole="ROLE_ADMIN" />}>
// <Route element={<AdminLayout />}>...</Route>
// </Route>
export function RoleRoute({ allowedRole }: RoleRouteProps) {
  const user = useAuthStore((s) => s.user);

  if (!user || user.role !== allowedRole) {
    return <Navigate to={ROUTES.forbidden} replace />;
  }

  return <Outlet />;
}

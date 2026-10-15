import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/constants/routes";

/**
 * Chặn các trang cần đăng nhập: chưa đăng nhập thì chuyển về /login.
 * Bọc quanh nhóm route cần bảo vệ.
 *
 * Cách dùng trong AppRouter.tsx:
 *   <Route element={<PrivateRoute />}>
 *     <Route element={<AdminLayout />}>...</Route>
 *   </Route>
 */
export function PrivateRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />;
  }

  return <Outlet />;
}

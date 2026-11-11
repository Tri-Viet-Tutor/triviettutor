import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/constants/routes";
import { checkoutReturnPath } from "@/utils/checkoutReturn";

// Chặn các trang cần đăng nhập: chưa đăng nhập thì chuyển về /login.
// Bọc quanh nhóm route cần bảo vệ.
// Cách dùng trong AppRouter.tsx:
// <Route element={<PrivateRoute />}>
// <Route element={<AdminLayout />}>...</Route>
// </Route>
export function PrivateRoute() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ returnTo: checkoutReturnPath(location.pathname + location.search) }} />;
  }

  return <Outlet />;
}

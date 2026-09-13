import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * PrivateRoute
 *
 * Redirects unauthenticated users to /login.
 * Wrap any group of routes that require authentication.
 *
 * Usage in router.tsx:
 *   <Route element={<PrivateRoute />}>
 *     <Route element={<AdminLayout />}>...</Route>
 *   </Route>
 */
export function PrivateRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

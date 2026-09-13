import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

interface RoleRouteProps {
  allowedRole: string;
}

/**
 * RoleRoute
 *
 * Redirects to /403 if the authenticated user does not have the required role.
 * Must be nested inside <PrivateRoute /> so user is guaranteed to be logged in.
 *
 * This enforces BR-01.10 at the routing layer.
 * Note: the backend also enforces roles — frontend is a UX guard only.
 *
 * Usage:
 *   <Route element={<RoleRoute allowedRole="ROLE_ADMIN" />}>
 *     <Route element={<AdminLayout />}>...</Route>
 *   </Route>
 */
export function RoleRoute({ allowedRole }: RoleRouteProps) {
  const user = useAuthStore((s) => s.user);

  if (!user || user.role !== allowedRole) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

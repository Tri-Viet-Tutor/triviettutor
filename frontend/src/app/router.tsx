import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layouts
import { AuthLayout } from "@/layouts/AuthLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { TutorLayout } from "@/layouts/TutorLayout";
import { StudentLayout } from "@/layouts/StudentLayout";

// Auth pages
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";


// Guard components
import { PrivateRoute } from "@/components/PrivateRoute";
import { RoleRoute } from "@/components/RoleRoute";

// Error pages
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";

/**
 * Application router.
 *
 * Route protection strategy (BR-01.10):
 *  - Unauthenticated users → redirected to /login
 *  - Wrong role → /403
 *
 * Route prefixes:
 *  /login, /register        → public (AuthLayout)
 *  /admin/**                → ROLE_ADMIN only
 *  /tutor/**                → ROLE_TUTOR only
 *  /student/**              → ROLE_STUDENT only
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes ──────────────────────────────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* ── Admin routes ────────────────────────────────────────────── */}
        <Route element={<PrivateRoute />}>
          <Route element={<RoleRoute allowedRole="ROLE_ADMIN" />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<div className="p-8">Admin Dashboard (To be implemented)</div>} />
            </Route>
          </Route>
        </Route>

        {/* ── Tutor routes ─────────────────────────────────────────────── */}
        <Route element={<PrivateRoute />}>
          <Route element={<RoleRoute allowedRole="ROLE_TUTOR" />}>
            <Route element={<TutorLayout />}>
              <Route path="/tutor" element={<div className="p-8">Tutor Dashboard (To be implemented)</div>} />
            </Route>
          </Route>
        </Route>

        {/* ── Student routes ───────────────────────────────────────────── */}
        <Route element={<PrivateRoute />}>
          <Route element={<RoleRoute allowedRole="ROLE_STUDENT" />}>
            <Route element={<StudentLayout />}>
              <Route path="/student" element={<div className="p-8">Student Dashboard (To be implemented)</div>} />
            </Route>
          </Route>
        </Route>

        {/* ── Error pages ──────────────────────────────────────────────── */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layouts
import { AuthLayout } from "@/layouts/AuthLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { TutorLayout } from "@/layouts/TutorLayout";
import { StudentLayout } from "@/layouts/StudentLayout";
import { PublicLayout } from "@/layouts/PublicLayout";

// Auth pages
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";

// Public Stitch pages
import { HomePage } from "@/pages/public/HomePage";
import { SubjectsPage } from "@/pages/public/SubjectsPage";
import { SearchPage } from "@/pages/public/SearchPage";
import { PricingPage } from "@/pages/public/PricingPage";
import { ContactPage } from "@/pages/public/ContactPage";

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
 *  - Public marketing/landing pages → PublicLayout (/, /cap-hoc-mon-hoc, /tim-gia-su, /bang-hoc-phi, /lien-he)
 *  - /login, /register             → public (AuthLayout)
 *  - /admin/**                     → ROLE_ADMIN only
 *  - /tutor/**                     → ROLE_TUTOR only
 *  - /student/**                   → ROLE_STUDENT only
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public Stitch landing & educational routes ──────────────── */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/cap-hoc-mon-hoc" element={<SubjectsPage />} />
          <Route path="/tim-gia-su" element={<SearchPage />} />
          <Route path="/bang-hoc-phi" element={<PricingPage />} />
          <Route path="/lien-he" element={<ContactPage />} />
        </Route>

        {/* ── Auth routes ─────────────────────────────────────────────── */}
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

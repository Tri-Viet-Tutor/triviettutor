import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

// Layouts
import { AuthLayout } from "@/layouts/AuthLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { TutorLayout } from "@/layouts/TutorLayout";
import { StudentLayout } from "@/layouts/StudentLayout";
import { PublicLayout } from "@/layouts/PublicLayout";

// Auth pages
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";

// Public pages
import { HomePage } from "@/pages/public/HomePage";
import { SubjectsPage } from "@/pages/public/SubjectsPage";
import { SearchPage } from "@/pages/public/SearchPage";
import { PricingPage } from "@/pages/public/PricingPage";
import { ContactPage } from "@/pages/public/ContactPage";
import { CheckoutPage } from "@/pages/public/CheckoutPage";

// Guard components
import { PrivateRoute } from "@/components/routing/PrivateRoute";
import { RoleRoute } from "@/components/routing/RoleRoute";

// Giỏ khóa học của khách
import { GuestCartScope } from "@/features/checkout/components/GuestCartScope";

// Error pages
import { NotFoundPage } from "@/pages/error/NotFoundPage";
import { ForbiddenPage } from "@/pages/error/ForbiddenPage";

// Dashboard pages
import { AccountDashboard } from "@/pages/AccountDashboard";
import { SessionListPage } from "@/pages/SessionListPage";

/**
 * Application router.
 *
 * Route protection strategy (BR-01.10):
 *  - Public marketing/landing pages → PublicLayout (/, /cap-hoc-mon-hoc, /tim-gia-su, /mua-khoa-hoc, /thanh-toan, /lien-he)
 *  - /login, /register, /verify-email, /forgot-password, /reset-password → public (AuthLayout)
 *  - /admin/**                     → ROLE_ADMIN only
 *  - /tutor/**                     → ROLE_TUTOR only
 *  - /student/**                   → ROLE_STUDENT only
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <GuestCartScope />
      <Routes>
        {/* ── Public Stitch landing & educational routes ──────────────── */}
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.subjects} element={<SubjectsPage />} />
          <Route path={ROUTES.tutorSearch} element={<SearchPage />} />
          <Route path={ROUTES.pricing} element={<PricingPage />} />
          <Route path={ROUTES.pricingLegacy} element={<Navigate to={ROUTES.pricing} replace />} />
          <Route path={ROUTES.checkout} element={<CheckoutPage />} />
          <Route path={ROUTES.contact} element={<ContactPage />} />
        </Route>

        {/* ── Auth routes ─────────────────────────────────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.verifyEmail} element={<VerifyEmailPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
        </Route>

        {/* ── Admin routes ────────────────────────────────────────────── */}
        <Route element={<PrivateRoute />}>
          <Route element={<RoleRoute allowedRole="ROLE_ADMIN" />}>
            <Route element={<AdminLayout />}>
              <Route path={ROUTES.admin} element={<AccountDashboard />} />
              <Route path={ROUTES.adminSessions} element={<SessionListPage />} />
            </Route>
          </Route>
        </Route>

        {/* ── Tutor routes ─────────────────────────────────────────────── */}
        <Route element={<PrivateRoute />}>
          <Route element={<RoleRoute allowedRole="ROLE_TUTOR" />}>
            <Route element={<TutorLayout />}>
              <Route path={ROUTES.tutor} element={<AccountDashboard />} />
              <Route path={ROUTES.tutorSessions} element={<SessionListPage />} />
            </Route>
          </Route>
        </Route>

        {/* ── Student routes ───────────────────────────────────────────── */}
        <Route element={<PrivateRoute />}>
          <Route element={<RoleRoute allowedRole="ROLE_STUDENT" />}>
            <Route element={<StudentLayout />}>
              <Route path={ROUTES.student} element={<AccountDashboard />} />
              <Route path={ROUTES.studentSchedule} element={<SessionListPage />} />
            </Route>
          </Route>
        </Route>

        {/* ── Error pages ──────────────────────────────────────────────── */}
        <Route path={ROUTES.forbidden} element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

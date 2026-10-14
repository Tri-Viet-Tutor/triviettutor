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

// Admin pages
import { AdminHomePage } from "@/pages/admin/AdminHomePage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminSessionsPage } from "@/pages/admin/AdminSessionsPage";
import { AdminLeaveRequestsPage } from "@/pages/admin/AdminLeaveRequestsPage";
import { AdminAssignmentsPage } from "@/pages/admin/AdminAssignmentsPage";
import { AdminPaymentsPage } from "@/pages/admin/AdminPaymentsPage";

// Tutor pages
import { TutorHomePage } from "@/pages/tutor/TutorHomePage";
import { TutorSchedulePage } from "@/pages/tutor/TutorSchedulePage";
import { TutorAvailabilityPage } from "@/pages/tutor/TutorAvailabilityPage";
import { TutorLeavePage } from "@/pages/tutor/TutorLeavePage";

// Student pages
import { StudentHomePage } from "@/pages/student/StudentHomePage";
import { StudentSchedulePage } from "@/pages/student/StudentSchedulePage";
import { StudentCoursesPage } from "@/pages/student/StudentCoursesPage";
import { StudentCheckoutPage } from "@/pages/student/StudentCheckoutPage";
import { StudentLeavePage } from "@/pages/student/StudentLeavePage";
import { ProfilePage } from "@/pages/portal/ProfilePage";

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
              <Route path={ROUTES.admin} element={<AdminHomePage />} />
              <Route path={ROUTES.adminUsers} element={<AdminUsersPage />} />
              <Route path={ROUTES.adminSessions} element={<AdminSessionsPage />} />
              <Route path={ROUTES.adminLeaveRequests} element={<AdminLeaveRequestsPage />} />
              <Route path={ROUTES.adminAssignments} element={<AdminAssignmentsPage />} />
              <Route path={ROUTES.adminPayments} element={<AdminPaymentsPage />} />
              <Route path={ROUTES.adminProfile} element={<ProfilePage />} />
            </Route>
          </Route>
        </Route>

        {/* ── Tutor routes ─────────────────────────────────────────────── */}
        <Route element={<PrivateRoute />}>
          <Route element={<RoleRoute allowedRole="ROLE_TUTOR" />}>
            <Route element={<TutorLayout />}>
              <Route path={ROUTES.tutor} element={<TutorHomePage />} />
              <Route path={ROUTES.tutorSessions} element={<TutorSchedulePage />} />
              <Route path={ROUTES.tutorAvailability} element={<TutorAvailabilityPage />} />
              <Route path={ROUTES.tutorLeave} element={<TutorLeavePage />} />
              <Route path={ROUTES.tutorProfile} element={<ProfilePage />} />
            </Route>
          </Route>
        </Route>

        {/* ── Student routes ───────────────────────────────────────────── */}
        <Route element={<PrivateRoute />}>
          <Route element={<RoleRoute allowedRole="ROLE_STUDENT" />}>
            <Route element={<StudentLayout />}>
              <Route path={ROUTES.student} element={<StudentHomePage />} />
              <Route path={ROUTES.studentSchedule} element={<StudentSchedulePage />} />
              <Route path={ROUTES.studentCourses} element={<StudentCoursesPage />} />
              <Route path={ROUTES.studentCheckout} element={<StudentCheckoutPage />} />
              <Route path={ROUTES.studentLeave} element={<StudentLeavePage />} />
              <Route path={ROUTES.studentProfile} element={<ProfilePage />} />
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

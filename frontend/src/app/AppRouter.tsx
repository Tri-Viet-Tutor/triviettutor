import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

// Bố cục (layout)
import { AuthLayout } from "@/layouts/AuthLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { TutorLayout } from "@/layouts/TutorLayout";
import { StudentLayout } from "@/layouts/StudentLayout";
import { PublicLayout } from "@/layouts/PublicLayout";

// Trang xác thực
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";

// Trang công khai
import { HomePage } from "@/pages/public/HomePage";
import { SubjectsPage } from "@/pages/public/SubjectsPage";
import { SearchPage } from "@/pages/public/SearchPage";
import { PricingPage } from "@/pages/public/PricingPage";
import { ContactPage } from "@/pages/public/ContactPage";
import { CheckoutPage } from "@/pages/public/CheckoutPage";

// Bộ chặn quyền truy cập
import { PrivateRoute } from "@/components/routing/PrivateRoute";
import { RoleRoute } from "@/components/routing/RoleRoute";
import { LegacyRedirect } from "@/components/routing/LegacyRedirect";

// Giỏ khóa học của khách
import { GuestCartScope } from "@/components/checkout/GuestCartScope";

// Trang lỗi
import { NotFoundPage } from "@/pages/error/NotFoundPage";
import { ForbiddenPage } from "@/pages/error/ForbiddenPage";

// Trang quản trị
import { AdminHomePage } from "@/pages/admin/AdminHomePage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminSessionsPage } from "@/pages/admin/AdminSessionsPage";
import { AdminReschedulesPage } from "@/pages/admin/AdminReschedulesPage";
import { AdminAssignmentsPage } from "@/pages/admin/AdminAssignmentsPage";

// Trang gia sư
import { TutorHomePage } from "@/pages/tutor/TutorHomePage";
import { TutorSchedulePage } from "@/pages/tutor/TutorSchedulePage";
import { TutorAvailabilityPage } from "@/pages/tutor/TutorAvailabilityPage";
import { TutorLeavePage } from "@/pages/tutor/TutorLeavePage";

// Trang học viên
import { StudentHomePage } from "@/pages/student/StudentHomePage";
import { StudentSchedulePage } from "@/pages/student/StudentSchedulePage";
import { StudentCatalogPage } from "@/pages/student/StudentCatalogPage";
import { StudentCheckoutPage } from "@/pages/student/StudentCheckoutPage";
import { StudentLeavePage } from "@/pages/student/StudentLeavePage";
import { ProfilePage } from "@/pages/dashboard/ProfilePage";

//Khai báo toàn bộ tuyến đường (route) của ứng dụng.
//admin / gia sư / học viên đều qua 2 lớp chặn: phải đăng nhập (PrivateRoute)
//và đúng vai trò (RoleRoute); trang hồ sơ dùng chung một component cho cả 3 vai trò.

export function AppRouter() {
  return (
    <BrowserRouter>
      {/* Xóa giỏ hàng của khách khi rời luồng mua khóa học */}
      <GuestCartScope />
      <Routes>
        {/* Guest */}
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.subjects} element={<SubjectsPage />} />
          <Route path={ROUTES.tutorSearch} element={<SearchPage />} />
          <Route path={ROUTES.pricing} element={<PricingPage />} />
          <Route path={ROUTES.pricingLegacy} element={<Navigate to={ROUTES.pricing} replace />} />
          <Route path={ROUTES.checkout} element={<CheckoutPage />} />
          <Route path={ROUTES.contact} element={<ContactPage />} />
        </Route>

        {/* ── Đăng nhập / đăng ký / quên mật khẩu ─────────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.verifyEmail} element={<VerifyEmailPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
        </Route>

        {/* Admin*/}
        <Route element={<PrivateRoute />}>
          <Route element={<RoleRoute allowedRole="ROLE_ADMIN" />}>
            <Route element={<AdminLayout />}>
              <Route path={ROUTES.admin} element={<AdminHomePage />} />
              <Route path={ROUTES.adminUsers} element={<AdminUsersPage />} />
              <Route path={ROUTES.adminSessions} element={<AdminSessionsPage />} />
              <Route path={ROUTES.adminReschedules} element={<AdminReschedulesPage />} />
              <Route path={ROUTES.adminRescheduleLegacy} element={<LegacyRedirect to={ROUTES.adminReschedules} />} />
              <Route path={ROUTES.adminAssignments} element={<AdminAssignmentsPage />} />
              <Route path={ROUTES.adminProfile} element={<ProfilePage />} />
            </Route>
          </Route>
        </Route>

        {/* Tutor */}
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

        {/* Student */}
        <Route element={<PrivateRoute />}>
          <Route element={<RoleRoute allowedRole="ROLE_STUDENT" />}>
            <Route element={<StudentLayout />}>
              <Route path={ROUTES.student} element={<StudentHomePage />} />
              <Route path={ROUTES.studentSchedule} element={<StudentSchedulePage />} />
              <Route path={ROUTES.studentCatalog} element={<StudentCatalogPage />} />
              <Route path={ROUTES.studentCatalogLegacy} element={<LegacyRedirect to={ROUTES.studentCatalog} />} />
              <Route path={ROUTES.studentCheckout} element={<StudentCheckoutPage />} />
              <Route path={ROUTES.studentLeave} element={<StudentLeavePage />} />
              <Route path={ROUTES.studentProfile} element={<ProfilePage />} />
            </Route>
          </Route>
        </Route>

        {/* ── Trang lỗi ────────────────────────────────────────────────── */}
        <Route path={ROUTES.forbidden} element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

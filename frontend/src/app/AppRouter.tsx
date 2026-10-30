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
import { CourseDetailPage } from "@/pages/public/CourseDetailPage";
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
import { AdminPaymentsPage } from "@/pages/admin/AdminPaymentsPage";
import { AdminCoursesPage } from "@/pages/admin/AdminCoursesPage";
import { AdminClassesPage } from "@/pages/admin/AdminClassesPage";
import { AdminPayrollPage } from "@/pages/admin/AdminPayrollPage";

// Trang gia sư
import { TutorHomePage } from "@/pages/tutor/TutorHomePage";
import { TutorSchedulePage } from "@/pages/tutor/TutorSchedulePage";
import { TutorAvailabilityPage } from "@/pages/tutor/TutorAvailabilityPage";
import { TutorLeavePage } from "@/pages/tutor/TutorLeavePage";
import { TutorPayrollPage } from "@/pages/tutor/TutorPayrollPage";

// Trang học viên
import { StudentHomePage } from "@/pages/student/StudentHomePage";
import { StudentSchedulePage } from "@/pages/student/StudentSchedulePage";
import { StudentCartPage } from "@/pages/student/StudentCartPage";
import { StudentCatalogPage } from "@/pages/student/StudentCatalogPage";
import { StudentCheckoutPage } from "@/pages/student/StudentCheckoutPage";
import { StudentWalletPage } from "@/pages/student/StudentWalletPage";
import { StudentLeavePage } from "@/pages/student/StudentLeavePage";
import { StudentEnrollmentsPage } from "@/pages/student/StudentEnrollmentsPage";
import { ProfilePage } from "@/pages/dashboard/ProfilePage";

// Phòng học trực tuyến LiveKit
import ClassroomPage from "@/pages/ClassroomPage";

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
          <Route path={ROUTES.courseDetail} element={<CourseDetailPage />} />
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
              <Route path={ROUTES.adminPayments} element={<AdminPaymentsPage />} />
              <Route path={ROUTES.adminCourses} element={<AdminCoursesPage />} />
              <Route path={ROUTES.adminClasses} element={<AdminClassesPage />} />
              <Route path={ROUTES.adminPayroll} element={<AdminPayrollPage />} />
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
              <Route path={ROUTES.tutorPayroll} element={<TutorPayrollPage />} />
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
              <Route path={ROUTES.studentCourseDetail} element={<CourseDetailPage variant="student" />} />
              <Route path={ROUTES.studentCatalogLegacy} element={<LegacyRedirect to={ROUTES.studentCatalog} />} />
              <Route path={ROUTES.studentCheckout} element={<StudentCheckoutPage />} />
              <Route path={ROUTES.studentWallet} element={<StudentWalletPage />} />
              <Route path={ROUTES.studentCart} element={<StudentCartPage />} />
              <Route path={ROUTES.studentLeave} element={<StudentLeavePage />} />
              <Route path={ROUTES.studentEnrollments} element={<StudentEnrollmentsPage />} />
              <Route path={ROUTES.studentProfile} element={<ProfilePage />} />
            </Route>
          </Route>
        </Route>

        {/* ── Phòng học trực tuyến LiveKit SFU (Admin, Gia sư, Học viên) ─ */}
        <Route element={<PrivateRoute />}>
          <Route path={ROUTES.classroom} element={<ClassroomPage />} />
        </Route>

        {/* ── Trang lỗi ────────────────────────────────────────────────── */}
        <Route path={ROUTES.forbidden} element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

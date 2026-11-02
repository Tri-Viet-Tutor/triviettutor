import type {
  AdminClassesQuery,
  AdminClassResponse,
  AdminCoursesQuery,
  ApiResponse,
  ChangeClassStatusRequest,
  CourseRequest,
  CourseResponse,
  CourseSummaryResponse,
  ClassSummaryResponse,
  SubjectResponse,
  CreateClassRequest,
  EnrollmentResponse,
  EnrollmentsQuery,
  PageResponse,
  PayrollLineResponse,
  PayrollResponse,
  ReopenClassRequest,
  TutorPayrollQuery,
} from "@/interfaces/api";
import { api, unwrap } from "@/services/api";

/*
 * Các API quản lý khóa học, lớp, ghi danh và bảng lương — đều là endpoint backend ĐÃ có
 * (CourseController, ClassController, EnrollmentController, PayrollController).
 */

// ── Khóa học (ROLE_ADMIN) ────────────────────────────────────────────────────

/** GET /admin/courses — danh sách khóa học, lọc theo môn / khối / đang bán */
export async function fetchAdminCourses(query: AdminCoursesQuery = {}): Promise<PageResponse<CourseResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<CourseResponse>>>("/admin/courses", { params: query }));
}

/** POST /admin/courses — tạo khóa học */
export async function createCourse(request: CourseRequest): Promise<CourseResponse> {
  return unwrap(await api.post<ApiResponse<CourseResponse>>("/admin/courses", request));
}

/** PUT /admin/courses/{courseId} — sửa khóa học */
export async function updateCourse(courseId: number, request: CourseRequest): Promise<CourseResponse> {
  return unwrap(await api.put<ApiResponse<CourseResponse>>(`/admin/courses/${courseId}`, request));
}

/** PUT /admin/courses/{courseId}/active — đặt trạng thái bán (gửi lặp cùng giá trị không đổi gì thêm) */
export async function setCourseActive(courseId: number, active: boolean): Promise<CourseResponse> {
  return unwrap(await api.put<ApiResponse<CourseResponse>>(`/admin/courses/${courseId}/active`, { active }));
}

/** DELETE /admin/courses/{courseId} — xóa hẳn khóa chưa có lớp / đơn hàng (409 COURSE_IN_USE nếu đã dùng) */
export async function deleteCourse(courseId: number): Promise<void> {
  await api.delete(`/admin/courses/${courseId}`);
}

/** DELETE /admin/classes/{classId} — xóa hẳn lớp chưa từng có học viên (409 CLASS_IN_USE nếu đã dùng) */
export async function deleteClass(classId: number): Promise<void> {
  await api.delete(`/admin/classes/${classId}`);
}

/** GET /admin/courses/summary — số khóa tổng / đang bán / ngừng bán */
export async function fetchCourseSummary(): Promise<CourseSummaryResponse> {
  return unwrap(await api.get<ApiResponse<CourseSummaryResponse>>("/admin/courses/summary"));
}

/** GET /catalog/subjects — các môn học đang có trong hệ thống */
export async function fetchSubjects(): Promise<SubjectResponse[]> {
  return unwrap(await api.get<ApiResponse<SubjectResponse[]>>("/catalog/subjects"));
}

/** PATCH /admin/courses/{courseId}/toggle — đảo trạng thái bán (không idempotent; trang khóa học dùng setCourseActive) */
export async function toggleCourse(courseId: number): Promise<CourseResponse> {
  return unwrap(await api.patch<ApiResponse<CourseResponse>>(`/admin/courses/${courseId}/toggle`));
}

// ── Lớp học (ROLE_ADMIN) ─────────────────────────────────────────────────────

/** GET /admin/classes — danh sách lớp theo khóa, trạng thái, loại lớp, lịch */
export async function fetchAdminClasses(query: AdminClassesQuery = {}): Promise<PageResponse<AdminClassResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<AdminClassResponse>>>("/admin/classes", { params: query }));
}

/** POST /admin/classes — mở lớp mới của một khóa học */
export async function createClass(request: CreateClassRequest): Promise<AdminClassResponse> {
  return unwrap(await api.post<ApiResponse<AdminClassResponse>>("/admin/classes", request));
}

/** GET /admin/classes/summary — số lớp theo từng trạng thái */
export async function fetchClassSummary(): Promise<ClassSummaryResponse> {
  return unwrap(await api.get<ApiResponse<ClassSummaryResponse>>("/admin/classes/summary"));
}

/** PATCH /admin/classes/{classId}/status — đổi trạng thái lớp (đăng lớp sẽ sinh lịch các buổi) */
export async function changeClassStatus(classId: number, request: ChangeClassStatusRequest): Promise<AdminClassResponse> {
  return unwrap(await api.patch<ApiResponse<AdminClassResponse>>(`/admin/classes/${classId}/status`, request));
}

/** POST /admin/classes/{classId}/reopen — mở lại lớp không đủ sĩ số với ngày khai giảng mới */
export async function reopenClass(classId: number, request: ReopenClassRequest): Promise<AdminClassResponse> {
  return unwrap(await api.post<ApiResponse<AdminClassResponse>>(`/admin/classes/${classId}/reopen`, request));
}

/** GET /admin/classes/{classId}/enrollments — học viên đã đóng học phí của lớp */
export async function fetchClassEnrollments(classId: number, query: EnrollmentsQuery = {}): Promise<PageResponse<EnrollmentResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<EnrollmentResponse>>>(`/admin/classes/${classId}/enrollments`, { params: query }));
}

// ── Bảng lương ───────────────────────────────────────────────────────────────

/** GET /admin/payroll/{year}/{month} — bảng lương tháng của mọi gia sư (ROLE_ADMIN) */
export async function fetchPayroll(year: number, month: number): Promise<PayrollResponse> {
  return unwrap(await api.get<ApiResponse<PayrollResponse>>(`/admin/payroll/${year}/${month}`));
}

/** POST /admin/payroll/{year}/{month}/finalize — chốt bảng lương; Idempotency-Key chống chốt hai lần */
export async function finalizePayroll(year: number, month: number, idempotencyKey: string): Promise<PayrollResponse> {
  return unwrap(
    await api.post<ApiResponse<PayrollResponse>>(`/admin/payroll/${year}/${month}/finalize`, null, {
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  );
}

/** GET /tutor/payroll — lương của gia sư đang đăng nhập theo từng tháng (ROLE_TUTOR) */
export async function fetchMyPayroll(query: TutorPayrollQuery = {}): Promise<PageResponse<PayrollLineResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<PayrollLineResponse>>>("/tutor/payroll", { params: query }));
}

// ── Ghi danh của học viên (ROLE_STUDENT) ─────────────────────────────────────

/** GET /enrollments/my — các lớp tôi đã đóng học phí */
export async function fetchMyEnrollments(query: EnrollmentsQuery = {}): Promise<PageResponse<EnrollmentResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<EnrollmentResponse>>>("/enrollments/my", { params: query }));
}

/** DELETE /enrollments/{enrollmentId} — hủy ghi danh (hoàn tiền nếu đúng quy định); bắt buộc có lý do */
export async function cancelEnrollment(enrollmentId: number, reason: string): Promise<EnrollmentResponse> {
  return unwrap(await api.delete<ApiResponse<EnrollmentResponse>>(`/enrollments/${enrollmentId}`, { data: { reason } }));
}

/** POST /enrollments/{enrollmentId}/transfer — đổi sang lớp khác cùng khóa trước hạn chốt; học phí bù trừ qua ví */
export async function transferEnrollment(enrollmentId: number, targetClassId: number): Promise<EnrollmentResponse> {
  return unwrap(await api.post<ApiResponse<EnrollmentResponse>>(`/enrollments/${enrollmentId}/transfer`, { targetClassId }));
}

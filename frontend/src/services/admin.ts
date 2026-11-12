import type {
  ActualTutorChange,
  AdminLeaveRequestsQuery,
  AdminSessionsQuery,
  AdminUserResponse,
  AdminUsersQuery,
  ApiResponse,
  AssignmentResponse,
  AttendanceCorrection,
  AttendanceLockInput,
  AttendanceRecordResponse,
  AttendanceResponse,
  AvailableTutorResponse,
  TutorBoardResponse,
  TuitionPayment,
  CancelSessionRequest,
  CreateTutorRequest,
  LeaveRequestResponse,
  MakeupRequest,
  MeResponse,
  PageResponse,
  SessionResponse,
  SubstituteRequest,
  UpdateTutorProfileRequest,
  UpdateUserStatusRequest,
  TutorScheduleAvailabilityRequest,
} from "@/interfaces/api";
import { api, unwrap } from "@/services/api";

/*
 * Các API của khu quản trị — đều là endpoint backend ĐÃ có (AdminUserController, SessionController,
 * SessionReschedulingController, LeaveRequestController, AttendanceController, TutorAssignmentController).
 * Mọi lời gọi cần đăng nhập bằng tài khoản ROLE_ADMIN.
 */

// ── Người dùng ───────────────────────────────────────────────────────────────

/** GET /admin/users — danh sách người dùng, lọc theo vai trò và tìm theo email / họ tên */
export async function fetchAdminUsers(query: AdminUsersQuery = {}): Promise<PageResponse<AdminUserResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<AdminUserResponse>>>("/admin/users", { params: query }));
}

/** POST /admin/users/tutors — tạo tài khoản gia sư kèm hồ sơ */
export async function createTutor(request: CreateTutorRequest): Promise<MeResponse> {
  return unwrap(await api.post<ApiResponse<MeResponse>>("/admin/users/tutors", request));
}

/** PUT /admin/users/{userId}/tutor-profile — sửa lương, thù lao và giới thiệu của một gia sư */
export async function updateTutorProfile(userId: number, request: UpdateTutorProfileRequest): Promise<MeResponse> {
  return unwrap(await api.put<ApiResponse<MeResponse>>(`/admin/users/${userId}/tutor-profile`, request));
}

/** PATCH /admin/users/{userId}/status — khóa (true) / mở khóa (false) tài khoản; không tự khóa chính mình được */
export async function updateUserStatus(userId: number, request: UpdateUserStatusRequest): Promise<AdminUserResponse> {
  return unwrap(await api.patch<ApiResponse<AdminUserResponse>>(`/admin/users/${userId}/status`, request));
}

// ── Buổi học ─────────────────────────────────────────────────────────────────

/** GET /admin/sessions — tìm mọi buổi học */
export async function fetchAdminSessions(query: AdminSessionsQuery = {}): Promise<PageResponse<SessionResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<SessionResponse>>>("/admin/sessions", { params: query }));
}

/** GET /sessions/{sessionId} — một buổi học */
export async function fetchSession(sessionId: number): Promise<SessionResponse> {
  return unwrap(await api.get<ApiResponse<SessionResponse>>(`/sessions/${sessionId}`));
}

/** PUT /admin/sessions/{sessionId}/meeting-url — gắn link lớp trực tuyến (phải là https) */
export async function setMeetingUrl(sessionId: number, meetingUrl: string): Promise<SessionResponse> {
  return unwrap(await api.put<ApiResponse<SessionResponse>>(`/admin/sessions/${sessionId}/meeting-url`, { meetingUrl }));
}

/** POST /admin/sessions/{sessionId}/cancel — hủy buổi học (duyệt luôn các đơn xin nghỉ đang chờ của buổi) */
export async function cancelSession(sessionId: number, request: CancelSessionRequest): Promise<SessionResponse> {
  return unwrap(await api.post<ApiResponse<SessionResponse>>(`/admin/sessions/${sessionId}/cancel`, request));
}

/** POST /admin/sessions/{sessionId}/makeup — xếp buổi học bù cho một đơn xin nghỉ; trả về buổi bù */
export async function createMakeup(sessionId: number, request: MakeupRequest): Promise<SessionResponse> {
  return unwrap(await api.post<ApiResponse<SessionResponse>>(`/admin/sessions/${sessionId}/makeup`, request));
}

/** POST /admin/sessions/{sessionId}/substitute — phân gia sư dạy thay cho đơn xin nghỉ của gia sư */
export async function assignSubstitute(sessionId: number, request: SubstituteRequest): Promise<SessionResponse> {
  return unwrap(await api.post<ApiResponse<SessionResponse>>(`/admin/sessions/${sessionId}/substitute`, request));
}

// ── Đơn xin nghỉ ─────────────────────────────────────────────────────────────

/** GET /admin/leave-requests — mọi đơn xin nghỉ, lọc theo trạng thái / người gửi / buổi học */
export async function fetchAdminLeaveRequests(query: AdminLeaveRequestsQuery = {}): Promise<PageResponse<LeaveRequestResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<LeaveRequestResponse>>>("/admin/leave-requests", { params: query }));
}

/** PATCH /admin/leave-requests/{requestId}/reject — từ chối một đơn đang chờ, kèm lý do */
export async function rejectLeaveRequest(requestId: number, reason: string): Promise<LeaveRequestResponse> {
  return unwrap(await api.patch<ApiResponse<LeaveRequestResponse>>(`/admin/leave-requests/${requestId}/reject`, { reason }));
}

/** PATCH /admin/leave-requests/{id}/excuse — duyệt nghỉ có phép cho học viên lớp nhóm: miễn điểm danh buổi đó */
export async function excuseLeaveRequest(requestId: number, reason: string): Promise<LeaveRequestResponse> {
  return unwrap(await api.patch<ApiResponse<LeaveRequestResponse>>(`/admin/leave-requests/${requestId}/excuse`, { reason }));
}

/** GET /admin/payments — giao dịch học phí tạo từ `from` (tối đa 100) cho báo cáo doanh thu */
export async function fetchPaymentsSince(from: string): Promise<PageResponse<TuitionPayment & { createdAt: string; paidAt: string | null }>> {
  return unwrap(await api.get<ApiResponse<PageResponse<TuitionPayment & { createdAt: string; paidAt: string | null }>>>("/admin/payments", { params: { from, page: 0, size: 100 } }));
}

/** PUT /admin/users/{id} — sửa họ tên và email */
export async function updateUser(userId: number, request: { fullName: string; email: string }): Promise<AdminUserResponse> {
  return unwrap(await api.put<ApiResponse<AdminUserResponse>>(`/admin/users/${userId}`, request));
}

/** DELETE /admin/users/{id} — xóa tài khoản chưa có dữ liệu (409 USER_IN_USE nếu đã có) */
export async function deleteUser(userId: number): Promise<void> {
  await api.delete(`/admin/users/${userId}`);
}

// ── Điểm danh ────────────────────────────────────────────────────────────────

/** PATCH /admin/sessions/{sessionId}/attendance/lock — khóa hoặc mở khóa điểm danh của buổi đã kết thúc */
export async function setAttendanceLock(sessionId: number, input: AttendanceLockInput): Promise<AttendanceResponse> {
  return unwrap(await api.patch<ApiResponse<AttendanceResponse>>(`/admin/sessions/${sessionId}/attendance/lock`, input));
}

/** PATCH /admin/sessions/{sessionId}/attendance/{recordId} — sửa một bản ghi điểm danh đã khóa, kèm lý do */
export async function correctAttendance(
  sessionId: number,
  recordId: number,
  input: AttendanceCorrection,
): Promise<AttendanceRecordResponse> {
  return unwrap(await api.patch<ApiResponse<AttendanceRecordResponse>>(`/admin/sessions/${sessionId}/attendance/${recordId}`, input));
}

/**
 * PUT /admin/sessions/{sessionId}/attendance/students/{studentId} — sửa điểm danh đã khóa của một học viên trong danh sách,
 * tạo bản ghi mới nếu học viên chưa được điểm danh; bắt buộc có lý do
 */
export async function correctStudentAttendance(
  sessionId: number,
  studentId: number,
  input: AttendanceCorrection,
): Promise<AttendanceRecordResponse> {
  return unwrap(
    await api.put<ApiResponse<AttendanceRecordResponse>>(`/admin/sessions/${sessionId}/attendance/students/${studentId}`, input),
  );
}

/** PATCH /admin/sessions/{sessionId}/actual-tutor — sửa gia sư thực dạy của buổi đã bắt đầu (vd. gia sư khác dạy thay khi vắng), kèm lý do */
export async function changeActualTutor(sessionId: number, input: ActualTutorChange): Promise<SessionResponse> {
  return unwrap(await api.patch<ApiResponse<SessionResponse>>(`/admin/sessions/${sessionId}/actual-tutor`, input));
}

// ── Phân công gia sư ─────────────────────────────────────────────────────────

/** GET /admin/classes/{classId}/available-tutors — gia sư gợi ý cho lớp, người không trùng lịch xếp trước */
export async function fetchAvailableTutors(classId: number): Promise<AvailableTutorResponse[]> {
  const { data } = await api.get<ApiResponse<AvailableTutorResponse[]>>(`/admin/classes/${classId}/available-tutors`);
  return data.data ?? [];
}

/** GET /admin/sessions/{sessionId}/available-tutors — gia sư có thể dạy thay buổi này (rảnh giờ đó xếp trước) */
export async function fetchSubstituteTutors(sessionId: number): Promise<AvailableTutorResponse[]> {
  const { data } = await api.get<ApiResponse<AvailableTutorResponse[]>>(`/admin/sessions/${sessionId}/available-tutors`);
  return data.data ?? [];
}

/** GET /admin/tutor-board — lịch rảnh đã khai và buổi đang dạy của mọi gia sư từ `from` đến `to` (tối đa 31 ngày) */
export async function fetchTutorBoard(from: string, to: string): Promise<TutorBoardResponse[]> {
  const { data } = await api.get<ApiResponse<TutorBoardResponse[]>>("/admin/tutor-board", { params: { from, to } });
  return data.data ?? [];
}

/** POST /admin/classes/{classId}/assign — phân công gia sư chính cho lớp chưa có gia sư */
export async function assignTutor(classId: number, tutorId: number): Promise<AssignmentResponse> {
  const { data } = await api.post<ApiResponse<AssignmentResponse>>(`/admin/classes/${classId}/assign`, { tutorId });
  return data.data as AssignmentResponse;
}

/** PUT /admin/classes/{classId}/reassign — đổi gia sư chính của lớp, kèm lý do */
export async function reassignTutor(classId: number, tutorId: number, reason: string): Promise<AssignmentResponse> {
  return unwrap(await api.put<ApiResponse<AssignmentResponse>>(`/admin/classes/${classId}/reassign`, { tutorId, reason }));
}

/**
 * POST /admin/tutors/available
 * Tìm gia sư không bị trùng lịch với lịch lớp dự kiến.
 */
export async function fetchAvailableTutorsForSchedule(
    request: TutorScheduleAvailabilityRequest
): Promise<AvailableTutorResponse[]> {
    return unwrap(
        await api.post<ApiResponse<AvailableTutorResponse[]>>(
            "/admin/tutors/available",
            request
        )
    );
}
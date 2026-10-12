import { api } from "@/lib/api";
import type {
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
  CancelSessionRequest,
  CreateTutorRequest,
  LeaveRequestResponse,
  MakeupRequest,
  MeResponse,
  PageResponse,
  SessionResponse,
  SubstituteRequest,
  UpdateTutorProfileRequest,
} from "@/types/api";

/*
 * Các API của khu quản trị — đều là endpoint backend ĐÃ có (AdminUserController, SessionController,
 * SessionReschedulingController, LeaveRequestController, AttendanceController, TutorAssignmentController).
 * Mọi lời gọi cần đăng nhập bằng tài khoản ROLE_ADMIN.
 */

// ── Người dùng ───────────────────────────────────────────────────────────────

/** GET /admin/users — danh sách người dùng, lọc theo vai trò và tìm theo email / họ tên */
export async function fetchAdminUsers(query: AdminUsersQuery = {}): Promise<PageResponse<AdminUserResponse>> {
  const { data } = await api.get<ApiResponse<PageResponse<AdminUserResponse>>>("/admin/users", { params: query });
  return data.data as PageResponse<AdminUserResponse>;
}

/** POST /admin/users/tutors — tạo tài khoản gia sư kèm hồ sơ */
export async function createTutor(request: CreateTutorRequest): Promise<MeResponse> {
  const { data } = await api.post<ApiResponse<MeResponse>>("/admin/users/tutors", request);
  return data.data as MeResponse;
}

/** PUT /admin/users/{userId}/tutor-profile — sửa lương, thù lao và giới thiệu của một gia sư */
export async function updateTutorProfile(userId: number, request: UpdateTutorProfileRequest): Promise<MeResponse> {
  const { data } = await api.put<ApiResponse<MeResponse>>(`/admin/users/${userId}/tutor-profile`, request);
  return data.data as MeResponse;
}

// ── Buổi học ─────────────────────────────────────────────────────────────────

/** GET /admin/sessions — tìm mọi buổi học */
export async function fetchAdminSessions(query: AdminSessionsQuery = {}): Promise<PageResponse<SessionResponse>> {
  const { data } = await api.get<ApiResponse<PageResponse<SessionResponse>>>("/admin/sessions", { params: query });
  return data.data as PageResponse<SessionResponse>;
}

/** GET /sessions/{sessionId} — một buổi học */
export async function fetchSession(sessionId: number): Promise<SessionResponse> {
  const { data } = await api.get<ApiResponse<SessionResponse>>(`/sessions/${sessionId}`);
  return data.data as SessionResponse;
}

/** PUT /admin/sessions/{sessionId}/meeting-url — gắn link lớp trực tuyến (phải là https) */
export async function setMeetingUrl(sessionId: number, meetingUrl: string): Promise<SessionResponse> {
  const { data } = await api.put<ApiResponse<SessionResponse>>(`/admin/sessions/${sessionId}/meeting-url`, { meetingUrl });
  return data.data as SessionResponse;
}

/** POST /admin/sessions/{sessionId}/cancel — hủy buổi học (duyệt luôn các đơn xin nghỉ đang chờ của buổi) */
export async function cancelSession(sessionId: number, request: CancelSessionRequest): Promise<SessionResponse> {
  const { data } = await api.post<ApiResponse<SessionResponse>>(`/admin/sessions/${sessionId}/cancel`, request);
  return data.data as SessionResponse;
}

/** POST /admin/sessions/{sessionId}/makeup — xếp buổi học bù cho một đơn xin nghỉ; trả về buổi bù */
export async function createMakeup(sessionId: number, request: MakeupRequest): Promise<SessionResponse> {
  const { data } = await api.post<ApiResponse<SessionResponse>>(`/admin/sessions/${sessionId}/makeup`, request);
  return data.data as SessionResponse;
}

/** POST /admin/sessions/{sessionId}/substitute — phân gia sư dạy thay cho đơn xin nghỉ của gia sư */
export async function assignSubstitute(sessionId: number, request: SubstituteRequest): Promise<SessionResponse> {
  const { data } = await api.post<ApiResponse<SessionResponse>>(`/admin/sessions/${sessionId}/substitute`, request);
  return data.data as SessionResponse;
}

// ── Đơn xin nghỉ ─────────────────────────────────────────────────────────────

/** GET /admin/leave-requests — mọi đơn xin nghỉ, lọc theo trạng thái / người gửi / buổi học */
export async function fetchAdminLeaveRequests(query: AdminLeaveRequestsQuery = {}): Promise<PageResponse<LeaveRequestResponse>> {
  const { data } = await api.get<ApiResponse<PageResponse<LeaveRequestResponse>>>("/admin/leave-requests", { params: query });
  return data.data as PageResponse<LeaveRequestResponse>;
}

/** PATCH /admin/leave-requests/{requestId}/reject — từ chối một đơn đang chờ, kèm lý do */
export async function rejectLeaveRequest(requestId: number, reason: string): Promise<LeaveRequestResponse> {
  const { data } = await api.patch<ApiResponse<LeaveRequestResponse>>(`/admin/leave-requests/${requestId}/reject`, { reason });
  return data.data as LeaveRequestResponse;
}

// ── Điểm danh ────────────────────────────────────────────────────────────────

/** PATCH /admin/sessions/{sessionId}/attendance/lock — khóa hoặc mở khóa điểm danh của buổi đã kết thúc */
export async function setAttendanceLock(sessionId: number, input: AttendanceLockInput): Promise<AttendanceResponse> {
  const { data } = await api.patch<ApiResponse<AttendanceResponse>>(`/admin/sessions/${sessionId}/attendance/lock`, input);
  return data.data as AttendanceResponse;
}

/** PATCH /admin/sessions/{sessionId}/attendance/{recordId} — sửa một bản ghi điểm danh đã khóa, kèm lý do */
export async function correctAttendance(sessionId: number, recordId: number, input: AttendanceCorrection): Promise<AttendanceRecordResponse> {
  const { data } = await api.patch<ApiResponse<AttendanceRecordResponse>>(`/admin/sessions/${sessionId}/attendance/${recordId}`, input);
  return data.data as AttendanceRecordResponse;
}

// ── Phân công gia sư ─────────────────────────────────────────────────────────

/** GET /admin/classes/{classId}/available-tutors — gia sư gợi ý cho lớp, người không trùng lịch xếp trước */
export async function fetchAvailableTutors(classId: number): Promise<AvailableTutorResponse[]> {
  const { data } = await api.get<ApiResponse<AvailableTutorResponse[]>>(`/admin/classes/${classId}/available-tutors`);
  return data.data ?? [];
}

/** POST /admin/classes/{classId}/assign — phân công gia sư chính cho lớp chưa có gia sư */
export async function assignTutor(classId: number, tutorId: number): Promise<AssignmentResponse> {
  const { data } = await api.post<ApiResponse<AssignmentResponse>>(`/admin/classes/${classId}/assign`, { tutorId });
  return data.data as AssignmentResponse;
}

/** PUT /admin/classes/{classId}/reassign — đổi gia sư chính của lớp, kèm lý do */
export async function reassignTutor(classId: number, tutorId: number, reason: string): Promise<AssignmentResponse> {
  const { data } = await api.put<ApiResponse<AssignmentResponse>>(`/admin/classes/${classId}/reassign`, { tutorId, reason });
  return data.data as AssignmentResponse;
}

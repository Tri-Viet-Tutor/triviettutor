/* ─────────────────────────────────────────────────────────────────────────────
 * Kiểu dữ liệu khớp với backend (E:\triviettutor\backend — Spring Boot 3, Java 21).
 *
 * Tên thuộc tính ở đây lấy đúng theo các DTO / enum của backend; khi backend đổi
 * thì sửa file này trước, phần còn lại của frontend sẽ báo lỗi kiểu ở chỗ cần sửa.
 *
 * Quy ước chuyển kiểu Java → JSON:
 *   Long / Integer   → number
 *   LocalDate        → chuỗi "YYYY-MM-DD"
 *   LocalTime        → chuỗi "HH:mm:ss"
 *   OffsetDateTime   → chuỗi ISO-8601 có múi giờ
 * ───────────────────────────────────────────────────────────────────────────── */

export type IsoDate = string;
export type IsoTime = string;
export type IsoDateTime = string;

// ── common/api ───────────────────────────────────────────────────────────────

/** common.api.ApiResponse — mọi endpoint đều trả về khung này. Thuộc tính null bị lược bỏ. */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: ErrorCode;
}

/** common.api.PageResponse */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** common.exception.ErrorCode, cộng các mã do GlobalExceptionHandler / SecurityConfig tự đặt */
export type ErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_EXISTS"
  | "ACCESS_DENIED"
  | "USER_NOT_FOUND"
  | "COURSE_NOT_FOUND"
  | "CLASS_NOT_FOUND"
  | "SESSION_NOT_FOUND"
  | "ENROLLMENT_NOT_FOUND"
  | "LEAVE_REQUEST_NOT_FOUND"
  | "LEAVE_REQUEST_ALREADY_PENDING"
  | "LEAVE_REQUEST_ALREADY_RESOLVED"
  | "LEAVE_REQUEST_SESSION_MISMATCH"
  | "LEAVE_RESOLUTION_NOT_ALLOWED"
  | "SESSION_NOT_EDITABLE"
  | "SESSION_ALREADY_CANCELLED"
  | "MAKEUP_ALREADY_EXISTS"
  | "INVALID_MAKEUP_TIME"
  | "PAYROLL_FINALIZED"
  | "SESSION_STATE_CHANGED"
  | "SCHEDULE_CONFLICT"
  | "INVALID_AVAILABILITY"
  | "INVALID_TUTOR"
  | "CLASS_NOT_ASSIGNABLE"
  | "CLASS_ALREADY_ASSIGNED"
  | "ASSIGNMENT_NOT_FOUND"
  | "TUTOR_ALREADY_ASSIGNED"
  | "NO_ASSIGNABLE_SESSIONS"
  | "STUDENT_SCHEDULE_CONFLICT"
  | "SESSION_CONFIG_MISMATCH"
  | "INVALID_DATE_RANGE"
  | "INVALID_MEETING_URL"
  | "CLASS_FULL"
  | "CLASS_NOT_ENROLLING"
  | "ENROLLMENT_ALREADY_EXISTS"
  | "REFUND_NOT_ALLOWED"
  | "ATTENDANCE_LOCKED"
  | "SESSION_NOT_IN_PROGRESS"
  | "INVALID_STATUS_TRANSITION"
  // Không nằm trong enum ErrorCode nhưng backend vẫn trả về:
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

// ── Người dùng & đăng nhập (dto.auth, entity.User) ───────────────────────────

/** Giá trị cột users.role — mỗi người dùng một vai trò */
export type Role = "ROLE_ADMIN" | "ROLE_TUTOR" | "ROLE_STUDENT";

/** dto.auth.AuthRequest — POST /auth/login */
export interface AuthRequest {
  email: string;
  password: string;
}

/** dto.auth.RegisterRequest — POST /auth/register (luôn tạo tài khoản ROLE_STUDENT) */
export interface RegisterRequest {
  /** 2 – 100 ký tự */
  fullName: string;
  email: string;
  /** 6 – 128 ký tự */
  password: string;
}

/** dto.auth.AuthResponse.UserInfo */
export interface UserInfo {
  id: number;
  email: string;
  fullName: string;
  role: Role;
}

/** dto.auth.AuthResponse */
export interface AuthResponse {
  accessToken: string;
  user: UserInfo;
}

// ── enums ────────────────────────────────────────────────────────────────────

export type ClassType = "ONE_ON_ONE" | "GROUP";

export type ClassStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ENROLLING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED_TO_OPEN"
  | "CANCELLED";

export type SessionStatus = "SCHEDULED" | "IN_SESSION" | "COMPLETED" | "PENDING_RESCHEDULE" | "CANCELLED";

export type AssignmentStatus = "ACTIVE" | "TERMINATED";

export type LearningScheduleStatus = "ACTIVE" | "INACTIVE" | "CANCELLED";

export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type LeaveResolution = "MAKEUP" | "SUBSTITUTE" | "CANCEL";

export type SessionChangeType = "MAKEUP" | "SUBSTITUTE" | "CANCEL" | "REJECT_LEAVE";

/** Lịch học cố định trong tuần */
export type SchedulePattern = "MON_WED_FRI" | "TUE_THU_SAT" | "SAT_SUN";

/** Ca học: sáng 08:00–10:00, chiều 14:00–16:00, tối 18:00–20:00, tối muộn 19:30–21:30 */
export type TimeSlot = "SLOT_MORNING" | "SLOT_AFTERNOON" | "SLOT_EVENING" | "SLOT_LATE_EVENING";

// ── Buổi học (dto.schedule) ──────────────────────────────────────────────────

/** dto.schedule.SessionResponse — /me/sessions, /admin/sessions, /sessions/{sessionId} */
export interface SessionResponse {
  sessionId: number;
  classGroupId: number;
  sessionNumber: number;
  date: IsoDate;
  startTime: IsoTime;
  endTime: IsoTime;
  status: SessionStatus;
  scheduledTutorId: number | null;
  actualTutorId: number | null;
  meetingUrl: string | null;
  topicId: number | null;
  originalSessionId: number | null;
}

/** dto.schedule.MeetingUrlRequest — PUT /admin/sessions/{sessionId}/meeting-url (phải là URL https) */
export interface MeetingUrlRequest {
  meetingUrl: string;
}

/** Tham số lọc của GET /me/sessions */
export interface MySessionsQuery {
  from?: IsoDate;
  to?: IsoDate;
  status?: SessionStatus;
  classGroupId?: number;
}

/** Tham số lọc và phân trang của GET /admin/sessions (page từ 0, size 1 – 100, mặc định 20) */
export interface AdminSessionsQuery extends MySessionsQuery {
  tutorId?: number;
  page?: number;
  size?: number;
}

// ── Phân công gia sư (dto.assignment) ────────────────────────────────────────

/** dto.assignment.AvailabilityResponse — một khung giờ rảnh của gia sư */
export interface AvailabilityResponse {
  availableDate: IsoDate;
  startTime: IsoTime;
  endTime: IsoTime;
}

/** dto.assignment.AvailabilityRequest — PUT /tutor/availability (tối đa 1000 khung giờ) */
export interface AvailabilityRequest {
  slots: AvailabilityResponse[];
}

/** dto.assignment.ScheduleConflictResponse — cũng là data của lỗi SCHEDULE_CONFLICT */
export interface ScheduleConflictResponse {
  requestedSessionId: number;
  conflictSessionId: number;
  conflictClassGroupId: number;
  date: IsoDate;
  startTime: IsoTime;
  endTime: IsoTime;
}

/** dto.assignment.AvailableTutorResponse — GET /admin/classes/{classId}/available-tutors */
export interface AvailableTutorResponse {
  tutorId: number;
  tutorName: string;
  available: boolean;
  declaredAvailabilityCovered: boolean;
  availability: AvailabilityResponse[];
  conflicts: ScheduleConflictResponse[];
}

/** dto.assignment.AssignTutorRequest — POST /admin/classes/{classId}/assign */
export interface AssignTutorRequest {
  tutorId: number;
}

/** dto.assignment.ReassignTutorRequest — PUT /admin/classes/{classId}/reassign */
export interface ReassignTutorRequest {
  tutorId: number;
  /** tối đa 1000 ký tự */
  reason: string;
}

/** dto.assignment.AssignmentResponse */
export interface AssignmentResponse {
  assignmentId: number;
  classGroupId: number;
  tutorId: number;
  tutorName: string;
  status: AssignmentStatus;
  classStatus: ClassStatus;
  assignedBy: number;
  assignedAt: IsoDateTime;
  reason: string | null;
}

// ── Xin nghỉ & đổi buổi (dto.leave) ──────────────────────────────────────────

/** dto.leave.LeaveRequestInput — POST /sessions/{sessionId}/leave, PATCH /admin/leave-requests/{requestId}/reject */
export interface LeaveRequestInput {
  /** tối đa 1000 ký tự */
  reason: string;
}

/** dto.leave.LeaveRequestResponse */
export interface LeaveRequestResponse {
  leaveRequestId: number;
  sessionId: number;
  requesterId: number;
  /** "ROLE_TUTOR" hoặc "ROLE_STUDENT" */
  requesterRole: string;
  reason: string;
  requestedAt: IsoDateTime;
  /** Tên lấy theo thành phần record `isLateNotice` của backend */
  isLateNotice: boolean;
  status: LeaveRequestStatus;
  resolution: LeaveResolution | null;
  resolvedBy: number | null;
  resolvedAt: IsoDateTime | null;
  resolutionReason: string | null;
  replacementSessionId: number | null;
  sessionNewStatus: SessionStatus;
}

/** Tham số của GET /me/leave-requests */
export interface MyLeaveRequestsQuery {
  status?: LeaveRequestStatus;
  page?: number;
  size?: number;
}

/** Tham số của GET /admin/leave-requests */
export interface AdminLeaveRequestsQuery extends MyLeaveRequestsQuery {
  requesterId?: number;
  sessionId?: number;
}

/** dto.leave.MakeupRequest — POST /admin/sessions/{sessionId}/makeup */
export interface MakeupRequest {
  leaveRequestId: number;
  makeupDate: IsoDate;
  startTime: IsoTime;
  endTime: IsoTime;
}

/** dto.leave.SubstituteRequest — POST /admin/sessions/{sessionId}/substitute */
export interface SubstituteRequest {
  leaveRequestId: number;
  substituteTutorId: number;
  reason: string;
}

/** dto.leave.CancelSessionRequest — POST /admin/sessions/{sessionId}/cancel */
export interface CancelSessionRequest {
  reason: string;
  leaveRequestId?: number;
}

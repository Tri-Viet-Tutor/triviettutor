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
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_EXISTS"
  | "INVALID_OTP"
  | "OTP_EXPIRED"
  | "ACCOUNT_NOT_VERIFIED"
  | "ACCOUNT_ALREADY_VERIFIED"
  | "EMAIL_SEND_FAILED"
  | "ACCESS_DENIED"
  | "INVALID_PROFILE_FIELD"
  | "INVALID_ROLE_FILTER"
  | "INVALID_PAGINATION"
  | "USER_NOT_FOUND"
  | "USER_NOT_TUTOR"
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
  | "ATTENDANCE_NOT_FOUND"
  | "INVALID_ATTENDANCE"
  | "ATTENDANCE_STUDENT_NOT_ENROLLED"
  | "ATTENDANCE_REASON_REQUIRED"
  | "ATTENDANCE_NOT_LOCKED"
  | "ATTENDANCE_SESSION_NOT_ENDED"
  | "ATTENDANCE_EXCUSED_NOT_ALLOWED"
  | "INVALID_STATUS_TRANSITION"
  // (Đề xuất) Đơn hàng & thanh toán VNPay — backend chưa có
  | "ORDER_NOT_FOUND"
  | "INVALID_ORDER_ITEMS"
  | "INVALID_PAYMENT_SIGNATURE"
  | "PAYMENT_REQUIRED"
  // Không nằm trong enum ErrorCode nhưng backend vẫn trả về:
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

// ── Người dùng & đăng nhập (dto.auth, entity.User) ───────────────────────────

/** Giá trị cột users.role — mỗi người dùng một vai trò */
export type Role = "ROLE_ADMIN" | "ROLE_TUTOR" | "ROLE_STUDENT";

/** dto.auth.AuthRequest — POST /auth/login */
export interface AuthRequest {
  email: string;
  password: string;
}

/**
 * dto.auth.RegisterRequest — POST /auth/register (luôn tạo tài khoản ROLE_STUDENT).
 * Tài khoản mới chưa kích hoạt: backend gửi mã OTP qua email và trả về RegisterResponse;
 * phải gọi POST /auth/verify-email mới nhận được AuthResponse.
 */
export interface RegisterRequest {
  /** 2 – 100 ký tự */
  fullName: string;
  email: string;
  /** 6 – 128 ký tự */
  password: string;
}

/** dto.auth.RegisterResponse — kết quả của /auth/register và /auth/resend-verification */
export interface RegisterResponse {
  email: string;
  message: string;
}

/** dto.auth.VerifyEmailRequest — POST /auth/verify-email (mã OTP 6 số, hết hạn sau 5 phút) */
export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

/** dto.auth.ResendVerificationRequest — POST /auth/resend-verification */
export interface ResendVerificationRequest {
  email: string;
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

// ── Enum ─────────────────────────────────────────────────────────────────────

export type ClassType = "ONE_ON_ONE" | "GROUP";

export type ClassStatus = "DRAFT" | "PUBLISHED" | "ENROLLING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "FAILED_TO_OPEN" | "CANCELLED";

export type SessionStatus = "SCHEDULED" | "IN_SESSION" | "COMPLETED" | "PENDING_RESCHEDULE" | "CANCELLED";

export type AssignmentStatus = "ACTIVE" | "TERMINATED";

export type LearningScheduleStatus = "ACTIVE" | "INACTIVE" | "CANCELLED";

export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type LeaveResolution = "MAKEUP" | "SUBSTITUTE" | "CANCEL" | "EXCUSED";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export type SessionChangeType = "MAKEUP" | "SUBSTITUTE" | "CANCEL" | "REJECT_LEAVE";

/** Lịch học cố định trong tuần */
export type SchedulePattern = "MON_WED_FRI" | "TUE_THU_SAT" | "SAT_SUN";

/** Ca học: sáng 08:00–10:00, chiều 14:00–16:00, tối 18:00–20:00, tối muộn 19:30–21:30 */
export type TimeSlot = "SLOT_MORNING" | "SLOT_AFTERNOON" | "SLOT_EVENING" | "SLOT_LATE_EVENING";

// ── Danh mục khóa học & lớp (catalog) ─────────────────────────────────────────
// Backend CHƯA hiện thực phần này (entity ClassGroup mới có classType, status, enrollmentDeadline).
// Các kiểu dưới đây lấy theo đặc tả API của nhóm
// (Documentation/02-System-Architecture/02-Backend-Architecture-and-API-Specification.md, mục 7.3)
// để giao diện dùng đúng tên thuộc tính ngay từ đầu; đối chiếu lại khi backend làm xong.

/** courses.grade_level — "GRADE_1" … "GRADE_12". Trang web hiện chỉ dùng lớp 10 – 12. */
export type GradeLevel = `GRADE_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;

/** class_groups.delivery_mode — OFFLINE là học tại trung tâm (không dạy tại nhà học viên) */
export type DeliveryMode = "ONLINE" | "OFFLINE";

/** Course — POST/GET /admin/courses */
export interface CourseResponse {
  id: number;
  name: string;
  /** Mã môn, ví dụ "MATH" */
  subject: string;
  gradeLevel: GradeLevel;
  /** Học phí gốc của lớp 1 kèm 1 cho trọn khóa (đồng) */
  basePrice1on1: number;
  totalSessions: number;
  /** Thời lượng mỗi buổi, mặc định 120 phút */
  durationMinutes: number;
  description: string | null;
  active: boolean;
  createdAt: IsoDateTime;
}

/** Một lớp đang mở đăng ký — phần tử của GET /catalog/classes */
export interface CatalogClassResponse {
  id: number;
  /** Ví dụ "MATH-G10-MWF-M-001" */
  classCode: string;
  courseName: string;
  subject: string;
  gradeLevel: GradeLevel;
  classType: ClassType;
  deliveryMode: DeliveryMode;
  schedulePattern: SchedulePattern;
  timeSlot: TimeSlot;
  /** Ví dụ "08:00 – 10:00" */
  timeSlotLabel: string;
  startDate: IsoDate;
  totalSessions: number;
  basePrice1on1: number;
  /** Học phí ước tính nếu đăng ký ngay (theo bậc sĩ số sau khi thêm học viên này) */
  estimatedFee: number;
  /** Ví dụ 0.35 = giảm 35% */
  discountRate: number;
  currentStudents: number;
  /** 1 với ONE_ON_ONE, 8 với GROUP */
  maxStudents: number;
  spotsLeft: number;
}

/** Tham số lọc của GET /catalog/classes */
export interface CatalogClassesQuery {
  subject?: string;
  gradeLevel?: GradeLevel;
  deliveryMode?: DeliveryMode;
  schedulePattern?: SchedulePattern;
  timeSlot?: TimeSlot;
  page?: number;
  size?: number;
}

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
  /** Khác null nghĩa là buổi học bù của buổi có mã này */
  originalSessionId: number | null;
  attendanceLocked: boolean;
  attendanceNeedsReview: boolean;
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

// ── Điểm danh (dto.attendance) ───────────────────────────────────────────────

/** dto.attendance.AttendanceRecordResponse */
export interface AttendanceRecordResponse {
  recordId: number;
  studentId: number;
  status: AttendanceStatus;
  note: string | null;
  /** Giờ tới lớp (khi đi trễ) */
  arrivedAt: IsoDateTime | null;
  recordedBy: number | null;
  recordedAt: IsoDateTime | null;
  locked: boolean;
}

/**
 * dto.attendance.AttendanceResponse — GET /sessions/{sessionId}/attendance.
 * Học viên chỉ nhận bản ghi của chính mình: `records` rỗng nghĩa là buổi này chưa điểm danh.
 */
export interface AttendanceResponse {
  sessionId: number;
  sessionStatus: SessionStatus;
  locked: boolean;
  editDeadline: IsoDateTime | null;
  teachingConfirmed: boolean;
  taughtByTutorId: number | null;
  needsAdminReview: boolean;
  studentIds: number[];
  missingStudentIds: number[];
  records: AttendanceRecordResponse[];
}

/** dto.attendance.AttendanceRecordInput */
export interface AttendanceRecordInput {
  studentId: number;
  status: AttendanceStatus;
  /** tối đa 1000 ký tự */
  note?: string;
  /** Giờ học viên tới lớp (tuỳ chọn); phải nằm trong buổi học và không ở tương lai */
  arrivedAt?: IsoDateTime;
}

/**
 * dto.attendance.AttendanceSubmission — PUT /sessions/{sessionId}/attendance.
 * Gia sư gửi là tự xác nhận đã dạy. Quản trị muốn xác nhận đã dạy thì gửi teachingConfirmed = true kèm reason.
 */
export interface AttendanceSubmission {
  records: AttendanceRecordInput[];
  teachingConfirmed?: boolean;
  reason?: string;
}

/** dto.attendance.AttendanceLockInput — PATCH /admin/sessions/{sessionId}/attendance/lock */
export interface AttendanceLockInput {
  locked: boolean;
  reason: string;
}

/** dto.attendance.AttendanceCorrection — PATCH /admin/sessions/{sessionId}/attendance/{recordId} */
export interface AttendanceCorrection {
  status: AttendanceStatus;
  note?: string;
  arrivedAt?: IsoDateTime;
  reason: string;
}

// ── Hồ sơ của tôi (dto.user) ─────────────────────────────────────────────────

/** dto.user.MeResponse.StudentProfileResponse */
export interface StudentProfileResponse {
  phone: string | null;
  address: string | null;
}

/** dto.user.MeResponse.TutorProfileResponse */
export interface TutorProfileResponse {
  /** Lương cơ bản mỗi tháng (VND) */
  baseSalary: number | null;
  /** Thù lao mỗi buổi dạy (VND) */
  sessionRate: number | null;
  bio: string | null;
}

/**
 * dto.user.MeResponse — GET /me, PUT /me.
 * `profile` theo vai trò: học viên có phone / address, gia sư có baseSalary / sessionRate / bio, quản trị là null.
 */
export interface MeResponse extends UserInfo {
  createdAt: IsoDateTime;
  profile: Partial<StudentProfileResponse & TutorProfileResponse> | null;
}

/**
 * dto.user.UpdateMeRequest — PUT /me. Trường lạ hoặc trường của vai trò khác bị backend từ chối:
 * học viên chỉ gửi phone / address, gia sư chỉ gửi bio, quản trị chỉ gửi fullName.
 */
export interface UpdateMeRequest {
  /** bắt buộc, tối đa 100 ký tự */
  fullName: string;
  /** tối đa 20 ký tự */
  phone?: string;
  address?: string;
  bio?: string;
}

// ── Quản trị người dùng (dto.user) ───────────────────────────────────────────

/** dto.user.AdminUserResponse — GET /admin/users */
export interface AdminUserResponse extends UserInfo {
  createdAt: IsoDateTime;
}

/** Tham số của GET /admin/users (page từ 0, size 1 – 100) */
export interface AdminUsersQuery {
  role?: Role;
  /** Tìm theo email hoặc họ tên, không phân biệt hoa thường */
  search?: string;
  page?: number;
  size?: number;
}

/** dto.user.UpdateTutorProfileRequest — PUT /admin/users/{userId}/tutor-profile (tiền là số nguyên không âm) */
export interface UpdateTutorProfileRequest {
  baseSalary: number;
  sessionRate: number;
  bio?: string;
}

/** dto.user.CreateTutorRequest — POST /admin/users/tutors */
export interface CreateTutorRequest extends UpdateTutorProfileRequest {
  email: string;
  /** 6 – 128 ký tự */
  password: string;
  /** 2 – 100 ký tự */
  fullName: string;
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

// ── services/api.ts ──
/** Lỗi đã tách ra từ khung ApiResponse của backend. */
export interface ApiError {
  /** Thông báo dễ đọc do backend gửi về */
  message?: string;
  /** Mã lỗi cho máy đọc — đổi sang câu chữ hiển thị ở nơi cần */
  errorCode?: ErrorCode;
  /** Với VALIDATION_ERROR: tên trường → thông báo lỗi (nằm trong `data` của khung) */
  fieldErrors?: Record<string, string>;
}

// ── services/authService.ts ──
/** Dữ liệu gửi khi quên mật khẩu */
export interface ForgotPasswordRequest {
  email: string;
}

/** Dữ liệu gửi khi đặt lại mật khẩu bằng mã OTP */
export interface ResetPasswordRequest {
  email: string;
  otp: string;
  /** 6 – 128 ký tự, cùng giới hạn với mật khẩu lúc đăng ký */
  newPassword: string;
}

// ── services/orderService.ts ──
/** (Đề xuất) Kết quả của POST /orders/checkout */
export interface OrderResponse {
  orderId: number;
  /** Mã đơn hiển thị cho người mua */
  orderCode: string;
  /** Tổng tiền máy chủ chốt cho đơn (VND) */
  totalAmount: number;
  /** Đường dẫn thanh toán VNPay đã ký */
  paymentUrl: string;
  /** Thời điểm đường dẫn hết hạn (ISO 8601) */
  expiresAt?: string;
}

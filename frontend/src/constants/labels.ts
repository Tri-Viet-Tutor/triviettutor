import type {
  AttendanceStatus,
  ClassStatus,
  ClassType,
  EnrollmentStatus,
  LeaveRequestStatus,
  LeaveResolution,
  PayrollStatus,
  Role,
  SessionStatus,
} from "@/interfaces/api";
import type { HomeworkStatus, SubmissionStatus } from "@/interfaces/learning";
import type { Tone, StatusStyle } from "@/interfaces/ui";

/* Chữ và màu hiển thị cho các enum của backend dùng trong ba khu sau đăng nhập */

/** Màu nền + chữ của nhãn trạng thái */
export const TONE_CHIP: Record<Tone, string> = {
  navy: "bg-brand-tint text-brand-navy ring-1 ring-inset ring-brand-navy/10",
  green: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-500/20",
  red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15",
  slate: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-400/15",
};

/** Trạng thái buổi học */
export const SESSION_STATUS: Record<SessionStatus, StatusStyle> = {
  SCHEDULED: { label: "Sắp học", tone: "navy", icon: "event" },
  IN_SESSION: { label: "Đang học", tone: "green", icon: "play_circle" },
  COMPLETED: { label: "Đã học", tone: "slate", icon: "check_circle" },
  PENDING_RESCHEDULE: { label: "Chờ xếp lại lịch", tone: "amber", icon: "pending" },
  CANCELLED: { label: "Đã hủy", tone: "red", icon: "event_busy" },
};

/** Trạng thái điểm danh */
export const ATTENDANCE_STATUS: Record<AttendanceStatus, StatusStyle> = {
  PRESENT: { label: "Có mặt", tone: "green", icon: "check_circle" },
  LATE: { label: "Đi trễ", tone: "amber", icon: "schedule" },
  ABSENT: { label: "Vắng", tone: "red", icon: "cancel" },
  EXCUSED: { label: "Nghỉ có phép", tone: "navy", icon: "verified" },
};

/** Thứ tự các trạng thái điểm danh trên nút chọn / ô chọn */
export const ATTENDANCE_STATUS_ORDER: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

/** Trạng thái đơn xin nghỉ */
export const LEAVE_STATUS: Record<LeaveRequestStatus, StatusStyle> = {
  PENDING: { label: "Chờ duyệt", tone: "amber", icon: "hourglass_top" },
  APPROVED: { label: "Đã duyệt", tone: "green", icon: "check_circle" },
  REJECTED: { label: "Bị từ chối", tone: "red", icon: "cancel" },
};

/** Cách trung tâm xử lý một đơn đã duyệt */
export const LEAVE_RESOLUTION: Record<LeaveResolution, string> = {
  MAKEUP: "Được xếp buổi học bù",
  SUBSTITUTE: "Có gia sư dạy thay",
  CANCEL: "Buổi học được hủy",
  EXCUSED: "Tính là nghỉ có phép",
};

/** Tên gọi của từng vai trò */
export const ROLE_NAME: Record<Role, string> = {
  ROLE_STUDENT: "Học viên",
  ROLE_TUTOR: "Gia sư",
  ROLE_ADMIN: "Quản trị viên",
};

/** Trạng thái lớp học (vòng đời DRAFT → PUBLISHED → ENROLLING → ASSIGNED → IN_PROGRESS → COMPLETED) */
export const CLASS_STATUS: Record<ClassStatus, StatusStyle> = {
  DRAFT: { label: "Bản nháp", tone: "slate", icon: "edit_note" },
  PUBLISHED: { label: "Đã đăng", tone: "navy", icon: "public" },
  ENROLLING: { label: "Đang tuyển sinh", tone: "amber", icon: "how_to_reg" },
  ASSIGNED: { label: "Đã có gia sư", tone: "navy", icon: "assignment_ind" },
  IN_PROGRESS: { label: "Đang học", tone: "green", icon: "play_circle" },
  COMPLETED: { label: "Đã kết thúc", tone: "slate", icon: "task_alt" },
  FAILED_TO_OPEN: { label: "Không đủ sĩ số", tone: "red", icon: "group_off" },
  CANCELLED: { label: "Đã hủy", tone: "red", icon: "cancel" },
};

/** Thứ tự trạng thái lớp trên bộ lọc */
export const CLASS_STATUS_ORDER: ClassStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "ENROLLING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED_TO_OPEN",
  "CANCELLED",
];

/** Loại lớp */
export const CLASS_TYPE_LABEL: Record<ClassType, string> = {
  GROUP: "Lớp nhóm",
  ONE_ON_ONE: "1 kèm 1",
};

/** Trạng thái ghi danh */
export const ENROLLMENT_STATUS: Record<EnrollmentStatus, StatusStyle> = {
  ACTIVE: { label: "Đang học", tone: "green", icon: "check_circle" },
  CANCELLED: { label: "Đã hủy", tone: "slate", icon: "cancel" },
  REFUNDED: { label: "Đã hoàn tiền", tone: "amber", icon: "currency_exchange" },
};

/** Trạng thái bảng lương tháng */
export const PAYROLL_STATUS: Record<PayrollStatus, StatusStyle> = {
  DRAFT: { label: "Tạm tính", tone: "amber", icon: "pending" },
  FINALIZED: { label: "Đã chốt", tone: "green", icon: "lock" },
};

/** Trạng thái bài tập (phía gia sư) */
export const HOMEWORK_STATUS: Record<HomeworkStatus, StatusStyle> = {
  DRAFT: { label: "Bản nháp", tone: "slate", icon: "edit_note" },
  PUBLISHED: { label: "Đã công bố", tone: "green", icon: "campaign" },
  CLOSED: { label: "Đã đóng", tone: "red", icon: "lock" },
};

/** Trạng thái bài làm của học viên */
export const SUBMISSION_STATUS: Record<SubmissionStatus, StatusStyle> = {
  NOT_STARTED: { label: "Chưa làm", tone: "slate", icon: "radio_button_unchecked" },
  IN_PROGRESS: { label: "Đang làm", tone: "amber", icon: "edit" },
  SUBMITTED: { label: "Đã nộp", tone: "navy", icon: "upload" },
  GRADED: { label: "Đã chấm", tone: "green", icon: "grading" },
};

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
} from "@/interfaces/dto";
import type { HomeworkStatus, SubmissionStatus } from "@/interfaces/homework";
import type { Tone, StatusStyle } from "@/interfaces/ui";

// Chữ và màu hiển thị cho các enum của backend dùng trong ba khu sau đăng nhập

// Màu nền + chữ của nhãn trạng thái
export const TONE_CHIP: Record<Tone, string> = {
  navy: "bg-brand-tint text-brand-navy ring-1 ring-inset ring-brand-navy/10",
  green: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-500/20",
  red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15",
  slate: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-400/15",
};

// Trạng thái buổi học
export const SESSION_STATUS: Record<SessionStatus, StatusStyle> = {
  SCHEDULED: { label: "Sắp học", tone: "navy", icon: "event" },
  IN_SESSION: { label: "Đang học", tone: "green", icon: "play_circle" },
  COMPLETED: { label: "Đã học", tone: "slate", icon: "check_circle" },
  PENDING_RESCHEDULE: { label: "Chờ xếp lại lịch", tone: "amber", icon: "pending" },
  CANCELLED: { label: "Đã hủy", tone: "red", icon: "event_busy" },
};

// Trạng thái điểm danh
export const ATTENDANCE_STATUS: Record<AttendanceStatus, StatusStyle> = {
  PRESENT: { label: "Có mặt", tone: "green", icon: "check_circle" },
  LATE: { label: "Đi trễ", tone: "amber", icon: "schedule" },
  ABSENT: { label: "Vắng mặt", tone: "red", icon: "cancel" },
  EXCUSED: { label: "Nghỉ có phép", tone: "navy", icon: "verified" },
};

// Trạng thái được chọn khi điểm danh: chỉ Có mặt / Vắng mặt (Đi trễ, Có phép chỉ còn để hiện bản ghi cũ)
export const ATTENDANCE_STATUS_ORDER: AttendanceStatus[] = ["PRESENT", "ABSENT"];

// Trạng thái đơn xin nghỉ
export const LEAVE_STATUS: Record<LeaveRequestStatus, StatusStyle> = {
  PENDING: { label: "Chờ duyệt", tone: "amber", icon: "hourglass_top" },
  APPROVED: { label: "Đã duyệt", tone: "green", icon: "check_circle" },
  REJECTED: { label: "Bị từ chối", tone: "red", icon: "cancel" },
};

// Cách trung tâm xử lý một đơn đã duyệt
export const LEAVE_RESOLUTION: Record<LeaveResolution, string> = {
  MAKEUP: "Được xếp buổi học bù",
  SUBSTITUTE: "Có gia sư dạy thay",
  CANCEL: "Buổi học được hủy",
  EXCUSED: "Tính là nghỉ có phép",
};

// Tên gọi của từng vai trò
export const ROLE_NAME: Record<Role, string> = {
  ROLE_STUDENT: "Học viên",
  ROLE_TUTOR: "Gia sư",
  ROLE_ADMIN: "Quản trị viên",
};

// Trạng thái lớp học (vòng đời DRAFT → PUBLISHED → ENROLLING → ASSIGNED → IN_PROGRESS → COMPLETED)
export const CLASS_STATUS: Record<ClassStatus, StatusStyle> = {
  DRAFT: { label: "Bản nháp", tone: "slate", icon: "edit_note" },
  PUBLISHED: { label: "Chưa mở đăng ký", tone: "slate", icon: "public" },
  ENROLLING: { label: "Đang tuyển sinh", tone: "amber", icon: "how_to_reg" },
  ASSIGNED: { label: "Đã chốt lớp", tone: "navy", icon: "lock" },
  IN_PROGRESS: { label: "Đang học", tone: "green", icon: "play_circle" },
  COMPLETED: { label: "Đã kết thúc", tone: "slate", icon: "task_alt" },
  FAILED_TO_OPEN: { label: "Không đủ sĩ số", tone: "red", icon: "group_off" },
  CANCELLED: { label: "Đã hủy", tone: "red", icon: "cancel" },
};

// Thứ tự trạng thái lớp trên bộ lọc
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

// Loại lớp
export const CLASS_TYPE_LABEL: Record<ClassType, string> = {
  GROUP: "Lớp nhóm",
  ONE_ON_ONE: "1 kèm 1",
};

// Trạng thái ghi danh
export const ENROLLMENT_STATUS: Record<EnrollmentStatus, StatusStyle> = {
  ACTIVE: { label: "Đang học", tone: "green", icon: "check_circle" },
  CANCELLED: { label: "Đã hủy", tone: "slate", icon: "cancel" },
  REFUNDED: { label: "Đã hoàn tiền", tone: "amber", icon: "currency_exchange" },
};

// Nhãn chuẩn của trạng thái giao dịch học phí (PAY-01)
export const TRANSACTION_STATUS = {
  SUCCESS: { label: "Thành công", tone: "green", icon: "check_circle" },
  PENDING: { label: "Đang xử lý / Giữ chỗ", tone: "amber", icon: "hourglass_top" },
  FAILED: { label: "Thất bại", tone: "red", icon: "cancel" },
  REFUNDED: { label: "Đã hoàn tiền", tone: "slate", icon: "currency_exchange" },
} satisfies Record<string, StatusStyle>;

// Trạng thái ngoài 4 nhãn chuẩn mà backend vẫn có thể trả về
const OTHER_TRANSACTION_STATUS: Record<string, StatusStyle> = {
  PARTIALLY_REFUNDED: { label: "Hoàn một phần", tone: "amber", icon: "currency_exchange" },
  REQUIRES_REFUND: { label: "Cần hoàn tiền", tone: "red", icon: "warning" },
  EXPIRED: { label: "Hết hạn giữ chỗ", tone: "slate", icon: "timer_off" },
  CANCELLED: { label: "Đã hủy", tone: "slate", icon: "block" },
};

// Nhãn của một trạng thái giao dịch backend (đơn học phí, thanh toán, yêu cầu thanh toán):
// COMPLETED / PAID là "Thành công", PENDING / PENDING_PAYMENT là "Đang xử lý / Giữ chỗ".
export function transactionStatus(status: string): StatusStyle {
  if (status === "SUCCESS" || status === "COMPLETED" || status === "PAID") return TRANSACTION_STATUS.SUCCESS;
  if (status === "PENDING" || status === "PENDING_PAYMENT") return TRANSACTION_STATUS.PENDING;
  if (status === "FAILED") return TRANSACTION_STATUS.FAILED;
  if (status === "REFUNDED") return TRANSACTION_STATUS.REFUNDED;
  return OTHER_TRANSACTION_STATUS[status] ?? { label: status, tone: "slate", icon: "help" };
}

// Trạng thái bảng lương tháng
export const PAYROLL_STATUS: Record<PayrollStatus, StatusStyle> = {
  DRAFT: { label: "Tạm tính", tone: "amber", icon: "pending" },
  FINALIZED: { label: "Đã chốt", tone: "green", icon: "lock" },
  DISPUTED: { label: "Đang khiếu nại", tone: "red", icon: "report" },
};

// Trạng thái bài tập (phía gia sư)
export const HOMEWORK_STATUS: Record<HomeworkStatus, StatusStyle> = {
  DRAFT: { label: "Bản nháp", tone: "slate", icon: "edit_note" },
  PUBLISHED: { label: "Đã công bố", tone: "green", icon: "campaign" },
  CLOSED: { label: "Đã đóng", tone: "red", icon: "lock" },
};

// Trạng thái bài làm của học viên
export const SUBMISSION_STATUS: Record<SubmissionStatus, StatusStyle> = {
  NOT_STARTED: { label: "Chưa làm", tone: "slate", icon: "radio_button_unchecked" },
  IN_PROGRESS: { label: "Đang làm", tone: "amber", icon: "edit" },
  SUBMITTED: { label: "Đã nộp", tone: "navy", icon: "upload" },
  GRADED: { label: "Đã chấm", tone: "green", icon: "grading" },
};

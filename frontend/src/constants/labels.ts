import type { AttendanceStatus, LeaveRequestStatus, LeaveResolution, Role, SessionStatus } from "@/interfaces/api";
import type { Tone, StatusStyle } from "@/interfaces/ui";

/* Chữ và màu hiển thị cho các enum của backend dùng trong ba khu sau đăng nhập */

/** Màu nền + chữ của nhãn trạng thái */
export const TONE_CHIP: Record<Tone, string> = {
  navy: "bg-brand-tint text-brand-navy",
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-slate-600",
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

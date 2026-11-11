import { DURATION_MAX, DURATION_MIN, MIN_COURSE_PRICE } from "@/constants/management";
import { formatVnd } from "@/utils/currency";

// Quy tắc kiểm tra dữ liệu nhập dùng chung cho mọi form.
// Mỗi hàm trả về câu báo lỗi, hoặc null khi hợp lệ, nên chỗ gọi chỉ việc:
// const error = requireText(name, "Tên khóa học", 200);
// if (error) return setFormError(error);
// Ngưỡng lấy từ constants/ để khớp với ràng buộc của backend; đừng viết lại số trong component.

// Số buổi tối đa khi mở một lớp (ClassService của backend chặn ở 1000, form chặn chặt hơn)
export const SESSION_COUNT_MIN = 1;
export const SESSION_COUNT_MAX = 200;

// Độ dài tối đa của ô lý do (đơn xin nghỉ, khiếu nại lương)
export const REASON_MAX = 1000;

// Bắt buộc nhập, và không vượt quá độ dài cho phép
export function requireText(value: string, label: string, max?: number): string | null {
  if (!value.trim()) return `Nhập ${label.toLowerCase()}.`;
  if (max !== undefined && value.trim().length > max) return `${label} tối đa ${max} ký tự.`;
  return null;
}

// Số nằm trong khoảng, kèm đơn vị để câu báo lỗi đọc tự nhiên
export function requireRange(value: number, label: string, min: number, max: number, unit = ""): string | null {
  if (!Number.isFinite(value) || value < min || value > max) {
    return `${label} phải từ ${min} đến ${max}${unit ? ` ${unit}` : ""}.`;
  }
  return null;
}

// Học phí mỗi buổi, khớp @DecimalMin của CourseRequest bên backend
export function validateCoursePrice(value: number): string | null {
  if (!value || value < MIN_COURSE_PRICE) return `Học phí mỗi buổi tối thiểu ${formatVnd(MIN_COURSE_PRICE)}.`;
  return null;
}

// Thời lượng mỗi buổi, khớp @Min/@Max của CourseRequest bên backend
export function validateDuration(minutes: number): string | null {
  return requireRange(minutes, "Thời lượng mỗi buổi", DURATION_MIN, DURATION_MAX, "phút");
}

// Số buổi của một lớp
export function validateSessionCount(count: number): string | null {
  if (!Number.isInteger(count)) return "Số buổi phải là số nguyên.";
  return requireRange(count, "Số buổi", SESSION_COUNT_MIN, SESSION_COUNT_MAX);
}

// Chỉ nhận đường dẫn https, dùng cho link phòng học và link tài liệu
export function validateHttpsUrl(url: string, label: string): string | null {
  if (!url.trim()) return null;
  return /^https:\/\/\S+$/.test(url.trim()) ? null : `${label} phải bắt đầu bằng https://`;
}

// Ngày không được nằm ở quá khứ (so theo chuỗi ISO yyyy-mm-dd)
export function validateNotPast(iso: string, label: string, todayIso: string): string | null {
  if (!iso) return `Hãy chọn ${label.toLowerCase()}.`;
  return iso < todayIso ? `${label} không được ở quá khứ.` : null;
}

// Giờ bắt đầu phải trước giờ kết thúc
export function validateTimeOrder(start: string, end: string): string | null {
  if (!start || !end) return "Hãy chọn đủ giờ bắt đầu và giờ kết thúc.";
  return start >= end ? "Giờ bắt đầu phải trước giờ kết thúc." : null;
}

// Độ dài tối thiểu, dùng cho mật khẩu bài tập và các ô tương tự
export function requireMinLength(value: string, label: string, min: number): string | null {
  if (!value.trim()) return null;
  return value.trim().length < min ? `${label} cần từ ${min} ký tự trở lên.` : null;
}

// Mốc thời gian phải ở tương lai (nhận chuỗi ISO hoặc giá trị của input datetime-local)
export function validateFuture(value: string, label: string): string | null {
  if (!value) return `Hãy nhập ${label.toLowerCase()}.`;
  const at = new Date(value).getTime();
  if (Number.isNaN(at)) return `${label} không hợp lệ.`;
  return at <= Date.now() ? `${label} phải ở tương lai.` : null;
}

// Mốc trước phải sớm hơn mốc sau; bỏ qua khi một trong hai còn trống
export function validateBefore(earlier: string, later: string, earlierLabel: string, laterLabel: string): string | null {
  if (!earlier || !later) return null;
  return new Date(earlier).getTime() >= new Date(later).getTime()
    ? `${earlierLabel} phải trước ${laterLabel.toLowerCase()}.`
    : null;
}

// Quy tắc dùng chung cho mọi lớp: hạn đăng ký phải trước ngày khai giảng
export function validateEnrollmentDeadline(deadline: string, startDate: string): string | null {
  return validateBefore(deadline, startDate, "Hạn đăng ký", "ngày khai giảng");
}

// Tệp tải lên: đúng định dạng cho phép và không vượt dung lượng
export function validateFile(file: File, options: { accept?: string[]; maxBytes: number; sizeLabel: string; typeLabel?: string }): string | null {
  if (options.accept && !options.accept.includes(file.type)) {
    return `Chỉ nhận ${options.typeLabel ?? "định dạng được hỗ trợ"}.`;
  }
  return file.size > options.maxBytes ? `Tệp tối đa ${options.sizeLabel}.` : null;
}

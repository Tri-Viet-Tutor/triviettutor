import { COURSES } from "@/constants/courses";
import { GRADE_OPTIONS, SCHEDULE_PATTERN_OPTIONS, TIME_SLOT_OPTIONS } from "@/constants/classOptions";

/* Chữ hiển thị cho các trang quản lý khóa học, lớp học và bảng lương. */

/** Các môn trung tâm đang dạy: mã môn của backend + tên tiếng Việt + biểu tượng */
export const SUBJECT_OPTIONS: { value: string; label: string; icon: string }[] = COURSES.map((course) => ({
  value: course.subject,
  label: course.subjectLabel,
  icon: course.icon,
}));

/** Thời lượng mặc định mỗi buổi khi tạo khóa (phút) */
export const DEFAULT_DURATION_MINUTES = 120;

/** Số buổi mặc định của một khóa khi tạo mới */
export const DEFAULT_TOTAL_SESSIONS = 24;

/** Tra nhãn từ danh sách lựa chọn; không có thì trả lại nguyên giá trị */
function labelFrom<T extends string>(options: { value: T; label: string }[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** "Toán" từ "MATH" */
export const subjectLabel = (subject: string) => labelFrom(SUBJECT_OPTIONS, subject);
/** Biểu tượng của môn */
export const subjectIcon = (subject: string) => SUBJECT_OPTIONS.find((option) => option.value === subject)?.icon ?? "menu_book";
/** "Lớp 10" từ "GRADE_10" */
export const gradeLabel = (grade: (typeof GRADE_OPTIONS)[number]["value"]) => labelFrom(GRADE_OPTIONS, grade);
/** "Thứ 2 – 4 – 6" từ "MON_WED_FRI" */
export const patternLabel = (pattern: (typeof SCHEDULE_PATTERN_OPTIONS)[number]["value"]) => labelFrom(SCHEDULE_PATTERN_OPTIONS, pattern);
/** "Tối (18:00 – 20:00)" từ "SLOT_EVENING" */
export const slotLabel = (slot: (typeof TIME_SLOT_OPTIONS)[number]["value"]) => {
  const option = TIME_SLOT_OPTIONS.find((item) => item.value === slot);
  return option ? `${option.label} · ${option.hint}` : slot;
};

/** "Tháng 10/2026" */
export const monthLabel = (year: number, month: number) => `Tháng ${month}/${year}`;

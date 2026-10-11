import { ASSETS } from "@/constants/assets";
import {
  CLASS_SIZE,
  ENROLLMENT_DEADLINE_DAYS,
  GRADE_OPTIONS,
  SCHEDULE_PATTERN_OPTIONS,
  SESSION_MINUTES,
  TIME_SLOT_OPTIONS,
} from "@/features/catalog/data/classOptions";
import { COURSES, type Course } from "@/features/catalog/data/courses";
import { addDays, diffDays, formatDayMonth, parseIsoDate } from "@/utils/date";

/*
 * Nội dung trang "Mua khóa học" (trước đây là "Bảng học phí") — chỉ nêu những gì backend đang có:
 *   - lịch học: enum SchedulePattern (2 – 3 buổi mỗi tuần) và TimeSlot (mỗi ca 120 phút);
 *   - lớp nhóm: class_groups.class_type = GROUP;
 *   - lịch mở đăng ký: hạn chốt (class_groups.enrollment_deadline) và ngày bắt đầu học (learning_schedules.start_date).
 * Backend chưa có bảng hay cột nào về học phí, thanh toán, hoàn tiền nên trang không nêu quy tắc hoàn phí.
 * Mức phí từng khóa đọc từ `tuitionFee` trong features/catalog/data/courses.ts (mức tạm do nhóm đặt),
 * khóa nào chưa có thì ghi "Báo khi tư vấn".
 */

/** Ảnh nền mờ ở phần mở đầu */
export const PRICING_HERO_BACKDROP = ASSETS.public.students.smiling;

/** Hai dòng tiêu đề ở phần mở đầu */
export const PRICING_TITLE_LINES = ["Mua Khóa Học", "Trí Việt Tutor"];

/* Số buổi mỗi tuần lấy từ các lịch học đang có ("3 buổi mỗi tuần" → 3) */
const WEEKLY_SESSIONS = SCHEDULE_PATTERN_OPTIONS.map((pattern) => parseInt(pattern.hint, 10));
const MIN_WEEKLY = Math.min(...WEEKLY_SESSIONS);
const MAX_WEEKLY = Math.max(...WEEKLY_SESSIONS);

/** Ví dụ "2 – 3 buổi mỗi tuần" */
export const WEEKLY_SESSIONS_LABEL = `${MIN_WEEKLY === MAX_WEEKLY ? MAX_WEEKLY : `${MIN_WEEKLY} – ${MAX_WEEKLY}`} buổi mỗi tuần`;
export const SESSION_LENGTH_LABEL = `${SESSION_MINUTES} phút mỗi buổi`;

/** Ba dòng trên thẻ giá ở phần mở đầu: một khóa gồm những gì */
export const PRICE_TAG_POINTS = [
  WEEKLY_SESSIONS_LABEL,
  SESSION_LENGTH_LABEL,
  `Lớp ${CLASS_SIZE.min} – ${CLASS_SIZE.max} học viên`,
];

export type EnrollmentStatus = "UPCOMING" | "OPEN" | "CLOSED" | "STARTED";

export interface EnrollmentWindow {
  course: Course;
  /** Ngày mở đăng ký */
  opens: Date;
  /** Hạn chốt đăng ký = khai giảng trừ ENROLLMENT_DEADLINE_DAYS ngày */
  deadline: Date;
  /** Ngày khai giảng */
  starts: Date;
}

/** Đợt mở đăng ký của các khóa đã có ngày, xếp theo ngày khai giảng */
export const ENROLLMENT_WINDOWS: EnrollmentWindow[] = COURSES.flatMap((course) => {
  if (!course.enrollment) return [];
  const starts = parseIsoDate(course.enrollment.startsOn);
  return [{ course, opens: parseIsoDate(course.enrollment.opensOn), deadline: addDays(starts, -ENROLLMENT_DEADLINE_DAYS), starts }];
}).sort((first, second) => first.starts.getTime() - second.starts.getTime());

/** Đợt mở đăng ký của một khóa (không có nếu khóa chưa đặt ngày) */
export function enrollmentWindowOf(course: Course): EnrollmentWindow | undefined {
  return ENROLLMENT_WINDOWS.find((window) => window.course.id === course.id);
}

/** Trạng thái của một đợt đăng ký so với hôm nay */
export function enrollmentStatus(window: EnrollmentWindow, today: Date): EnrollmentStatus {
  if (today < window.opens) return "UPCOMING";
  if (today <= window.deadline) return "OPEN";
  return today < window.starts ? "CLOSED" : "STARTED";
}

/** Câu ghi trên nhãn trạng thái, ví dụ "Đang mở · còn 21 ngày" */
export function enrollmentStatusLabel(window: EnrollmentWindow, today: Date): string {
  switch (enrollmentStatus(window, today)) {
    case "UPCOMING":
      return `Mở từ ${formatDayMonth(window.opens)}`;
    case "OPEN": {
      const daysLeft = diffDays(today, window.deadline);
      return daysLeft === 0 ? "Chốt hôm nay" : `Đang mở · còn ${daysLeft} ngày`;
    }
    case "CLOSED":
      return "Đã chốt đăng ký";
    default:
      return "Đã khai giảng";
  }
}

export interface LearningPhoto {
  src: string;
  alt: string;
  /** Tên biểu tượng Material Symbols trên nhãn */
  icon: string;
  label: string;
  /** Lớp Tailwind chọn phần ảnh giữ lại khi cắt theo khung vòm */
  focus: string;
}

/** Ba ảnh ở phần "Học tại trung tâm hoặc trực tuyến": hai hình thức học và khối lớp đang dạy */
export const LEARNING_PHOTOS: LearningPhoto[] = [
  {
    src: ASSETS.public.classrooms.classroom1,
    alt: "Thầy giáo hướng dẫn một nhóm học sinh trong phòng học",
    icon: "apartment",
    label: "Tại trung tâm",
    focus: "object-[38%_center]",
  },
  {
    src: ASSETS.public.students.highSchool,
    alt: "Nhóm học sinh THPT cùng làm bài bên máy tính",
    icon: "school",
    label: `Lớp ${GRADE_OPTIONS.map((grade) => grade.label.replace("Lớp ", "")).join(" · ")}`,
    focus: "object-[30%_center]",
  },
  {
    src: ASSETS.public.classrooms.classroom2,
    alt: "Học sinh đeo tai nghe học trực tuyến với cô giáo qua máy tính",
    icon: "videocam",
    label: "Trực tuyến",
    focus: "object-[46%_center]",
  },
];

/** Ba bước mua một khóa học, hiện ở đầu danh sách khóa */
export const PURCHASE_STEPS = ["Chọn khóa học", "Thanh toán qua VNPay", "Tạo tài khoản vào học"];

/** Lịch học của một khóa ở dạng chữ, ví dụ { days: "Thứ 2 – 4 – 6", time: "18:00 – 20:00" } */
export function courseSchedule(course: Course): { days: string; time: string } | undefined {
  if (!course.schedule) return undefined;
  const { pattern, timeSlot } = course.schedule;
  const days = SCHEDULE_PATTERN_OPTIONS.find((option) => option.value === pattern)?.label;
  const time = TIME_SLOT_OPTIONS.find((option) => option.value === timeSlot)?.hint;
  return days && time ? { days, time } : undefined;
}

import { ASSETS } from "@/constants/assets";
import {
  CLASS_SIZE,
  ENROLLMENT_DEADLINE_DAYS,
  GRADE_LIST_LABEL,
  SCHEDULE_PATTERN_OPTIONS,
  SESSION_MINUTES,
} from "@/constants/classOptions";
import { COURSES } from "@/constants/courses";
import type { EnrollmentFilter, EnrollmentWindow, ShopFilters, ShopSort, LearningPhoto } from "@/interfaces/pricing";
import { addDays, parseIsoDate } from "@/utils/date";

/** Ảnh nền mờ ở phần mở đầu */
export const PRICING_HERO_BACKDROP = ASSETS.public.students.smiling;

/** Hai dòng tiêu đề ở phần mở đầu */
export const PRICING_TITLE_LINES = ["Mua Khóa Học", "Trí Việt Tutor"];

/** Số buổi mỗi tuần lấy từ các lịch học đang có ("3 buổi mỗi tuần" → 3) */
const WEEKLY_SESSIONS = SCHEDULE_PATTERN_OPTIONS.map((pattern) => parseInt(pattern.hint, 10));

const MIN_WEEKLY = Math.min(...WEEKLY_SESSIONS);

const MAX_WEEKLY = Math.max(...WEEKLY_SESSIONS);

/** Ví dụ "2 – 3 buổi mỗi tuần" */
export const WEEKLY_SESSIONS_LABEL = `${MIN_WEEKLY === MAX_WEEKLY ? MAX_WEEKLY : `${MIN_WEEKLY} – ${MAX_WEEKLY}`} buổi mỗi tuần`;

/** Ví dụ "120 phút mỗi buổi" */
export const SESSION_LENGTH_LABEL = `${SESSION_MINUTES} phút mỗi buổi`;

/** Ba dòng trên thẻ giá ở phần mở đầu: một khóa gồm những gì */
export const PRICE_TAG_POINTS = [WEEKLY_SESSIONS_LABEL, SESSION_LENGTH_LABEL, `Lớp ${CLASS_SIZE.min} – ${CLASS_SIZE.max} học viên`];

/** Đợt mở đăng ký của các khóa đã có ngày, xếp theo ngày khai giảng */
export const ENROLLMENT_WINDOWS: EnrollmentWindow[] = COURSES.flatMap((course) => {
  if (!course.enrollment) return [];
  const starts = parseIsoDate(course.enrollment.startsOn);
  return [{ course, opens: parseIsoDate(course.enrollment.opensOn), deadline: addDays(starts, -ENROLLMENT_DEADLINE_DAYS), starts }];
}).sort((first, second) => first.starts.getTime() - second.starts.getTime());

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
    label: GRADE_LIST_LABEL,
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
export const PURCHASE_STEPS = ["Đăng nhập học viên", "Chọn lớp và lịch học", "Thanh toán qua VNPay"];

/** Các lựa chọn của bộ lọc đợt đăng ký */
export const ENROLLMENT_FILTER_OPTIONS: { value: EnrollmentFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "OPEN", label: "Đang mở" },
  { value: "UPCOMING", label: "Sắp mở" },
];

/** Các lựa chọn của ô sắp xếp */
export const SHOP_SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: "DEFAULT", label: "Mặc định" },
  { value: "FEE_ASC", label: "Học phí thấp đến cao" },
  { value: "FEE_DESC", label: "Học phí cao đến thấp" },
  { value: "START_ASC", label: "Khai giảng sớm nhất" },
];

/** Học phí của các khóa đã có mức phí */
const FEES = COURSES.flatMap((course) => (course.tuitionFee === undefined ? [] : [course.tuitionFee]));

/** Khoảng học phí của các khóa đang có, dùng cho thanh trượt "Học phí tối đa" */
export const FEE_RANGE = {
  min: FEES.length > 0 ? Math.min(...FEES) : 0,
  max: FEES.length > 0 ? Math.max(...FEES) : 0,
  step: 100_000,
};

/** Bộ lọc mặc định: không lọc gì */
export const DEFAULT_SHOP_FILTERS: ShopFilters = {
  query: "",
  subject: "",
  enrollment: "ALL",
  schedule: "",
  maxFee: FEE_RANGE.max,
};

/** Mỗi môn một lựa chọn trong ô lọc "Môn học", theo thứ tự xuất hiện trong danh sách khóa */
export const SHOP_SUBJECTS: { subject: string; label: string }[] = COURSES.reduce<{ subject: string; label: string }[]>(
  (subjects, course) =>
    subjects.some((item) => item.subject === course.subject)
      ? subjects
      : [...subjects, { subject: course.subject, label: course.subjectLabel }],
  [],
);

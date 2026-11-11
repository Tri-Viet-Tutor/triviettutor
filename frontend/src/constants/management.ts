import { COURSES } from "@/constants/courses";
import { GRADE_OPTIONS, SCHEDULE_PATTERN_OPTIONS, TIME_SLOT_OPTIONS } from "@/constants/classOptions";

/* Chữ hiển thị cho các trang quản lý khóa học, lớp học và bảng lương. */

/**
 * Môn có trong dữ liệu khóa học nhưng chưa có trang giới thiệu ở COURSES (mã môn backend → tên, biểu tượng).
 * Thiếu ở đây thì trang quản trị hiện mã thô ("PHYSICS") và không lọc / chọn được môn đó.
 */
const EXTRA_SUBJECTS: { value: string; label: string; icon: string }[] = [
  { value: "PHYSICS", label: "Vật lý", icon: "bolt" },
  { value: "BIOLOGY", label: "Sinh học", icon: "biotech" },
  { value: "HISTORY", label: "Lịch sử", icon: "account_balance" },
  { value: "GEOGRAPHY", label: "Địa lý", icon: "public" },
];

/** Các môn trung tâm đang dạy: mã môn của backend + tên tiếng Việt + biểu tượng */
export const SUBJECT_OPTIONS: { value: string; label: string; icon: string }[] = [
  ...COURSES.map((course) => ({ value: course.subject, label: course.subjectLabel, icon: course.icon })),
  ...EXTRA_SUBJECTS.filter((extra) => !COURSES.some((course) => course.subject === extra.value)),
];

/** Thời lượng mặc định mỗi buổi khi tạo khóa (phút) */
export const DEFAULT_DURATION_MINUTES = 120;

/**
 * Giới hạn thời lượng mỗi buổi khi tạo khóa học (phút), khớp @Min/@Max của CourseRequest bên backend.
 * Buổi học bắt đầu đúng giờ của ca và kết thúc sau đúng số phút này.
 */
export const DURATION_MIN = 30;
export const DURATION_MAX = 120;
export const DURATION_STEP = 5;

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
  return option ? `${option.label} - ${option.hint}` : slot;
};

/** "Tháng 10/2026" */
export const monthLabel = (year: number, month: number) => `Tháng ${month}/${year}`;

/**
 * Bậc học phí mỗi học viên theo sĩ số lúc đăng ký (BR-02.11), tính từ học phí gốc 1 kèm 1.
 * Khớp PricingService ở backend (làm tròn đến đồng).
 */
export const COURSE_PRICE_TIERS = [
  { size: "1 kèm 1", rate: 1 },
  { size: "2 – 3 người", rate: 0.8 },
  { size: "4 – 5 người", rate: 0.65 },
  { size: "6 – 8 người", rate: 0.6 },
] as const;

/** Ảnh bìa nhỏ của khóa: nền pastel + màu chữ đậm cùng họ, mỗi môn một tông */
const SUBJECT_COVERS: Record<string, { bg: string; fg: string }> = {
  MATH: { bg: "#E3ECFF", fg: "#1E40AF" },
  ENGLISH: { bg: "#E2F4EE", fg: "#0F6B4F" },
  LITERATURE: { bg: "#F6E9E4", fg: "#8A3B20" },
  CHEMISTRY: { bg: "#EFE7FA", fg: "#5B2FA0" },
  INFORMATICS: { bg: "#E4F2F7", fg: "#0B5C78" },
  PHYSICS: { bg: "#FBF0DC", fg: "#8A5A00" },
};

/** Màu ảnh bìa của môn; môn chưa có tông riêng thì dùng xanh dương */
export const subjectCover = (subject: string) => SUBJECT_COVERS[subject] ?? { bg: "#E8EDF6", fg: "#1E40AF" };

/**
 * Lựa chọn môn theo danh sách mã môn backend trả về (GET /catalog/subjects).
 * Mã đã biết thì có tên tiếng Việt và biểu tượng; mã mới thì hiện nguyên mã để admin vẫn lọc / chọn được.
 * Chưa tải được danh sách thì dùng các môn đã biết.
 */
export function subjectOptionsFrom(codes: string[] | undefined): { value: string; label: string; icon: string }[] {
  if (!codes || codes.length === 0) return SUBJECT_OPTIONS;
  const known = SUBJECT_OPTIONS.filter((option) => codes.includes(option.value));
  const unknown = codes
    .filter((code) => !SUBJECT_OPTIONS.some((option) => option.value === code))
    .map((code) => ({ value: code, label: code, icon: "menu_book" }));
  return [...known, ...unknown];
}

/**
 * Học phí 1 kèm 1 cho MỘT buổi của khóa (số buổi đặt ở từng lớp).
 * Ưu tiên CourseResponse.pricePerSession; backend cũ thì chia giá khóa cho số buổi.
 */
export function coursePricePerSession(course: { basePrice1on1: number; totalSessions?: number | null; pricePerSession?: number | null }): number {
  if (course.pricePerSession != null) return course.pricePerSession;
  return Math.round(course.basePrice1on1 / Math.max(course.totalSessions ?? 1, 1));
}

/** Bậc học phí MỖI BUỔI cho mỗi học viên theo sĩ số (BR-02.11): 1 kèm 1, 2–3, 4–5, 6–8 người */
export function coursePriceTiers(course: { basePrice1on1: number; totalSessions?: number | null; pricePerSession?: number | null }) {
  const perSession = coursePricePerSession(course);
  return COURSE_PRICE_TIERS.map((tier) => ({
    size: tier.size,
    rate: tier.rate,
    discountRate: Math.round((1 - tier.rate) * 100) / 100,
    price: Math.round(perSession * tier.rate),
  }));
}

/** Học phí tối thiểu backend chấp nhận cho một khóa (CourseRequest: @DecimalMin 100000) */
export const MIN_COURSE_PRICE = 100_000;

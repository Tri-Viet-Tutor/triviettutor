import { COURSES, type Course } from "@/features/catalog/data/courses";
import { enrollmentStatus, enrollmentWindowOf } from "@/features/pricing/data/pricing";
import type { SchedulePattern } from "@/types/api";
import { normalizeText } from "@/utils/text";

/* Tìm, lọc và sắp xếp danh sách khóa học trên trang "Mua khóa học".
 * Viết cho danh sách dài: thêm khóa vào features/catalog/data/courses.ts là danh sách môn,
 * khoảng học phí và số kết quả tự cập nhật. */

/** Lọc theo đợt đăng ký */
export type EnrollmentFilter = "ALL" | "OPEN" | "UPCOMING";

export const ENROLLMENT_FILTER_OPTIONS: { value: EnrollmentFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "OPEN", label: "Đang mở" },
  { value: "UPCOMING", label: "Sắp mở" },
];

export type ShopSort = "DEFAULT" | "FEE_ASC" | "FEE_DESC" | "START_ASC";

export const SHOP_SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: "DEFAULT", label: "Mặc định" },
  { value: "FEE_ASC", label: "Học phí thấp đến cao" },
  { value: "FEE_DESC", label: "Học phí cao đến thấp" },
  { value: "START_ASC", label: "Khai giảng sớm nhất" },
];

export interface ShopFilters {
  /** Chữ gõ ở ô tìm: so không dấu với tên khóa, tên môn, tên gia sư và lộ trình */
  query: string;
  /** Mã môn, rỗng = mọi môn */
  subject: string;
  enrollment: EnrollmentFilter;
  /** Các thứ học trong tuần, rỗng = ngày nào cũng được */
  schedule: SchedulePattern | "";
  /** Học phí tối đa (VND) */
  maxFee: number;
}

const FEES = COURSES.flatMap((course) => (course.tuitionFee === undefined ? [] : [course.tuitionFee]));

/** Khoảng học phí của các khóa đang có, dùng cho thanh trượt "Học phí tối đa" */
export const FEE_RANGE = {
  min: FEES.length > 0 ? Math.min(...FEES) : 0,
  max: FEES.length > 0 ? Math.max(...FEES) : 0,
  step: 100_000,
};

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

function matchesQuery(course: Course, query: string): boolean {
  const keyword = normalizeText(query);
  if (!keyword) return true;
  const haystack = [course.name, course.subjectLabel, course.summary, ...course.tutors.map((tutor) => tutor.name), ...course.steps];
  return normalizeText(haystack.join(" ")).includes(keyword);
}

function matchesEnrollment(course: Course, filter: EnrollmentFilter, today: Date): boolean {
  if (filter === "ALL") return true;
  const window = enrollmentWindowOf(course);
  return window !== undefined && enrollmentStatus(window, today) === filter;
}

function matchesFee(course: Course, maxFee: number): boolean {
  // Khóa chưa có học phí chỉ hiện khi chưa giới hạn học phí
  if (course.tuitionFee === undefined) return maxFee >= FEE_RANGE.max;
  return course.tuitionFee <= maxFee;
}

/** Các khóa khớp ô tìm và bộ lọc */
export function filterCourses(filters: ShopFilters, today: Date): Course[] {
  return COURSES.filter(
    (course) =>
      (!filters.subject || course.subject === filters.subject) &&
      matchesQuery(course, filters.query) &&
      matchesEnrollment(course, filters.enrollment, today) &&
      (!filters.schedule || course.schedule?.pattern === filters.schedule) &&
      matchesFee(course, filters.maxFee),
  );
}

export function sortCourses(courses: Course[], sort: ShopSort): Course[] {
  if (sort === "DEFAULT") return courses;
  const missingLast = Number.POSITIVE_INFINITY;
  const key = (course: Course): number => {
    if (sort === "START_ASC") return enrollmentWindowOf(course)?.starts.getTime() ?? missingLast;
    const fee = course.tuitionFee ?? (sort === "FEE_ASC" ? missingLast : -1);
    return sort === "FEE_ASC" ? fee : -fee;
  };
  return [...courses].sort((first, second) => key(first) - key(second));
}

/** Có đang lọc gì không (để hiện nút "Xóa bộ lọc") */
export function hasActiveFilters(filters: ShopFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.subject !== "" ||
    filters.enrollment !== "ALL" ||
    filters.schedule !== "" ||
    filters.maxFee < FEE_RANGE.max
  );
}

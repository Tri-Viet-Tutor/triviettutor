import { SCHEDULE_PATTERN_OPTIONS, TIME_SLOT_OPTIONS } from "@/constants/classOptions";
import { COURSES } from "@/constants/courses";
import { ENROLLMENT_WINDOWS, FEE_RANGE } from "@/constants/pricing";
import type { Course } from "@/interfaces/course";
import type { EnrollmentFilter, EnrollmentStatus, EnrollmentWindow, ShopFilters, ShopSort } from "@/interfaces/pricing";
import { diffDays, formatDayMonth } from "@/utils/date";
import { normalizeText } from "@/utils/text";

/* Hàm tính trạng thái đợt đăng ký, lịch học và lọc / sắp xếp khóa học. */

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

/** Lịch học của một khóa ở dạng chữ, ví dụ { days: "Thứ 2 – 4 – 6", time: "18:00 – 20:00" } */
export function courseSchedule(course: Course): { days: string; time: string } | undefined {
  if (!course.schedule) return undefined;
  const { pattern, timeSlot } = course.schedule;
  const days = SCHEDULE_PATTERN_OPTIONS.find((option) => option.value === pattern)?.label;
  const time = TIME_SLOT_OPTIONS.find((option) => option.value === timeSlot)?.hint;
  return days && time ? { days, time } : undefined;
}

/** Khớp ô tìm: so không dấu với tên khóa, tên môn, mô tả, tên gia sư và lộ trình */
function matchesQuery(course: Course, query: string): boolean {
  const keyword = normalizeText(query);
  if (!keyword) return true;
  const haystack = [course.name, course.subjectLabel, course.summary, ...course.tutors.map((tutor) => tutor.name), ...course.steps];
  return normalizeText(haystack.join(" ")).includes(keyword);
}

/** Khớp bộ lọc đợt đăng ký */
function matchesEnrollment(course: Course, filter: EnrollmentFilter, today: Date): boolean {
  if (filter === "ALL") return true;
  const window = enrollmentWindowOf(course);
  return window !== undefined && enrollmentStatus(window, today) === filter;
}

/** Khớp học phí tối đa */
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

/** Sắp xếp kết quả; khóa thiếu học phí / ngày khai giảng luôn xếp cuối */
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

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminClassesQuery, AdminCoursesQuery, EnrollmentsQuery, TutorPayrollQuery } from "@/interfaces/api";
import {
  fetchAdminClasses,
  fetchAdminCourses,
  fetchCourseSummary,
  fetchClassSummary,
  fetchSubjects,
  fetchClassEnrollments,
  fetchMyEnrollments,
  fetchMyPayroll,
  fetchMyPayrollEstimate,
  fetchPayroll,
} from "@/services/managementService";
import { useUserId } from "@/hooks/usePortalData";

/** Khóa cache: phần quản trị nằm dưới "admin" để useRefreshAdmin làm mới được cả nhóm */
export const managementKeys = {
  courses: (query: AdminCoursesQuery) => ["admin", "courses", query] as const,
  courseSummary: ["admin", "course-summary"] as const,
  classSummary: ["admin", "class-summary"] as const,
  subjects: ["catalog", "subjects"] as const,
  classes: (query: AdminClassesQuery) => ["admin", "classes", query] as const,
  classEnrollments: (classId: number) => ["admin", "class-enrollments", classId] as const,
  payroll: (year: number, month: number) => ["admin", "payroll", year, month] as const,
  myPayroll: (userId: number | undefined, query: TutorPayrollQuery) => ["me", userId, "payroll", query] as const,
  myPayrollEstimate: (userId: number | undefined) => ["me", userId, "payroll", "estimate"] as const,
  myEnrollments: (userId: number | undefined, query: EnrollmentsQuery) => ["me", userId, "enrollments", query] as const,
};

/** Danh sách khóa học (giữ trang cũ trong lúc tải trang mới) */
export function useAdminCourses(query: AdminCoursesQuery) {
  return useQuery({
    queryKey: managementKeys.courses(query),
    queryFn: () => fetchAdminCourses(query),
    placeholderData: (previous) => previous,
  });
}

/** Số khóa tổng / đang bán / ngừng bán */
export function useCourseSummary() {
  return useQuery({ queryKey: managementKeys.courseSummary, queryFn: fetchCourseSummary });
}

/** Số lớp theo từng trạng thái */
export function useClassSummary() {
  return useQuery({ queryKey: managementKeys.classSummary, queryFn: fetchClassSummary });
}

/** Môn học có trong hệ thống (ít thay đổi nên giữ cache 10 phút) */
export function useSubjects() {
  return useQuery({ queryKey: managementKeys.subjects, queryFn: fetchSubjects, staleTime: 10 * 60 * 1000 });
}

/** Danh sách lớp học; `enabled = false` để tạm chưa tải */
export function useAdminClasses(query: AdminClassesQuery, enabled = true) {
  return useQuery({
    queryKey: managementKeys.classes(query),
    queryFn: () => fetchAdminClasses(query),
    placeholderData: (previous) => previous,
    enabled,
  });
}

/** Học viên đã ghi danh của một lớp; `null` thì không tải */
export function useClassEnrollments(classId: number | null) {
  return useQuery({
    queryKey: managementKeys.classEnrollments(classId ?? 0),
    queryFn: () => fetchClassEnrollments(classId as number, { size: 100 }),
    enabled: classId !== null,
  });
}

/** Bảng lương một tháng */
export function usePayroll(year: number, month: number) {
  return useQuery({ queryKey: managementKeys.payroll(year, month), queryFn: () => fetchPayroll(year, month) });
}

/** Lương của tôi (gia sư) theo từng tháng */
export function useMyPayroll(query: TutorPayrollQuery = { size: 24 }) {
  const userId = useUserId();
  return useQuery({ queryKey: managementKeys.myPayroll(userId, query), queryFn: () => fetchMyPayroll(query) });
}

/** Tạm tính lương các tháng trung tâm chưa chốt (gia sư) */
export function useMyPayrollEstimate() {
  const userId = useUserId();
  return useQuery({ queryKey: managementKeys.myPayrollEstimate(userId), queryFn: fetchMyPayrollEstimate });
}

/** Các lớp tôi đã ghi danh (học viên) */
export function useMyEnrollments(query: EnrollmentsQuery = { size: 100 }) {
  const userId = useUserId();
  return useQuery({ queryKey: managementKeys.myEnrollments(userId, query), queryFn: () => fetchMyEnrollments(query) });
}

/** Làm mới dữ liệu "của tôi" sau một thao tác */
export function useRefreshMine() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me", userId] }),
      queryClient.invalidateQueries({ queryKey: ["wallet", userId] }),
      queryClient.invalidateQueries({ queryKey: ["wallet-history", userId] }),
    ]);
}

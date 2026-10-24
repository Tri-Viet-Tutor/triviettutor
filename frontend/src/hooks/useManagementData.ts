import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminClassesQuery, AdminCoursesQuery, EnrollmentsQuery, TutorPayrollQuery } from "@/interfaces/api";
import {
  fetchAdminClasses,
  fetchAdminCourses,
  fetchClassEnrollments,
  fetchMyEnrollments,
  fetchMyPayroll,
  fetchPayroll,
} from "@/services/managementService";
import { useUserId } from "@/hooks/usePortalData";

/** Khóa cache: phần quản trị nằm dưới "admin" để useRefreshAdmin làm mới được cả nhóm */
export const managementKeys = {
  courses: (query: AdminCoursesQuery) => ["admin", "courses", query] as const,
  classes: (query: AdminClassesQuery) => ["admin", "classes", query] as const,
  classEnrollments: (classId: number) => ["admin", "class-enrollments", classId] as const,
  payroll: (year: number, month: number) => ["admin", "payroll", year, month] as const,
  myPayroll: (userId: number | undefined, query: TutorPayrollQuery) => ["me", userId, "payroll", query] as const,
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

/** Danh sách lớp học */
export function useAdminClasses(query: AdminClassesQuery) {
  return useQuery({
    queryKey: managementKeys.classes(query),
    queryFn: () => fetchAdminClasses(query),
    placeholderData: (previous) => previous,
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

/** Các lớp tôi đã ghi danh (học viên) */
export function useMyEnrollments(query: EnrollmentsQuery = { size: 100 }) {
  const userId = useUserId();
  return useQuery({ queryKey: managementKeys.myEnrollments(userId, query), queryFn: () => fetchMyEnrollments(query) });
}

/** Làm mới dữ liệu "của tôi" sau một thao tác */
export function useRefreshMine() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return () => queryClient.invalidateQueries({ queryKey: ["me", userId] });
}

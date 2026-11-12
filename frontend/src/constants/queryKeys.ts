/**
 * Centralized Query Keys Factory cho toàn bộ ứng dụng TanStack Query.
 * Cấu trúc phân cấp hình cây giúp auto-invalidation theo prefix chính xác.
 */

import type {
  AdminClassesQuery,
  AdminCoursesQuery,
  AdminLeaveRequestsQuery,
  AdminSessionsQuery,
  AdminUsersQuery,
  EnrollmentsQuery,
  MyLeaveRequestsQuery,
  TutorPayrollQuery,
} from "@/interfaces/dto";

export const queryKeys = {
  // Dữ liệu cá nhân (ROLE_STUDENT, ROLE_TUTOR, ROLE_ADMIN)
  me: {
    all: (userId?: number) => ["me", userId] as const,
    profile: (userId?: number) => ["me", userId, "me"] as const,
    sessions: (userId?: number) => ["me", userId, "sessions"] as const,
    attendance: (userId: number | undefined, sessionId: number) => ["me", userId, "attendance", sessionId] as const,
    leaveRequests: (userId: number | undefined, query?: MyLeaveRequestsQuery) =>
      query ? (["me", userId, "leave-requests", query] as const) : (["me", userId, "leave-requests"] as const),
    enrollments: (userId: number | undefined, query?: EnrollmentsQuery) =>
      query ? (["me", userId, "enrollments", query] as const) : (["me", userId, "enrollments"] as const),
    payroll: (userId: number | undefined, query?: TutorPayrollQuery) =>
      query ? (["me", userId, "payroll", query] as const) : (["me", userId, "payroll"] as const),
    wallet: (userId?: number) => ["wallet", userId] as const,
    walletHistory: (userId?: number) => ["wallet-history", userId] as const,
  },

  // Khu vực quản trị (ROLE_ADMIN)
  admin: {
    all: ["admin"] as const,
    users: (query: AdminUsersQuery) => ["admin", "users", query] as const,
    sessions: (query: AdminSessionsQuery) => ["admin", "sessions", query] as const,
    session: (sessionId: number) => ["admin", "session", sessionId] as const,
    leaveRequests: (query: AdminLeaveRequestsQuery) => ["admin", "leave-requests", query] as const,
    availableTutors: (classId: number) => ["admin", "available-tutors", classId] as const,
    substituteTutors: (sessionId: number) => ["admin", "substitute-tutors", sessionId] as const,
    tutorBoard: (from: string, to: string) => ["admin", "tutor-board", from, to] as const,
    courses: (query: AdminCoursesQuery) => ["admin", "courses", query] as const,
    classes: (query: AdminClassesQuery) => ["admin", "classes", query] as const,
    classEnrollments: (classId: number) => ["admin", "class-enrollments", classId] as const,
    payroll: (year: number, month: number) => ["admin", "payroll", year, month] as const,
    allPayroll: ["admin", "payroll"] as const,
  },

  // Khóa học & Lớp học công khai
  catalog: {
    classes: ["tuition-classes"] as const,
    intent: ["tuition-intent"] as const,
    subjects: ["catalog", "subjects"] as const,
    courseSummary: ["admin", "course-summary"] as const,
    classSummary: ["admin", "class-summary"] as const,
    classDetail: (id: number) => ["catalog-class", id] as const,
  },
} as const;

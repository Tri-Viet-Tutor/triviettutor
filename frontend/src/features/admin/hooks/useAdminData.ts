import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminLeaveRequests,
  fetchAdminSessions,
  fetchAdminUsers,
  fetchSession,
} from "@/features/admin/api/adminApi";
import { ROLE_NAME } from "@/features/portal/data/labels";
import type { AdminLeaveRequestsQuery, AdminSessionsQuery, AdminUsersQuery, Role } from "@/types/api";

/* Mọi dữ liệu của khu quản trị nằm dưới khóa "admin" — sau một thao tác chỉ cần làm mới cả nhóm này */
export const adminKeys = {
  all: ["admin"] as const,
  users: (query: AdminUsersQuery) => ["admin", "users", query] as const,
  sessions: (query: AdminSessionsQuery) => ["admin", "sessions", query] as const,
  session: (sessionId: number) => ["admin", "session", sessionId] as const,
  leaveRequests: (query: AdminLeaveRequestsQuery) => ["admin", "leave-requests", query] as const,
  availableTutors: (classId: number) => ["admin", "available-tutors", classId] as const,
};

export function useAdminUsers(query: AdminUsersQuery) {
  return useQuery({ queryKey: adminKeys.users(query), queryFn: () => fetchAdminUsers(query), placeholderData: (previous) => previous });
}

export function useAdminSessions(query: AdminSessionsQuery, enabled = true) {
  return useQuery({
    queryKey: adminKeys.sessions(query),
    queryFn: () => fetchAdminSessions(query),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useAdminSession(sessionId: number | null) {
  return useQuery({
    queryKey: adminKeys.session(sessionId ?? 0),
    queryFn: () => fetchSession(sessionId as number),
    enabled: sessionId !== null,
  });
}

export function useAdminLeaveRequests(query: AdminLeaveRequestsQuery) {
  return useQuery({
    queryKey: adminKeys.leaveRequests(query),
    queryFn: () => fetchAdminLeaveRequests(query),
    placeholderData: (previous) => previous,
  });
}

/** Số người tối đa lấy về để tra tên theo mã (backend giới hạn 100 mỗi trang) */
const DIRECTORY_SIZE = 100;

/**
 * Tra họ tên theo mã người dùng. Backend chỉ trả mã gia sư / học viên trong buổi học và đơn xin nghỉ,
 * nên lấy 100 gia sư và 100 học viên đầu tiên để ghép tên; ai không có trong đó thì chỉ hiện mã.
 */
export function useUserDirectory() {
  const tutors = useAdminUsers({ role: "ROLE_TUTOR", page: 0, size: DIRECTORY_SIZE });
  const students = useAdminUsers({ role: "ROLE_STUDENT", page: 0, size: DIRECTORY_SIZE });
  const names = new Map<number, string>();
  for (const user of [...(tutors.data?.content ?? []), ...(students.data?.content ?? [])]) names.set(user.id, user.fullName);

  /** "Gia sư Hồ Đức Thuận (#3)" hoặc "Gia sư #3" khi chưa biết tên */
  function label(role: Role, userId: number): string {
    const name = names.get(userId);
    return name ? `${ROLE_NAME[role]} ${name} (#${userId})` : `${ROLE_NAME[role]} #${userId}`;
  }

  return { tutors: tutors.data?.content ?? [], nameOf: (userId: number) => names.get(userId), label };
}

/** Số người dùng theo vai trò (lấy `totalElements` của GET /admin/users); undefined khi chưa tải xong */
export function useUserCounts(): Record<Role, number | undefined> {
  const tutors = useAdminUsers({ role: "ROLE_TUTOR", page: 0, size: DIRECTORY_SIZE });
  const students = useAdminUsers({ role: "ROLE_STUDENT", page: 0, size: DIRECTORY_SIZE });
  const admins = useAdminUsers({ role: "ROLE_ADMIN", page: 0, size: 1 });
  return { ROLE_TUTOR: tutors.data?.totalElements, ROLE_STUDENT: students.data?.totalElements, ROLE_ADMIN: admins.data?.totalElements };
}

/** Làm mới mọi dữ liệu của khu quản trị sau một thao tác thay đổi */
export function useRefreshAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.all });
}

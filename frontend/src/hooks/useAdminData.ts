import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ROLE_NAME } from "@/constants/labels";
import type { AdminLeaveRequestsQuery, AdminSessionsQuery, AdminUsersQuery, Role } from "@/interfaces/dto";
import { useAdminClasses } from "@/hooks/useManagementData";
import { fetchAdminLeaveRequests, fetchAdminSessions, fetchAdminUsers, fetchSession } from "@/services/adminService";
import { displayCode } from "@/utils/classes";
import type { TutorScheduleAvailabilityRequest } from "@/interfaces/dto";

import { fetchAvailableTutorsForSchedule } from "@/services/adminService";

// Khóa cache của khu quản trị — tất cả nằm dưới "admin" nên sau một thao tác chỉ cần làm mới cả nhóm này
export const adminKeys = {
  all: ["admin"] as const,
  users: (query: AdminUsersQuery) => ["admin", "users", query] as const,
  sessions: (query: AdminSessionsQuery) => ["admin", "sessions", query] as const,
  session: (sessionId: number) => ["admin", "session", sessionId] as const,
  leaveRequests: (query: AdminLeaveRequestsQuery) => ["admin", "leave-requests", query] as const,
  availableTutors: (classId: number) => ["admin", "available-tutors", classId] as const,
  substituteTutors: (sessionId: number) => ["admin", "substitute-tutors", sessionId] as const,
  tutorBoard: (from: string, to: string) => ["admin", "tutor-board", from, to] as const,
    availableTutorsForSchedule: (
        schedule: TutorScheduleAvailabilityRequest
    ) => ["admin", "available-tutors-schedule", schedule] as const,
};

// Danh sách người dùng (có phân trang); giữ dữ liệu cũ trong lúc tải trang mới để danh sách không nhảy
export function useAdminUsers(query: AdminUsersQuery) {
  return useQuery({ queryKey: adminKeys.users(query), queryFn: () => fetchAdminUsers(query), placeholderData: (previous) => previous });
}

// Danh sách buổi học theo bộ lọc; `enabled = false` để tạm chưa tải
export function useAdminSessions(query: AdminSessionsQuery, enabled = true) {
  return useQuery({
    queryKey: adminKeys.sessions(query),
    queryFn: () => fetchAdminSessions(query),
    placeholderData: (previous) => previous,
    enabled,
  });
}

// Một buổi học theo mã; `null` thì không tải
export function useAdminSession(sessionId: number | null) {
  return useQuery({
    queryKey: adminKeys.session(sessionId ?? 0),
    queryFn: () => fetchSession(sessionId as number),
    enabled: sessionId !== null,
  });
}

// Có nên mời xếp buổi bù cho buổi gốc đã hủy không: lớp chưa đóng (hoàn thành / hủy / không mở được)
// và buổi gốc chưa có buổi học bù "sống" (chưa bị hủy). Trả `undefined` khi đang tải hoặc không bật.
// Giới hạn: chỉ đọc 100 buổi đầu của lớp và 100 lớp đầu của mỗi trạng thái đóng (API chưa lọc theo mã).
export function useCanOfferMakeup(originalSessionId: number, classGroupId: number, enabled: boolean): boolean | undefined {
  const sessions = useAdminSessions({ classGroupId, page: 0, size: 100 }, enabled);
  const completed = useAdminClasses({ status: "COMPLETED", page: 0, size: 100 }, enabled);
  const cancelled = useAdminClasses({ status: "CANCELLED", page: 0, size: 100 }, enabled);
  const failed = useAdminClasses({ status: "FAILED_TO_OPEN", page: 0, size: 100 }, enabled);
  if (!enabled || !sessions.data || !completed.data || !cancelled.data || !failed.data) return undefined;
  const classClosed = [completed.data, cancelled.data, failed.data].some((page) => page.content.some((item) => item.id === classGroupId));
  const liveMakeup = sessions.data.content.some((item) => item.originalSessionId === originalSessionId && item.status !== "CANCELLED");
  return !classClosed && !liveMakeup;
}

// Danh sách đơn xin nghỉ theo bộ lọc
export function useAdminLeaveRequests(query: AdminLeaveRequestsQuery) {
  return useQuery({
    queryKey: adminKeys.leaveRequests(query),
    queryFn: () => fetchAdminLeaveRequests(query),
    placeholderData: (previous) => previous,
  });
}

// Số người tối đa lấy về để tra tên theo mã (backend giới hạn 100 mỗi trang)
const DIRECTORY_SIZE = 100;

// Tra họ tên theo mã người dùng. Backend chỉ trả mã gia sư / học viên trong buổi học và đơn xin nghỉ,
// nên lấy 100 gia sư và 100 học viên đầu tiên để ghép tên; ai không có trong đó thì chỉ hiện mã.
export function useUserDirectory() {
  const tutors = useAdminUsers({ role: "ROLE_TUTOR", page: 0, size: DIRECTORY_SIZE });
  const students = useAdminUsers({ role: "ROLE_STUDENT", page: 0, size: DIRECTORY_SIZE });
  // Bảng tra mã → họ tên, gộp cả gia sư và học viên
  const names = new Map<number, string>();
  for (const user of [...(tutors.data?.content ?? []), ...(students.data?.content ?? [])]) names.set(user.id, user.fullName);

  // "Gia sư Hồ Đức Thuận" hoặc "Gia sư GV003" khi chưa biết tên
  function label(role: Role, userId: number): string {
    const name = names.get(userId);
    return name ? `${ROLE_NAME[role]} ${name}` : `${ROLE_NAME[role]} ${displayCode(role === "ROLE_TUTOR" ? "tutor" : role === "ROLE_STUDENT" ? "student" : "user", userId)}`;
  }

  return { tutors: tutors.data?.content ?? [], nameOf: (userId: number) => names.get(userId), label };
}

// Số người dùng theo vai trò (lấy `totalElements` của GET /admin/users); undefined khi chưa tải xong
export function useUserCounts(): Record<Role, number | undefined> {
  const tutors = useAdminUsers({ role: "ROLE_TUTOR", page: 0, size: DIRECTORY_SIZE });
  const students = useAdminUsers({ role: "ROLE_STUDENT", page: 0, size: DIRECTORY_SIZE });
  const admins = useAdminUsers({ role: "ROLE_ADMIN", page: 0, size: 1 });
  return { ROLE_TUTOR: tutors.data?.totalElements, ROLE_STUDENT: students.data?.totalElements, ROLE_ADMIN: admins.data?.totalElements };
}

// Làm mới mọi dữ liệu của khu quản trị sau một thao tác thay đổi
export function useRefreshAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.all });
}

export function useAvailableTutorsForSchedule(
    schedule: TutorScheduleAvailabilityRequest,
    enabled = true
) {
    return useQuery({
        queryKey: adminKeys.availableTutorsForSchedule(schedule),
        queryFn: () => fetchAvailableTutorsForSchedule(schedule),
        enabled,
        staleTime: 0,
    });
}

import { useQueries, useQuery } from "@tanstack/react-query";
import {
  fetchMe,
  fetchMyLeaveRequests,
  fetchMySessions,
  fetchSessionAttendance,
} from "@/features/portal/api/portalApi";
import { useAuthStore } from "@/stores/authStore";
import type { AttendanceRecordResponse, MyLeaveRequestsQuery, SessionResponse } from "@/types/api";

/* Khóa cache của dữ liệu "của tôi", gắn với mã người dùng để đổi tài khoản không thấy dữ liệu của người trước */
export const portalKeys = {
  all: (userId: number | undefined) => ["me", userId] as const,
  me: (userId: number | undefined) => ["me", userId, "me"] as const,
  sessions: (userId: number | undefined) => ["me", userId, "sessions"] as const,
  attendance: (userId: number | undefined, sessionId: number) => ["me", userId, "attendance", sessionId] as const,
  leaveRequests: (userId: number | undefined, query?: MyLeaveRequestsQuery) =>
    query ? (["me", userId, "leave-requests", query] as const) : (["me", userId, "leave-requests"] as const),
};

export function useUserId(): number | undefined {
  return useAuthStore((state) => state.user?.id);
}

/** Hồ sơ của tôi */
export function useMe() {
  const userId = useUserId();
  return useQuery({ queryKey: portalKeys.me(userId), queryFn: fetchMe });
}

/** Mọi buổi học của tôi — buổi học (học viên) hoặc buổi dạy (gia sư); các trang tự lọc sắp tới / đã qua */
export function useMySessions() {
  const userId = useUserId();
  return useQuery({ queryKey: portalKeys.sessions(userId), queryFn: () => fetchMySessions() });
}

/** Điểm danh của tôi ở một buổi; chỉ tải khi `enabled` */
export function useSessionAttendance(sessionId: number, enabled = true) {
  const userId = useUserId();
  return useQuery({
    queryKey: portalKeys.attendance(userId, sessionId),
    queryFn: () => fetchSessionAttendance(sessionId),
    enabled,
  });
}

/** Các đơn xin nghỉ của tôi */
export function useMyLeaveRequests(query: MyLeaveRequestsQuery = {}) {
  const userId = useUserId();
  return useQuery({
    queryKey: portalKeys.leaveRequests(userId, query),
    queryFn: () => fetchMyLeaveRequests(query),
  });
}

export interface RecentAttendanceItem {
  session: SessionResponse;
  /** Bản ghi điểm danh của tôi; undefined khi chưa điểm danh hoặc chưa tải xong */
  record?: AttendanceRecordResponse;
  isPending: boolean;
}

/**
 * Điểm danh của tôi ở `limit` buổi đã học gần nhất (mỗi buổi một lời gọi API, React Query gộp các lời gọi trùng).
 * @param pastSessions các buổi đã qua, mới nhất trước
 */
export function useRecentAttendance(pastSessions: SessionResponse[], limit: number): RecentAttendanceItem[] {
  const userId = useUserId();
  const recent = pastSessions.filter((session) => session.status === "COMPLETED").slice(0, limit);
  const results = useQueries({
    queries: recent.map((session) => ({
      queryKey: portalKeys.attendance(userId, session.sessionId),
      queryFn: () => fetchSessionAttendance(session.sessionId),
    })),
  });
  return recent.map((session, index) => ({
    session,
    record: results[index].data?.records[0],
    isPending: results[index].isPending,
  }));
}

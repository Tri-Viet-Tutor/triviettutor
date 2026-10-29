import { useQuery } from "@tanstack/react-query";
import { useUserId } from "@/hooks/usePortalData";
import type { StudentHomeworksQuery } from "@/interfaces/homework";
import {
  fetchHomework,
  fetchMySubmission,
  fetchNotifications,
  fetchStudentHomeworks,
  fetchSubmissions,
  fetchTutorHomeworks,
  fetchUnreadCount,
} from "@/services/homeworkService";

/** Khóa cache của bài tập và thông báo, gắn với mã người dùng như portalKeys */
export const homeworkKeys = {
  all: (userId: number | undefined) => ["homework", userId] as const,
  tutorList: (userId: number | undefined, page: number) => ["homework", userId, "tutor", page] as const,
  studentList: (userId: number | undefined, query: StudentHomeworksQuery) => ["homework", userId, "student", query] as const,
  detail: (userId: number | undefined, homeworkId: number) => ["homework", userId, "detail", homeworkId] as const,
  mine: (userId: number | undefined, homeworkId: number) => ["homework", userId, "mine", homeworkId] as const,
  submissions: (userId: number | undefined, homeworkId: number) => ["homework", userId, "submissions", homeworkId] as const,
  notifications: (userId: number | undefined) => ["notifications", userId] as const,
};

/** Bài tập của các buổi tôi đang dạy */
export function useTutorHomeworks(page: number) {
  const userId = useUserId();
  return useQuery({ queryKey: homeworkKeys.tutorList(userId, page), queryFn: () => fetchTutorHomeworks(page) });
}

/** Bài tập của các lớp tôi đang học */
export function useStudentHomeworks(query: StudentHomeworksQuery) {
  const userId = useUserId();
  return useQuery({ queryKey: homeworkKeys.studentList(userId, query), queryFn: () => fetchStudentHomeworks(query) });
}

/** Một bài tập */
export function useHomework(homeworkId: number) {
  const userId = useUserId();
  return useQuery({ queryKey: homeworkKeys.detail(userId, homeworkId), queryFn: () => fetchHomework(homeworkId) });
}

/** Bài làm của tôi ở một bài tập (học viên) */
export function useMySubmission(homeworkId: number) {
  const userId = useUserId();
  return useQuery({ queryKey: homeworkKeys.mine(userId, homeworkId), queryFn: () => fetchMySubmission(homeworkId) });
}

/** Các bài đã nộp của một bài tập (gia sư) */
export function useSubmissions(homeworkId: number, enabled = true) {
  const userId = useUserId();
  return useQuery({
    queryKey: homeworkKeys.submissions(userId, homeworkId),
    queryFn: () => fetchSubmissions(homeworkId),
    enabled,
  });
}

/** Số thông báo chưa đọc — hỏi lại mỗi phút để chuông cập nhật khi có bài nộp / điểm mới */
export function useUnreadCount() {
  const userId = useUserId();
  return useQuery({
    queryKey: [...homeworkKeys.notifications(userId), "unread"],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
  });
}

/** 15 thông báo mới nhất; chỉ tải khi mở bảng thông báo */
export function useNotifications(enabled: boolean) {
  const userId = useUserId();
  return useQuery({ queryKey: [...homeworkKeys.notifications(userId), "list"], queryFn: () => fetchNotifications(), enabled });
}

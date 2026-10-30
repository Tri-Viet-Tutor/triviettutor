import { useQuery } from "@tanstack/react-query";
import { useUserId } from "@/hooks/usePortalData";
import type { StudentHomeworksQuery } from "@/interfaces/learning";
import {
  fetchHomeworkSubmissions,
  fetchMyTutorRating,
  fetchSessionHomeworks,
  fetchStudentHomeworks,
  fetchTutorRatingSummary,
} from "@/services/learningService";

/** Khóa cache của bài tập và đánh giá, nằm dưới "me" + mã người dùng như các dữ liệu "của tôi" khác */
export const learningKeys = {
  all: (userId: number | undefined) => ["me", userId, "learning"] as const,
  sessionHomeworks: (userId: number | undefined, sessionId: number) => ["me", userId, "learning", "session", sessionId] as const,
  submissions: (userId: number | undefined, homeworkId: number) => ["me", userId, "learning", "submissions", homeworkId] as const,
  studentHomeworksAll: (userId: number | undefined) => ["me", userId, "learning", "student-homeworks"] as const,
  studentHomeworks: (userId: number | undefined, query: StudentHomeworksQuery) =>
    ["me", userId, "learning", "student-homeworks", query] as const,
  ratingSummary: (tutorId: number) => ["tutor-rating", tutorId, "summary"] as const,
  myRating: (userId: number | undefined, tutorId: number) => ["me", userId, "tutor-rating", tutorId] as const,
};

/** Bài tập của một buổi; chỉ tải khi `enabled` */
export function useSessionHomeworks(sessionId: number, enabled = true) {
  const userId = useUserId();
  return useQuery({
    queryKey: learningKeys.sessionHomeworks(userId, sessionId),
    queryFn: () => fetchSessionHomeworks(sessionId),
    enabled,
  });
}

/** Bài đã nộp của một bài tập (gia sư); chỉ tải khi `enabled` */
export function useHomeworkSubmissions(homeworkId: number, enabled = true) {
  const userId = useUserId();
  return useQuery({
    queryKey: learningKeys.submissions(userId, homeworkId),
    queryFn: () => fetchHomeworkSubmissions(homeworkId),
    enabled,
  });
}

/** Bài tập ở mọi lớp của tôi (học viên) — giữ trang cũ trong lúc tải trang mới */
export function useStudentHomeworks(query: StudentHomeworksQuery) {
  const userId = useUserId();
  return useQuery({
    queryKey: learningKeys.studentHomeworks(userId, query),
    queryFn: () => fetchStudentHomeworks(query),
    placeholderData: (previous) => previous,
  });
}

/** Điểm trung bình của một gia sư */
export function useTutorRatingSummary(tutorId: number | null) {
  return useQuery({
    queryKey: learningKeys.ratingSummary(tutorId ?? 0),
    queryFn: () => fetchTutorRatingSummary(tutorId as number),
    enabled: tutorId !== null,
  });
}

/** Đánh giá của tôi cho một gia sư (null nếu chưa đánh giá) */
export function useMyTutorRating(tutorId: number | null) {
  const userId = useUserId();
  return useQuery({
    queryKey: learningKeys.myRating(userId, tutorId ?? 0),
    queryFn: () => fetchMyTutorRating(tutorId as number),
    enabled: tutorId !== null,
  });
}

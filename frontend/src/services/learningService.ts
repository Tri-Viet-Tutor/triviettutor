import { isAxiosError } from "axios";
import { api, getApiError, unwrap } from "@/services/api";
import type { ApiResponse, PageResponse } from "@/interfaces/api";
import type {
  GradeSubmissionRequest,
  HomeworkRequest,
  HomeworkResponse,
  HomeworkStatusRequest,
  HomeworkUpdateRequest,
  StudentHomeworkResponse,
  StudentHomeworksQuery,
  SubmissionRequest,
  SubmissionResponse,
  SubmissionStatus,
  TutorRatingRequest,
  TutorRatingResponse,
  TutorRatingSummaryResponse,
} from "@/interfaces/learning";

/*
 * Bài tập về nhà (gia sư giao, học viên làm và nộp, gia sư chấm) và đánh giá gia sư.
 * Mọi lần sửa đều gửi kèm `version` hiện tại; lệch phiên bản thì backend trả 409 LEARNING_VERSION_CONFLICT.
 */

// ── Bài tập (gia sư / quản trị) ──

/** GET /sessions/{sessionId}/homeworks — gia sư thấy mọi bài, học viên chỉ thấy bài đã công bố */
export async function fetchSessionHomeworks(sessionId: number): Promise<PageResponse<HomeworkResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<HomeworkResponse>>>(`/sessions/${sessionId}/homeworks`, { params: { size: 100 } }));
}

/** POST /sessions/{sessionId}/homeworks — tạo bài ở trạng thái nháp */
export async function createHomework(sessionId: number, request: HomeworkRequest): Promise<HomeworkResponse> {
  return unwrap(await api.post<ApiResponse<HomeworkResponse>>(`/sessions/${sessionId}/homeworks`, request));
}

/** PUT /homeworks/{homeworkId} — nháp sửa được mọi thứ; đã công bố chỉ được lùi hạn nộp hoặc tăng điểm tối đa */
export async function updateHomework(homeworkId: number, request: HomeworkUpdateRequest): Promise<HomeworkResponse> {
  return unwrap(await api.put<ApiResponse<HomeworkResponse>>(`/homeworks/${homeworkId}`, request));
}

/** PATCH /homeworks/{homeworkId}/status — công bố hoặc đóng bài */
export async function changeHomeworkStatus(homeworkId: number, request: HomeworkStatusRequest): Promise<HomeworkResponse> {
  return unwrap(await api.patch<ApiResponse<HomeworkResponse>>(`/homeworks/${homeworkId}/status`, request));
}

/** GET /homeworks/{homeworkId}/submissions — bài đã nộp / đã chấm (không gồm bản nháp của học viên) */
export async function fetchHomeworkSubmissions(
  homeworkId: number,
  status?: Extract<SubmissionStatus, "SUBMITTED" | "GRADED">,
): Promise<PageResponse<SubmissionResponse>> {
  return unwrap(
    await api.get<ApiResponse<PageResponse<SubmissionResponse>>>(`/homeworks/${homeworkId}/submissions`, {
      params: { status, size: 100 },
    }),
  );
}

/** PATCH /submissions/{submissionId}/grade — chấm điểm (0..maxScore) và nhận xét */
export async function gradeSubmission(submissionId: number, request: GradeSubmissionRequest): Promise<SubmissionResponse> {
  return unwrap(await api.patch<ApiResponse<SubmissionResponse>>(`/submissions/${submissionId}/grade`, request));
}

// ── Bài tập (học viên) ──

/** GET /student/homeworks — bài đã công bố ở các lớp tôi đang học, kèm bài làm của tôi */
export async function fetchStudentHomeworks(query: StudentHomeworksQuery = {}): Promise<PageResponse<StudentHomeworkResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<StudentHomeworkResponse>>>("/student/homeworks", { params: query }));
}

/** POST /homeworks/{homeworkId}/submissions/me/start — bắt đầu làm (gọi lại khi đang làm thì nhận về bản cũ) */
export async function startSubmission(homeworkId: number): Promise<SubmissionResponse> {
  return unwrap(await api.post<ApiResponse<SubmissionResponse>>(`/homeworks/${homeworkId}/submissions/me/start`));
}

/** PUT /homeworks/{homeworkId}/submissions/me/draft — lưu nháp, chưa nộp */
export async function saveSubmissionDraft(homeworkId: number, request: SubmissionRequest): Promise<SubmissionResponse> {
  return unwrap(await api.put<ApiResponse<SubmissionResponse>>(`/homeworks/${homeworkId}/submissions/me/draft`, request));
}

/** PUT /homeworks/{homeworkId}/submissions/me — nộp bài, hoặc nộp lại trước hạn khi chưa được chấm */
export async function submitSubmission(homeworkId: number, request: SubmissionRequest): Promise<SubmissionResponse> {
  return unwrap(await api.put<ApiResponse<SubmissionResponse>>(`/homeworks/${homeworkId}/submissions/me`, request));
}

// ── Đánh giá gia sư ──

/** GET /tutors/{tutorId}/ratings/summary — tên gia sư, điểm trung bình và số lượt đánh giá */
export async function fetchTutorRatingSummary(tutorId: number): Promise<TutorRatingSummaryResponse> {
  return unwrap(await api.get<ApiResponse<TutorRatingSummaryResponse>>(`/tutors/${tutorId}/ratings/summary`));
}

/** GET /tutors/{tutorId}/my-rating — đánh giá của tôi; chưa đánh giá (404 RATING_NOT_FOUND) thì trả null */
export async function fetchMyTutorRating(tutorId: number, classGroupId?: number | null): Promise<TutorRatingResponse | null> {
  try {
    const params = classGroupId ? { classGroupId } : undefined;
    return unwrap(await api.get<ApiResponse<TutorRatingResponse>>(`/tutors/${tutorId}/my-rating`, { params }));
  } catch (error) {
    if (getApiError(error).errorCode === "RATING_NOT_FOUND" || (isAxiosError(error) && error.response?.status === 404)) return null;
    throw error;
  }
}

/** POST /tutors/{tutorId}/ratings — mỗi học viên đánh giá một gia sư một lần */
export async function createTutorRating(tutorId: number, request: TutorRatingRequest): Promise<TutorRatingResponse> {
  return unwrap(await api.post<ApiResponse<TutorRatingResponse>>(`/tutors/${tutorId}/ratings`, request));
}

/** PUT /ratings/{ratingId} — sửa đánh giá của tôi */
export async function updateTutorRating(ratingId: number, request: TutorRatingRequest): Promise<TutorRatingResponse> {
  return unwrap(await api.put<ApiResponse<TutorRatingResponse>>(`/ratings/${ratingId}`, request));
}

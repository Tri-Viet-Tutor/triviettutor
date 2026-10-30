import { api, unwrap } from "@/services/api";
import type {
  ApiResponse,
  HomeworkRequest,
  HomeworkResponse,
  HomeworkStatus,
  PageResponse,
  StudentHomeworkResponse,
  SubmissionResponse,
  SubmissionStatus,
} from "@/interfaces/api";

/*
 * Bài tập theo buổi học (backend: HomeworkController, SubmissionController).
 * Gia sư giao bài cho một buổi (DRAFT → PUBLISHED → CLOSED); học viên bắt đầu làm, lưu nháp, nộp; gia sư chấm.
 * Mọi lần sửa / đổi trạng thái gửi kèm `version` hiện tại (sai thì 409 LEARNING_VERSION_CONFLICT).
 */

/** GET /sessions/{sessionId}/homeworks */
export async function listSessionHomeworks(sessionId: number): Promise<PageResponse<HomeworkResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<HomeworkResponse>>>(`/sessions/${sessionId}/homeworks`, { params: { size: 100 } }));
}

/** POST /sessions/{sessionId}/homeworks — tạo bài ở trạng thái nháp */
export async function createHomework(sessionId: number, request: HomeworkRequest): Promise<HomeworkResponse> {
  return unwrap(await api.post<ApiResponse<HomeworkResponse>>(`/sessions/${sessionId}/homeworks`, request));
}

/** PATCH /homeworks/{id}/status — giao (PUBLISHED) hoặc đóng (CLOSED) */
export async function changeHomeworkStatus(id: number, status: HomeworkStatus, version: number): Promise<HomeworkResponse> {
  return unwrap(await api.patch<ApiResponse<HomeworkResponse>>(`/homeworks/${id}/status`, { status, version }));
}

/** GET /homeworks/{id}/submissions — bài đã nộp / đã chấm (không có bản nháp) */
export async function listSubmissions(homeworkId: number, status?: SubmissionStatus): Promise<PageResponse<SubmissionResponse>> {
  return unwrap(
    await api.get<ApiResponse<PageResponse<SubmissionResponse>>>(`/homeworks/${homeworkId}/submissions`, { params: { status, size: 100 } }),
  );
}

/** PATCH /submissions/{id}/grade */
export async function gradeSubmission(id: number, input: { score: number; feedback?: string; version: number }): Promise<SubmissionResponse> {
  return unwrap(await api.patch<ApiResponse<SubmissionResponse>>(`/submissions/${id}/grade`, input));
}

/** GET /student/homeworks — bài của các lớp học viên đang học */
export async function listMyHomeworks(status?: SubmissionStatus): Promise<PageResponse<StudentHomeworkResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<StudentHomeworkResponse>>>("/student/homeworks", { params: { status, size: 100 } }));
}

/** POST /homeworks/{id}/submissions/me/start */
export async function startHomework(homeworkId: number): Promise<SubmissionResponse> {
  return unwrap(await api.post<ApiResponse<SubmissionResponse>>(`/homeworks/${homeworkId}/submissions/me/start`));
}

/** PUT /homeworks/{id}/submissions/me/draft — lưu nháp */
export async function saveHomeworkDraft(homeworkId: number, input: { content?: string; resourceUrl?: string; version: number }) {
  return unwrap(await api.put<ApiResponse<SubmissionResponse>>(`/homeworks/${homeworkId}/submissions/me/draft`, input));
}

/** PUT /homeworks/{id}/submissions/me — nộp bài (hoặc nộp lại trước hạn khi chưa chấm) */
export async function submitHomework(homeworkId: number, input: { content?: string; resourceUrl?: string; version: number }) {
  return unwrap(await api.put<ApiResponse<SubmissionResponse>>(`/homeworks/${homeworkId}/submissions/me`, input));
}

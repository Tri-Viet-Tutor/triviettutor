import type { ApiResponse, PageResponse, StudentHomeworkResponse as StudentHomeworkSummary } from "@/interfaces/api";
import type {
  AttachmentResponse,
  GradeInput,
  HomeworkInput,
  HomeworkResponse,
  HomeworkStatus,
  HomeworkUpdateInput,
  NotificationResponse,
  QuestionImportResponse,
  StudentHomeworkResponse,
  StudentHomeworksQuery,
  SubmissionInput,
  SubmissionResponse,
  TutorHomeworkResponse,
} from "@/interfaces/homework";
import { api, unwrap } from "@/services/api";

/*
 * Bài tập / bài kiểm tra (HomeworkController, SubmissionController) và thông báo (NotificationController).
 * Gia sư: tạo, công bố, đóng bài và chấm. Học viên: nhập mật khẩu để bắt đầu, làm, chụp ảnh bài làm, nộp.
 */

// ── Gia sư ──────────────────────────────────────────────────────────────────

/** POST /homeworks/questions/import — đọc câu hỏi từ file .csv / .xlsx để điền vào form (không lưu) */
export async function importQuestions(file: File): Promise<QuestionImportResponse> {
  const form = new FormData();
  form.append("file", file);
  return unwrap(
    await api.post<ApiResponse<QuestionImportResponse>>("/homeworks/questions/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  );
}

/** GET /tutor/homeworks — bài tập của các buổi tôi đang dạy, hạn nộp mới nhất trước */
export async function fetchTutorHomeworks(page = 0, size = 20): Promise<PageResponse<TutorHomeworkResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<TutorHomeworkResponse>>>("/tutor/homeworks", { params: { page, size } }));
}

/** Mọi bài tập của gia sư (gộp các trang, 100 bài/lần) — dùng để nhóm theo lớp / buổi phía trình duyệt */
export async function fetchAllTutorHomeworks(): Promise<TutorHomeworkResponse[]> {
  const all: TutorHomeworkResponse[] = [];
  for (let page = 0; ; page++) {
    const result = await fetchTutorHomeworks(page, 100);
    all.push(...result.content);
    if (page + 1 >= result.totalPages || result.content.length === 0) return all;
  }
}

/** POST /sessions/{sessionId}/homeworks — tạo bản nháp */
export async function createHomework(sessionId: number, input: HomeworkInput): Promise<HomeworkResponse> {
  return unwrap(await api.post<ApiResponse<HomeworkResponse>>(`/sessions/${sessionId}/homeworks`, input));
}

/** PUT /homeworks/{id} — sửa (cần version hiện tại) */
export async function updateHomework(homeworkId: number, input: HomeworkUpdateInput): Promise<HomeworkResponse> {
  return unwrap(await api.put<ApiResponse<HomeworkResponse>>(`/homeworks/${homeworkId}`, input));
}

/** PATCH /homeworks/{id}/status — công bố (PUBLISHED) hoặc đóng (CLOSED) */
export async function changeHomeworkStatus(homeworkId: number, status: HomeworkStatus, version: number): Promise<HomeworkResponse> {
  return unwrap(await api.patch<ApiResponse<HomeworkResponse>>(`/homeworks/${homeworkId}/status`, { status, version }));
}

/** GET /homeworks/{id}/submissions — bài đã nộp / đã chấm, kèm câu trả lời và tệp */
export async function fetchSubmissions(homeworkId: number, page = 0, size = 100): Promise<PageResponse<SubmissionResponse>> {
  return unwrap(
    await api.get<ApiResponse<PageResponse<SubmissionResponse>>>(`/homeworks/${homeworkId}/submissions`, { params: { page, size } }),
  );
}

/** PATCH /submissions/{id}/grade — chấm điểm và nhận xét */
export async function gradeSubmission(submissionId: number, input: GradeInput): Promise<SubmissionResponse> {
  return unwrap(await api.patch<ApiResponse<SubmissionResponse>>(`/submissions/${submissionId}/grade`, input));
}

// ── Dùng chung ──────────────────────────────────────────────────────────────

/** GET /homeworks/{id} — gia sư nhận cả đáp án; học viên chỉ nhận câu hỏi sau khi bắt đầu */
export async function fetchHomework(homeworkId: number): Promise<HomeworkResponse> {
  return unwrap(await api.get<ApiResponse<HomeworkResponse>>(`/homeworks/${homeworkId}`));
}

/** GET /homeworks/questions/template/{format} — file mẫu câu hỏi Excel / Word (có JWT) */
export async function fetchQuestionTemplate(format: "xlsx" | "docx"): Promise<Blob> {
  const { data } = await api.get<Blob>(`/homeworks/questions/template/${format}`, { responseType: "blob" });
  return data;
}

/** GET /submission-attachments/{id} — tải tệp bài làm (có JWT) để hiển thị */
export async function fetchAttachmentBlob(attachmentId: number): Promise<Blob> {
  const { data } = await api.get<Blob>(`/submission-attachments/${attachmentId}`, { responseType: "blob" });
  return data;
}

/** GET /sessions/{sessionId}/homeworks — bài tập của một buổi */
export async function listSessionHomeworks(sessionId: number): Promise<PageResponse<HomeworkResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<HomeworkResponse>>>(`/sessions/${sessionId}/homeworks`, { params: { size: 100 } }));
}

// ── Học viên ────────────────────────────────────────────────────────────────

/** GET /student/homeworks — toàn bộ bài của tôi, cho ô tổng quan ở trang chủ học viên */
export async function listMyHomeworks(): Promise<PageResponse<StudentHomeworkSummary>> {
  // Backend xếp theo hạn nộp tăng dần, tối đa 100 bài / trang: tải hết các trang để bài mới nhất không bị cắt mất
  const get = async (page: number) =>
    unwrap(await api.get<ApiResponse<PageResponse<StudentHomeworkSummary>>>("/student/homeworks", { params: { page, size: 100 } }));
  const first = await get(0);
  const content = [...first.content];
  for (let page = 1; page < first.totalPages; page++) content.push(...(await get(page)).content);
  return { ...first, content, size: content.length, totalPages: 1 };
}

/** GET /student/homeworks — bài tập của các lớp tôi đang học */
export async function fetchStudentHomeworks(query: StudentHomeworksQuery = {}): Promise<PageResponse<StudentHomeworkResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<StudentHomeworkResponse>>>("/student/homeworks", { params: query }));
}

/** GET /homeworks/{id}/submissions/me — bài làm của tôi (NOT_STARTED nếu chưa bắt đầu) */
export async function fetchMySubmission(homeworkId: number): Promise<SubmissionResponse> {
  return unwrap(await api.get<ApiResponse<SubmissionResponse>>(`/homeworks/${homeworkId}/submissions/me`));
}

/** POST /homeworks/{id}/submissions/me/start — bắt đầu làm (lần đầu cần mật khẩu nếu bài có đặt) */
export async function startHomework(homeworkId: number, password?: string): Promise<SubmissionResponse> {
  return unwrap(await api.post<ApiResponse<SubmissionResponse>>(`/homeworks/${homeworkId}/submissions/me/start`, { password }));
}

/** PUT /homeworks/{id}/submissions/me/draft — lưu tạm, chưa nộp */
export async function saveDraft(homeworkId: number, input: SubmissionInput): Promise<SubmissionResponse> {
  return unwrap(await api.put<ApiResponse<SubmissionResponse>>(`/homeworks/${homeworkId}/submissions/me/draft`, input));
}

/** PUT /homeworks/{id}/submissions/me — nộp bài */
export async function submitHomework(homeworkId: number, input: SubmissionInput): Promise<SubmissionResponse> {
  return unwrap(await api.put<ApiResponse<SubmissionResponse>>(`/homeworks/${homeworkId}/submissions/me`, input));
}

/** POST /homeworks/{id}/submissions/me/attachments — gửi ảnh chụp / PDF bài làm */
/** POST /files — tải một file lên kho chung, trả về link tải dùng được cho ảnh minh họa câu hỏi */
export async function uploadLearningFile(file: File): Promise<{ url: string; fileName: string; contentType: string; size: number }> {
  const form = new FormData();
  form.append("file", file, file.name);
  return unwrap(
    await api.post<ApiResponse<{ url: string; fileName: string; contentType: string; size: number }>>("/files", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  );
}

export async function uploadAttachment(homeworkId: number, file: Blob, fileName: string): Promise<AttachmentResponse> {
  const form = new FormData();
  form.append("file", file, fileName);
  // Đặt multipart để axios không đổi FormData thành JSON; trình duyệt tự thêm boundary
  return unwrap(
    await api.post<ApiResponse<AttachmentResponse>>(`/homeworks/${homeworkId}/submissions/me/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  );
}

/** DELETE /homeworks/{id}/submissions/me/attachments/{attachmentId} */
export async function removeAttachment(homeworkId: number, attachmentId: number): Promise<void> {
  await api.delete(`/homeworks/${homeworkId}/submissions/me/attachments/${attachmentId}`);
}

// ── Thông báo ───────────────────────────────────────────────────────────────

/** GET /me/notifications — mới nhất trước */
export async function fetchNotifications(page = 0, size = 15): Promise<PageResponse<NotificationResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<NotificationResponse>>>("/me/notifications", { params: { page, size } }));
}

/** GET /me/notifications/unread-count */
export async function fetchUnreadCount(): Promise<number> {
  return unwrap(await api.get<ApiResponse<{ count: number }>>("/me/notifications/unread-count")).count;
}

/** PATCH /me/notifications/{id}/read */
export async function markNotificationRead(notificationId: number): Promise<void> {
  await api.patch(`/me/notifications/${notificationId}/read`);
}

/** PATCH /me/notifications/read-all */
export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/me/notifications/read-all");
}

import type { IsoDate, IsoDateTime } from "@/interfaces/api";

/* ─────────────────────────────────────────────────────────────────────────────
 * Bài tập / bài kiểm tra và bài làm — khớp dto.learning + dto.notification của backend.
 * (HomeworkController, SubmissionController, NotificationController)
 * ───────────────────────────────────────────────────────────────────────────── */

/** enums.HomeworkStatus */
export type HomeworkStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

/** enums.SubmissionStatus — NOT_STARTED là trạng thái ảo khi học viên chưa bấm "Bắt đầu" */
export type SubmissionStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "GRADED";

/** enums.QuestionType */
export type QuestionType = "MULTIPLE_CHOICE" | "ESSAY";

/** dto.learning.QuestionRequest */
export interface QuestionInput {
  type: QuestionType;
  prompt: string;
  /** Chỉ câu trắc nghiệm: 2–10 phương án */
  options?: string[];
  /** Chỉ câu trắc nghiệm: vị trí đáp án đúng (từ 0) */
  correctOption?: number;
  points: number;
}

/** dto.learning.QuestionResponse — học viên không nhận `correctOption` */
export interface QuestionResponse {
  id: number;
  position: number;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctOption?: number;
  points: number;
}

/** dto.learning.HomeworkRequest (POST /sessions/{id}/homeworks) */
export interface HomeworkInput {
  title: string;
  instructions: string;
  resourceUrl?: string;
  /** Giờ mở cho học viên làm; bỏ trống = mở ngay khi công bố */
  openAt?: IsoDateTime;
  /** Hạn nộp */
  dueAt: IsoDateTime;
  /** Có câu hỏi thì phải bằng tổng điểm các câu */
  maxScore: number;
  /** Bỏ trống = giữ nguyên, chuỗi rỗng = bỏ mật khẩu */
  accessPassword?: string;
  allowLateSubmission?: boolean;
  /** Bỏ trống khi sửa = giữ nguyên câu hỏi */
  questions?: QuestionInput[];
}

/** dto.learning.HomeworkUpdateRequest */
export interface HomeworkUpdateInput extends HomeworkInput {
  version: number;
}

/** dto.learning.HomeworkResponse */
export interface HomeworkResponse {
  id: number;
  sessionId: number;
  version: number;
  title: string;
  instructions: string;
  resourceUrl?: string;
  openAt?: IsoDateTime;
  dueAt: IsoDateTime;
  maxScore: number;
  allowLateSubmission: boolean;
  passwordProtected: boolean;
  status: HomeworkStatus;
  createdBy?: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  publishedAt?: IsoDateTime;
  closedAt?: IsoDateTime;
  /** Học viên chỉ nhận câu hỏi sau khi đã bắt đầu làm */
  questions?: QuestionResponse[];
}

/** dto.learning.AnswerRequest */
export interface AnswerInput {
  questionId: number;
  selectedOption?: number;
  textAnswer?: string;
}

/** dto.learning.AnswerResponse — học viên chỉ thấy `score` khi bài đã chấm */
export interface AnswerResponse {
  questionId: number;
  selectedOption?: number;
  textAnswer?: string;
  score?: number;
}

/** dto.learning.AttachmentResponse */
export interface AttachmentResponse {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: IsoDateTime;
}

/** dto.learning.SubmissionRequest */
export interface SubmissionInput {
  content?: string;
  resourceUrl?: string;
  answers?: AnswerInput[];
  version: number;
}

/** dto.learning.SubmissionResponse */
export interface SubmissionResponse {
  id?: number;
  homeworkId: number;
  studentId: number;
  /** Chỉ có trong danh sách chấm bài của gia sư */
  studentName?: string;
  version?: number;
  status: SubmissionStatus;
  content?: string;
  resourceUrl?: string;
  startedAt?: IsoDateTime;
  updatedAt?: IsoDateTime;
  submittedAt?: IsoDateTime;
  /** Nộp trễ bao nhiêu giây so với hạn; không có = đúng hạn */
  lateSeconds?: number;
  /** Điểm phần trắc nghiệm do hệ thống chấm */
  autoScore?: number;
  autoGraded?: boolean;
  score?: number;
  feedback?: string;
  gradedBy?: number;
  gradedAt?: IsoDateTime;
  answers?: AnswerResponse[];
  attachments?: AttachmentResponse[];
}

/** dto.learning.GradeSubmissionRequest */
export interface GradeInput {
  /** Bài không có câu hỏi: bắt buộc. Bài có câu hỏi: bỏ trống, hệ thống tự cộng */
  score?: number;
  /** Điểm từng câu tự luận, theo mã câu hỏi */
  answerScores?: Record<number, number>;
  feedback?: string;
  version: number;
}

/** dto.learning.StudentHomeworkResponse — GET /student/homeworks */
export interface StudentHomeworkResponse {
  homework: HomeworkResponse;
  classGroupId: number;
  sessionDate: IsoDate;
  submission: SubmissionResponse;
}

/** dto.learning.TutorHomeworkResponse — GET /tutor/homeworks */
export interface TutorHomeworkResponse {
  homework: HomeworkResponse;
  classGroupId: number;
  sessionNumber: number;
  sessionDate: IsoDate;
  /** Bài đã nộp, chờ chấm */
  submittedCount: number;
  gradedCount: number;
}

/** Truy vấn GET /student/homeworks */
export interface StudentHomeworksQuery {
  status?: SubmissionStatus;
  page?: number;
  size?: number;
}

/** dto.notification.NotificationResponse */
export interface NotificationResponse {
  id: number;
  type: "HOMEWORK_PUBLISHED" | "HOMEWORK_SUBMITTED" | "HOMEWORK_LATE_SUBMISSION" | "HOMEWORK_GRADED" | string;
  title: string;
  message: string;
  /** Đường dẫn trang trong ứng dụng, ví dụ /tutor/homeworks/12 */
  link?: string;
  createdAt: IsoDateTime;
  readAt?: IsoDateTime;
}

// ── Props của các component bài tập ─────────────────────────────────────────

/** Một câu hỏi đang soạn trong form của gia sư (điểm và phương án dạng chuỗi để gõ thoải mái) */
export interface QuestionDraft {
  key: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctOption: number;
  points: string;
}

export interface QuestionBuilderProps {
  questions: QuestionDraft[];
  onChange: (questions: QuestionDraft[]) => void;
  /** Bài đã công bố: câu hỏi chỉ xem, không sửa */
  readOnly?: boolean;
}

export interface HomeworkEditorProps {
  /** Không có = tạo mới */
  homework?: HomeworkResponse;
  /** Buổi gắn với bài tập mới (chọn sẵn) */
  initialSessionId?: number;
  onSaved: (homework: HomeworkResponse) => void;
  onCancel?: () => void;
}

export interface HomeworkInfoProps {
  homework: HomeworkResponse;
  now: Date;
}

export interface AttachmentListProps {
  attachments: AttachmentResponse[];
  /** Có thì hiện nút xóa từng tệp */
  onRemove?: (attachment: AttachmentResponse) => void;
  removingId?: number;
}

export interface QuizFormProps {
  homework: HomeworkResponse;
  submission: SubmissionResponse;
}

export interface SubmissionGraderProps {
  homework: HomeworkResponse;
  submission: SubmissionResponse;
}

export interface SubmissionResultProps {
  homework: HomeworkResponse;
  submission: SubmissionResponse;
}

import type { IsoDate, IsoDateTime } from "@/interfaces/api";

/* Bài tập về nhà, bài nộp, chấm điểm (dto.learning) và đánh giá gia sư (dto.rating). */

/** enums.HomeworkStatus — DRAFT → PUBLISHED → CLOSED hoặc DRAFT → CLOSED, không mở lại */
export type HomeworkStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

/** enums.SubmissionStatus — NOT_STARTED là trạng thái ảo khi học viên chưa bắt đầu */
export type SubmissionStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "GRADED";

/** dto.learning.HomeworkResponse (thuộc tính null bị lược bỏ) */
export interface HomeworkResponse {
  id: number;
  sessionId: number;
  /** Phiên bản hiện tại — gửi kèm mọi lần sửa / đổi trạng thái, lệch thì backend trả 409 */
  version: number;
  title: string;
  instructions: string;
  resourceUrl?: string;
  dueAt: IsoDateTime;
  maxScore: number;
  status: HomeworkStatus;
  /** Chỉ gia sư / quản trị nhận được */
  createdBy?: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  publishedAt?: IsoDateTime;
  closedAt?: IsoDateTime;
}

/** dto.learning.HomeworkRequest — POST /sessions/{sessionId}/homeworks (tạo bản nháp) */
export interface HomeworkRequest {
  title: string;
  instructions: string;
  resourceUrl?: string;
  /** Hạn nộp, phải ở tương lai */
  dueAt: IsoDateTime;
  maxScore: number;
}

/** dto.learning.HomeworkUpdateRequest — PUT /homeworks/{homeworkId} */
export interface HomeworkUpdateRequest extends HomeworkRequest {
  version: number;
}

/** dto.learning.HomeworkStatusRequest — PATCH /homeworks/{homeworkId}/status */
export interface HomeworkStatusRequest {
  status: Exclude<HomeworkStatus, "DRAFT">;
  version: number;
}

/** dto.learning.SubmissionResponse */
export interface SubmissionResponse {
  /** Không có khi NOT_STARTED */
  id?: number;
  homeworkId: number;
  studentId: number;
  version?: number;
  status: SubmissionStatus;
  content?: string;
  resourceUrl?: string;
  startedAt?: IsoDateTime;
  updatedAt?: IsoDateTime;
  submittedAt?: IsoDateTime;
  score?: number;
  feedback?: string;
  gradedBy?: number;
  gradedAt?: IsoDateTime;
}

/** dto.learning.SubmissionRequest — lưu nháp hoặc nộp bài */
export interface SubmissionRequest {
  content?: string;
  resourceUrl?: string;
  version: number;
}

/** dto.learning.GradeSubmissionRequest — PATCH /submissions/{id}/grade */
export interface GradeSubmissionRequest {
  score: number;
  feedback?: string;
  version: number;
}

/** dto.learning.StudentHomeworkResponse — một dòng của GET /student/homeworks */
export interface StudentHomeworkResponse {
  homework: HomeworkResponse;
  classGroupId: number;
  sessionDate: IsoDate;
  submission: SubmissionResponse;
}

/** Tham số của GET /student/homeworks */
export interface StudentHomeworksQuery {
  status?: SubmissionStatus;
  page?: number;
  size?: number;
}

/** dto.rating.TutorRatingRequest — điểm 1.0–5.0 */
export interface TutorRatingRequest {
  classGroupId?: number;
  rating: number;
  comment?: string;
}

/** dto.rating.TutorRatingResponse */
export interface TutorRatingResponse {
  id: number;
  studentId: number;
  tutorId: number;
  classGroupId: number | null;
  classCode: string | null;
  subjectName: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

/** dto.rating.TutorRatingSummaryResponse */
export interface TutorRatingSummaryResponse {
  tutorId: number;
  tutorName: string;
  averageRating: number;
  totalRatings: number;
}

// ── Props của các thành phần ──

/** Props của HomeworkPanel (khu gia sư) */
export interface HomeworkPanelProps {
  sessionId: number;
  /** Buổi đã bị hủy: không giao bài mới được nữa */
  cancelled: boolean;
}

/** Props của HomeworkFormDialog */
export interface HomeworkFormDialogProps {
  open: boolean;
  sessionId: number;
  /** Có thì sửa bài này, không thì tạo bài mới */
  homework: HomeworkResponse | null;
  onClose: () => void;
}

/** Props của SubmissionList */
export interface SubmissionListProps {
  homework: HomeworkResponse;
}

/** Props của SessionHomeworkList (khu học viên) */
export interface SessionHomeworkListProps {
  sessionId: number;
}

/** Props của StudentHomeworkCard */
export interface StudentHomeworkCardProps {
  item: StudentHomeworkResponse;
  now: Date;
}

/** Props của TutorRatingDialog */
export interface TutorRatingDialogProps {
  /** Mã tài khoản gia sư được đánh giá; null thì hộp thoại đóng */
  tutorId: number | null;
  /** Mã nhóm lớp học viên đánh giá */
  classGroupId?: number | null;
  /** Tên hoặc mã lớp học hiển thị trên form */
  className?: string | null;
  onClose: () => void;
}

/** Props của TutorRatingBadge */
export interface TutorRatingBadgeProps {
  tutorId: number;
}

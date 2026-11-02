/**
 * Kiểu dữ liệu chuẩn cho ứng dụng VietTriTutor Mobile
 * Đồng bộ với định nghĩa trong Documentation/01-Business-Logic & Documentation/02-System-Architecture
 */

export type UserRole = 'ROLE_STUDENT' | 'ROLE_TUTOR' | 'ROLE_ADMIN';

export type GradeLevel = 'GRADE_10' | 'GRADE_11' | 'GRADE_12';

export type Subject =
  | 'MATH'
  | 'PHYSICS'
  | 'CHEMISTRY'
  | 'ENGLISH'
  | 'LITERATURE'
  | 'BIOLOGY'
  | 'INFORMATICS';

export type SchedulePattern = 'MON_WED_FRI' | 'TUE_THU_SAT' | 'SAT_SUN';

export type TimeSlot = 
  | 'SLOT_MORNING' 
  | 'SLOT_AFTERNOON' 
  | 'SLOT_EVENING' 
  | 'SLOT_LATE_EVENING';

export type SessionStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

export type DeliveryMode = 'ONLINE' | 'OFFLINE';

export type ClassType = 'ONE_ON_ONE' | 'GROUP';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  avatarUrl?: string;
  gradeLevel?: GradeLevel;
  school?: string;
}

export interface TutorInfo {
  id: string;
  fullName: string;
  avatarUrl?: string;
  bio: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
}

export interface CourseItem {
  id: string;
  /** Id khóa học backend (để đọc mô tả khóa) */
  courseId?: number;
  code: string;
  title: string;
  /** Mã môn backend ("MATH"); có thể là môn mới chưa có trong Subject */
  subject: Subject | (string & {});
  subjectLabel: string;
  gradeLevel: GradeLevel;
  gradeLabel: string;
  classType: ClassType;
  deliveryMode: DeliveryMode;
  schedulePattern: SchedulePattern;
  scheduleLabel: string;
  timeSlot: TimeSlot;
  timeSlotLabel: string;
  timeSlotHours: string;
  totalSessions: number;
  tuitionFee: number;
  enrolledStudents: number;
  maxStudents: number;
  startDate: string;
  location: string;
  /** Backend chưa công khai gia sư của lớp đang tuyển sinh (admin phân công sau hạn đăng ký) */
  tutor?: TutorInfo;
  description?: string;
  highlights?: string[];
  /** Học phí gốc 1 kèm 1; tuitionFee là giá học viên trả nếu đăng ký ngay (đã giảm theo sĩ số) */
  basePrice?: number;
  /** Mức giảm theo sĩ số, ví dụ 0.2 */
  discountRate?: number;
  spotsLeft?: number;
  enrollmentDeadline?: string | null;
  sessions?: { id: number; sessionNumber: number; date: string; startTime: string; endTime: string; status: string }[];
}

export interface SessionItem {
  sessionId: string;
  classId: string;
  className: string;
  subject: Subject | (string & {});
  subjectLabel: string;
  gradeLabel: string;
  sessionNumber: number;
  totalSessions: number;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  timeSlotHours: string;
  deliveryMode: DeliveryMode;
  roomOrLink: string;
  tutorName: string;
  status: SessionStatus;
  attendance?: AttendanceStatus;
  topic: string;
  meetingUrl?: string;
}

export interface BackendSessionResponse {
  sessionId: number;
  classGroupId: number;
  sessionNumber: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss
  endTime: string; // HH:mm:ss
  /** Trạng thái backend: SCHEDULED, IN_SESSION, COMPLETED, CANCELLED, PENDING_RESCHEDULE, MAKEUP, ABSENCE_LATE */
  status: string;
  scheduledTutorId?: number | null;
  actualTutorId?: number | null;
  meetingUrl?: string | null;
  topicId?: number | null;
  originalSessionId?: number | null;
  attendanceLocked?: boolean;
  attendanceNeedsReview?: boolean;
}

/** GET /catalog/classes và /catalog/classes/{id} (ClassResponse của backend) */
export interface BackendClassResponse {
  id: number;
  classCode: string;
  courseId: number;
  courseName: string;
  subject: string;
  subjectId?: number;
  gradeLevel: GradeLevel;
  classType: ClassType;
  deliveryMode: DeliveryMode;
  schedulePattern: SchedulePattern;
  timeSlot: TimeSlot;
  timeSlotLabel: string;
  startDate: string;
  enrollmentDeadline?: string | null;
  status: string;
  totalSessions: number;
  maxStudents: number;
  currentStudents: number;
  spotsLeft: number;
  full: boolean;
  basePrice1on1: number;
  estimatedFee?: number | null;
  discountRate?: number | null;
  sessions?: { id: number; sessionNumber: number; date: string; startTime: string; endTime: string; status: string }[];
}

export interface BackendPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export interface BackendApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errorCode?: string | null;
}

export interface LeaveRequest {
  id: string;
  sessionId: string;
  sessionTitle: string;
  date: string;
  reason: string;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

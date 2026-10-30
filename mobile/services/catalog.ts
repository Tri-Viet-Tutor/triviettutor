import { requestApi } from '@/services/api';
import type { BackendClassResponse, BackendPage, CourseItem, GradeLevel, SchedulePattern } from '@/types';

/*
 * Danh mục lớp đang mở (GET /catalog/classes, công khai) và chi tiết một lớp (GET /catalog/classes/{id}).
 * Trên app, mỗi "khóa học" hiển thị là một lớp cụ thể: có lịch, sĩ số và học phí thật từ máy chủ.
 */

const SUBJECT_LABELS: Record<string, string> = {
  MATH: 'Toán',
  PHYSICS: 'Vật lý',
  CHEMISTRY: 'Hóa học',
  ENGLISH: 'Tiếng Anh',
  LITERATURE: 'Ngữ văn',
  BIOLOGY: 'Sinh học',
  INFORMATICS: 'Tin học',
};

const PATTERN_LABELS: Record<SchedulePattern, string> = {
  MON_WED_FRI: 'Thứ 2 - 4 - 6',
  TUE_THU_SAT: 'Thứ 3 - 5 - 7',
  SAT_SUN: 'Thứ 7 - Chủ nhật',
};

/** "Toán" từ "MATH"; môn chưa biết thì hiện nguyên mã */
export const subjectLabel = (code: string) => SUBJECT_LABELS[code] ?? code;

/** "Lớp 10" từ "GRADE_10" */
export const gradeLabel = (grade: GradeLevel | string) => `Lớp ${String(grade).replace('GRADE_', '')}`;

/** Đổi một lớp của backend sang dữ liệu thẻ khóa học của app */
export function mapClassToCourse(item: BackendClassResponse): CourseItem {
  return {
    id: String(item.id),
    courseId: item.courseId,
    code: item.classCode,
    title: item.courseName,
    subject: item.subject,
    subjectLabel: subjectLabel(item.subject),
    gradeLevel: item.gradeLevel,
    gradeLabel: gradeLabel(item.gradeLevel),
    classType: item.classType,
    deliveryMode: item.deliveryMode,
    schedulePattern: item.schedulePattern,
    scheduleLabel: PATTERN_LABELS[item.schedulePattern] ?? item.schedulePattern,
    timeSlot: item.timeSlot,
    timeSlotLabel: item.timeSlotLabel,
    timeSlotHours: item.timeSlotLabel,
    totalSessions: item.totalSessions,
    // Lớp đầy thì backend không trả học phí dự kiến: hiện học phí gốc
    tuitionFee: Number(item.estimatedFee ?? item.basePrice1on1),
    basePrice: Number(item.basePrice1on1),
    discountRate: Number(item.discountRate ?? 0),
    enrolledStudents: item.currentStudents,
    maxStudents: item.maxStudents,
    spotsLeft: item.spotsLeft,
    startDate: item.startDate,
    enrollmentDeadline: item.enrollmentDeadline ?? null,
    location: item.deliveryMode === 'ONLINE' ? 'Phòng học trực tuyến trên ứng dụng' : 'Tại trung tâm',
    sessions: item.sessions,
  };
}

/** Các lớp đang mở đăng ký (tối đa 100) */
export async function fetchOpenClasses(params: { gradeLevel?: GradeLevel; subject?: string } = {}): Promise<CourseItem[]> {
  const query = new URLSearchParams({ page: '0', size: '100' });
  if (params.gradeLevel) query.append('gradeLevel', params.gradeLevel);
  if (params.subject) query.append('subject', params.subject);
  const page = await requestApi<BackendPage<BackendClassResponse>>(`/catalog/classes?${query.toString()}`, {
    method: 'GET',
    requiresAuth: false,
  });
  return (page?.content ?? []).map(mapClassToCourse);
}

/** Chi tiết một lớp kèm lịch từng buổi */
export async function fetchClassDetail(id: string | number): Promise<CourseItem> {
  const item = await requestApi<BackendClassResponse>(`/catalog/classes/${id}`, { method: 'GET', requiresAuth: false });
  return mapClassToCourse(item);
}

/** Mô tả của khóa (GET /catalog/courses chỉ trả khóa đang bán); không tìm thấy thì undefined */
export async function fetchCourseDescription(courseId: number): Promise<string | undefined> {
  const page = await requestApi<BackendPage<{ id: number; description: string | null }>>('/catalog/courses?page=0&size=100', {
    method: 'GET',
    requiresAuth: false,
  });
  return page?.content.find((course) => course.id === courseId)?.description ?? undefined;
}

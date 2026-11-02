import { formatTimeSlotHours, getDayOfWeekLabel, requestApi } from '@/services/api';
import { fetchClassDetail } from '@/services/catalog';
import type { BackendSessionResponse, CourseItem, SessionItem, SessionStatus } from '@/types';

/*
 * Lịch học của tài khoản đang đăng nhập (GET /me/sessions).
 * Buổi học của backend chỉ có id lớp, nên app đọc thêm thông tin lớp (tên khóa, môn, khối, hình thức)
 * từ GET /catalog/classes/{id}. Không còn dữ liệu mẫu: lỗi thì báo lỗi, chưa có buổi thì danh sách rỗng.
 */

/** Trạng thái buổi của backend → trạng thái hiển thị trên app */
function toDisplayStatus(status: string): SessionStatus {
  switch (status) {
    case 'IN_SESSION':
      return 'IN_PROGRESS';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      // SCHEDULED, MAKEUP, PENDING_RESCHEDULE, ABSENCE_LATE: buổi chưa diễn ra
      return 'UPCOMING';
  }
}

function toSessionItem(session: BackendSessionResponse, course: CourseItem | undefined): SessionItem {
  const online = course ? course.deliveryMode === 'ONLINE' : Boolean(session.meetingUrl);
  return {
    sessionId: String(session.sessionId),
    classId: String(session.classGroupId),
    className: course ? `${course.title} · ${course.code}` : `Lớp #${session.classGroupId}`,
    subject: course?.subject ?? '',
    subjectLabel: course?.subjectLabel ?? '',
    gradeLabel: course?.gradeLabel ?? '',
    sessionNumber: session.sessionNumber || 1,
    totalSessions: course?.totalSessions ?? 0,
    date: session.date,
    dayOfWeek: getDayOfWeekLabel(session.date),
    timeSlotHours: formatTimeSlotHours(session.startTime, session.endTime),
    deliveryMode: online ? 'ONLINE' : 'OFFLINE',
    roomOrLink: online ? 'Phòng học trực tuyến trên ứng dụng' : 'Tại trung tâm',
    tutorName: 'Gia sư phụ trách lớp',
    status: toDisplayStatus(session.status),
    topic: session.status === 'MAKEUP' ? `Buổi ${session.sessionNumber} (học bù)` : `Buổi ${session.sessionNumber}`,
    meetingUrl: session.meetingUrl || undefined,
  };
}

export async function fetchMySessions(params?: {
  from?: string;
  to?: string;
  status?: string;
  classGroupId?: number;
}): Promise<SessionItem[]> {
  const query = new URLSearchParams();
  if (params?.from) query.append('from', params.from);
  if (params?.to) query.append('to', params.to);
  if (params?.status) query.append('status', params.status);
  if (params?.classGroupId) query.append('classGroupId', String(params.classGroupId));
  const queryString = query.toString();

  const sessions = await requestApi<BackendSessionResponse[]>(`/me/sessions${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    requiresAuth: true,
  });
  if (!Array.isArray(sessions) || sessions.length === 0) return [];

  // Thông tin lớp: mỗi lớp đọc một lần; lớp không đọc được vẫn hiện buổi với tên "Lớp #id"
  const classIds = [...new Set(sessions.map((session) => session.classGroupId))];
  const details = await Promise.all(classIds.map((id) => fetchClassDetail(id).catch(() => undefined)));
  const byId = new Map(classIds.map((id, index) => [id, details[index]]));

  return sessions
    .map((session) => toSessionItem(session, byId.get(session.classGroupId)))
    .sort((a, b) => (a.date + a.timeSlotHours).localeCompare(b.date + b.timeSlotHours));
}

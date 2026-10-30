import { JOIN_CLOSES_AFTER_MINUTES, JOIN_OPENS_BEFORE_MINUTES, LATE_NOTICE_HOURS } from "@/constants/rules";
import type { LeaveRequestResponse, SessionResponse } from "@/interfaces/api";
import { addDays, diffDays, formatDate, formatDayMonth, parseIsoDate, startOfToday, startOfWeek, weekdayName } from "@/utils/date";
import type { ClassProgress } from "@/interfaces/portal";

/* Các hàm tính toán trên buổi học (SessionResponse) dùng chung cho ba khu sau đăng nhập. Giờ học là giờ Việt Nam. */

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** Ghép ngày "YYYY-MM-DD" và giờ "HH:mm:ss" thành một thời điểm theo giờ máy */
function atTime(date: string, time: string): Date {
  const [hour, minute] = time.split(":").map(Number);
  const day = parseIsoDate(date);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
}

/** Thời điểm buổi học bắt đầu */
export function sessionStart(session: SessionResponse): Date {
  return atTime(session.date, session.startTime);
}

/** Thời điểm buổi học kết thúc */
export function sessionEnd(session: SessionResponse): Date {
  return atTime(session.date, session.endTime);
}

/** "18:00:00", "20:00:00" → "18:00 – 20:00" */
export function formatTimeRange(session: SessionResponse): string {
  return `${session.startTime.slice(0, 5)} – ${session.endTime.slice(0, 5)}`;
}

/** "Hôm nay", "Ngày mai", "Hôm qua" hoặc tên thứ */
export function dayLabel(date: Date, today: Date = startOfToday()): string {
  const distance = diffDays(today, date);
  if (distance === 0) return "Hôm nay";
  if (distance === 1) return "Ngày mai";
  if (distance === -1) return "Hôm qua";
  return weekdayName(date);
}

/** "Thứ Sáu, 09/10/2026" */
export function formatLongDate(date: Date): string {
  return `${weekdayName(date)}, ${formatDate(date)}`;
}

/** Một dòng gọn để chọn buổi: "Thứ Sáu 09/10, 18:00 – 20:00, lớp #12" */
export function sessionOptionLabel(session: SessionResponse): string {
  const date = parseIsoDate(session.date);
  return `${weekdayName(date)} ${formatDayMonth(date)}, ${formatTimeRange(session)}, lớp #${session.classGroupId}`;
}

/** Buổi chưa kết thúc (tính cả buổi đang diễn ra) */
export function isUpcoming(session: SessionResponse, now: Date): boolean {
  return sessionEnd(session).getTime() > now.getTime();
}

/** Buổi sắp tới xếp gần nhất trước, buổi đã qua xếp mới nhất trước */
export function splitSessions(sessions: SessionResponse[], now: Date): { upcoming: SessionResponse[]; past: SessionResponse[] } {
  const byStart = (a: SessionResponse, b: SessionResponse) => sessionStart(a).getTime() - sessionStart(b).getTime();
  const upcoming = sessions.filter((session) => isUpcoming(session, now)).sort(byStart);
  const past = sessions.filter((session) => !isUpcoming(session, now)).sort((a, b) => byStart(b, a));
  return { upcoming, past };
}

/** Buổi kế tiếp sẽ học thật: bỏ buổi đã hủy và buổi đang chờ xếp lại lịch */
export function nextSession(upcoming: SessionResponse[]): SessionResponse | undefined {
  return upcoming.find((session) => session.status === "SCHEDULED" || session.status === "IN_SESSION");
}

/** Lúc phòng học trực tuyến của buổi mở cửa */
export function joinOpensAt(session: SessionResponse): Date {
  return new Date(sessionStart(session).getTime() - JOIN_OPENS_BEFORE_MINUTES * MINUTE_MS);
}

/** Vào phòng học được ngay lúc này: buổi chưa hủy và đang trong khung từ 15 phút trước giờ học đến 15 phút sau khi kết thúc */
export function canJoinNow(session: SessionResponse, now: Date): boolean {
  const closesAt = sessionEnd(session).getTime() + JOIN_CLOSES_AFTER_MINUTES * MINUTE_MS;
  return session.status !== "CANCELLED" && now.getTime() >= joinOpensAt(session).getTime() && now.getTime() < closesAt;
}

/** Phòng học chưa mở nhưng sẽ mở (buổi chưa hủy, chưa xong, chưa tới giờ mở) */
export function joinOpensLater(session: SessionResponse, now: Date): boolean {
  return session.status !== "CANCELLED" && session.status !== "COMPLETED" && now.getTime() < joinOpensAt(session).getTime();
}

/** Backend chỉ nhận đơn xin nghỉ cho buổi chưa bắt đầu và chưa bị hủy */
export function canRequestLeave(session: SessionResponse, now: Date): boolean {
  return session.status !== "CANCELLED" && sessionStart(session).getTime() > now.getTime();
}

/** Xin nghỉ lúc này có bị tính là báo trễ không (dưới 24 giờ trước giờ học) */
export function isLateNotice(session: SessionResponse, now: Date): boolean {
  return sessionStart(session).getTime() - now.getTime() < LATE_NOTICE_HOURS * HOUR_MS;
}

/** Buổi có gia sư khác dạy thay gia sư được phân công */
export function hasSubstituteTutor(session: SessionResponse): boolean {
  return session.actualTutorId !== null && session.scheduledTutorId !== null && session.actualTutorId !== session.scheduledTutorId;
}

/** Đơn xin nghỉ đang chờ duyệt của một buổi (nếu có) */
export function pendingLeaveOf(sessionId: number, requests: LeaveRequestResponse[]): LeaveRequestResponse | undefined {
  return requests.find((request) => request.sessionId === sessionId && request.status === "PENDING");
}

/** Bảy ngày (thứ Hai → Chủ nhật) của tuần chứa `date` */
export function weekDays(date: Date): Date[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/** Tiến độ từng lớp: đã học bao nhiêu trên tổng số buổi còn hiệu lực */
export function classProgress(sessions: SessionResponse[]): ClassProgress[] {
  const byClass = new Map<number, ClassProgress>();
  for (const session of sessions) {
    if (session.status === "CANCELLED") continue;
    const entry = byClass.get(session.classGroupId) ?? { classGroupId: session.classGroupId, completed: 0, total: 0 };
    entry.total += 1;
    if (session.status === "COMPLETED") entry.completed += 1;
    byClass.set(session.classGroupId, entry);
  }
  return [...byClass.values()].sort((a, b) => a.classGroupId - b.classGroupId);
}

/** Tổng số giờ của các buổi đã học xong */
export function completedHours(sessions: SessionResponse[]): number {
  const ms = sessions
    .filter((session) => session.status === "COMPLETED")
    .reduce((sum, session) => sum + (sessionEnd(session).getTime() - sessionStart(session).getTime()), 0);
  return Math.round((ms / HOUR_MS) * 10) / 10;
}

/** Số giờ kiểu Việt Nam, dấu phẩy thập phân: 12.5 → "12,5 giờ" */
export function formatHours(hours: number): string {
  return `${String(hours).replace(".", ",")} giờ`;
}

/** Tên gọi thân mật: hai chữ cuối của họ tên ("Phạm Thu Phương" → "Thu Phương") */
export function givenName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  return words.length > 2 ? words.slice(-2).join(" ") : fullName.trim();
}

/** Chữ cái trong vòng tròn đại diện: chữ đầu của tên (chữ cuối trong họ tên) */
export function nameInitial(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  return (words[words.length - 1] ?? "").charAt(0).toUpperCase() || "?";
}

/**
 * Tên hiển thị của học viên trong danh sách điểm danh: "Nguyễn Minh Anh (#9)",
 * hoặc "Học viên #9" khi không tra được tên (backend chỉ trả mã học viên).
 */
export function studentLabel(studentId: number, nameOf?: (studentId: number) => string | undefined): string {
  const name = nameOf?.(studentId);
  return name ? `${name} (#${studentId})` : `Học viên #${studentId}`;
}

/** Người thật sự dạy buổi này: gia sư dạy thay nếu có, không thì gia sư được phân công */
export function teacherOf(session: SessionResponse): number | null {
  return session.actualTutorId ?? session.scheduledTutorId;
}

/** Gia sư được ghi / sửa điểm danh tới bấy nhiêu giờ sau khi buổi học kết thúc (AttendanceService của backend) */
const ATTENDANCE_EDIT_HOURS = 24;

/**
 * Buổi đang ở trạng thái ghi điểm danh được: đã bắt đầu, có người dạy, không bị hủy / chờ xếp lại lịch.
 * Buổi đã hoàn tất vẫn sửa được cho tới khi khóa (BR-04.33); hạn 24 giờ của gia sư kiểm tra riêng
 * bằng `attendanceDeadlinePassed`, trạng thái khóa nằm trong dữ liệu điểm danh.
 */
export function isRecordable(session: SessionResponse, now: Date): boolean {
  return (
    (session.status === "SCHEDULED" || session.status === "IN_SESSION" || session.status === "COMPLETED") &&
    teacherOf(session) !== null &&
    sessionStart(session).getTime() <= now.getTime()
  );
}

/** Đã quá hạn 24 giờ sau khi buổi kết thúc — gia sư không ghi / sửa điểm danh được nữa */
export function attendanceDeadlinePassed(session: SessionResponse, now: Date): boolean {
  return now.getTime() >= sessionEnd(session).getTime() + ATTENDANCE_EDIT_HOURS * HOUR_MS;
}

/** Buổi mà gia sư `tutorId` cần điểm danh ngay: mình là người dạy, chưa hoàn tất, còn ghi được và chưa quá hạn */
export function needsAttendance(session: SessionResponse, tutorId: number | undefined, now: Date): boolean {
  return (
    teacherOf(session) === tutorId &&
    session.status !== "COMPLETED" &&
    !session.attendanceLocked &&
    isRecordable(session, now) &&
    !attendanceDeadlinePassed(session, now)
  );
}

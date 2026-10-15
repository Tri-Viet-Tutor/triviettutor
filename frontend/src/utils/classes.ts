import type { ClassSummary } from "@/interfaces/admin";
import type { SessionResponse } from "@/interfaces/api";

/* Hàm gom các buổi học thành danh sách lớp (khu quản trị). */

/** Gom các buổi (đã xếp theo ngày) thành danh sách lớp; lớp chưa có gia sư đứng trước */
export function summarizeClasses(sessions: SessionResponse[]): ClassSummary[] {
  const byClass = new Map<number, ClassSummary>();
  for (const session of sessions) {
    if (session.status === "CANCELLED") continue;
    const known = byClass.get(session.classGroupId);
    if (known) known.upcomingCount += 1;
    else
      byClass.set(session.classGroupId, {
        classId: session.classGroupId,
        tutorId: session.scheduledTutorId,
        nextSession: session,
        upcomingCount: 1,
      });
  }
  return [...byClass.values()].sort((a, b) => Number(a.tutorId !== null) - Number(b.tutorId !== null) || a.classId - b.classId);
}

import { useMemo } from "react";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { useMySessions, useSessionAttendance } from "@/hooks/usePortalData";
import type { SessionResponse } from "@/interfaces/dto";
import { displayCode } from "@/utils/classes";
import { isUpcoming, sessionStart } from "@/utils/sessions";

// Buổi đại diện của lớp để lấy sĩ số: buổi sắp tới gần nhất, nếu hết thì buổi gần nhất đã qua
function representativeSession(sessions: SessionResponse[], classGroupId: number, now: Date): SessionResponse | null {
  const inClass = sessions.filter((session) => session.classGroupId === classGroupId && session.status !== "CANCELLED");
  if (inClass.length === 0) return null;
  const upcoming = inClass.filter((session) => isUpcoming(session, now)).sort((a, b) => sessionStart(a).getTime() - sessionStart(b).getTime());
  if (upcoming.length > 0) return upcoming[0];
  return inClass.slice().sort((a, b) => sessionStart(b).getTime() - sessionStart(a).getTime())[0];
}

// Tab "Danh sách học viên" của một lớp (khu gia sư): lấy sĩ số qua điểm danh của một buổi đại diện trong lớp
// (GET /sessions/{id}/attendance trả về studentIds + tên), vì khu gia sư chưa có API danh sách ghi danh riêng.
export function TutorClassRoster({ classGroupId, now }: { classGroupId: number; now: Date }) {
  const sessionsQuery = useMySessions();
  const sample = useMemo(
    () => representativeSession(sessionsQuery.data ?? [], classGroupId, now),
    [sessionsQuery.data, classGroupId, now],
  );
  const attendanceQuery = useSessionAttendance(sample?.sessionId ?? 0, sample !== null);

  if (sessionsQuery.isPending || (sample !== null && attendanceQuery.isPending)) return <PortalLoading label="Đang tải danh sách học viên" rows={4} />;
  if (sessionsQuery.isError) return <PortalError message="Không tải được danh sách học viên." onRetry={() => void sessionsQuery.refetch()} />;
  if (sample === null)
    return <PortalEmpty icon="groups" title="Lớp này chưa có buổi học nào." description="Sĩ số sẽ hiện ra sau khi lớp có lịch dạy." />;
  if (attendanceQuery.isError)
    return <PortalError message="Không tải được danh sách học viên." onRetry={() => void attendanceQuery.refetch()} />;

  const attendance = attendanceQuery.data;
  const studentIds = attendance?.studentIds ?? [];
  const names = attendance?.studentNames ?? {};
  const excused = new Set(attendance?.excusedStudentIds ?? []);

  if (studentIds.length === 0)
    return <PortalEmpty icon="groups" title="Lớp này chưa có học viên." description="Danh sách sẽ hiện ra sau khi có học viên vào học." />;

  return (
    <div className="space-y-3">
      <p className="text-[13.5px] text-brand-muted">
        {studentIds.length} học viên — theo sĩ số buổi {displayCode("session", sample.sessionId)}
      </p>
      <ul className="space-y-2">
        {studentIds.map((studentId) => (
          <li
            key={studentId}
            className="flex items-center justify-between gap-3 rounded-xl border border-brand-sandLine bg-white px-3.5 py-2.5"
          >
            <span className="flex items-center gap-2 text-[14px] font-semibold text-brand-ink">
              <Icon name="person" className="text-[18px] text-brand-muted" />
              {names[String(studentId)] ?? `Học viên ${displayCode("student", studentId)}`}
            </span>
            {excused.has(studentId) && (
              <StatusChip tone="slate" icon="event_busy">
                Nghỉ có phép buổi này
              </StatusChip>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

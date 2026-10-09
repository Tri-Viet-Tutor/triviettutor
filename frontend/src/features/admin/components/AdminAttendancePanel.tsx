import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { correctAttendance, setAttendanceLock } from "@/features/admin/api/adminApi";
import { ReasonForm } from "@/features/admin/components/ReasonForm";
import { useRefreshAdmin } from "@/features/admin/hooks/useAdminData";
import { AUTH_LABEL } from "@/features/auth/components/AuthField";
import { AttendanceEditor } from "@/features/portal/components/AttendanceEditor";
import { StatusChip } from "@/features/portal/components/StatusChip";
import { ATTENDANCE_STATUS } from "@/features/portal/data/labels";
import { isRecordable, sessionEnd } from "@/features/portal/data/sessions";
import { PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_TEXT_LINK } from "@/features/portal/data/ui";
import { portalKeys, useSessionAttendance, useUserId } from "@/features/portal/hooks/usePortalData";
import type { AttendanceRecordResponse, AttendanceStatus, SessionResponse } from "@/types/api";

const STATUS_ORDER: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

interface AdminAttendancePanelProps {
  session: SessionResponse;
  now: Date;
  /** Tra họ tên học viên theo mã */
  nameOf: (studentId: number) => string | undefined;
}

/**
 * Điểm danh của một buổi dưới quyền quản trị:
 * chưa khóa thì ghi / sửa như gia sư (kèm lý do, có thể xác nhận thay rằng buổi đã được dạy);
 * đã khóa thì sửa từng bản ghi kèm lý do (PATCH …/attendance/{recordId});
 * buổi đã kết thúc thì khóa / mở khóa được (PATCH …/attendance/lock).
 */
export function AdminAttendancePanel({ session, now, nameOf }: AdminAttendancePanelProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const refresh = useRefreshAdmin();
  const attendance = useSessionAttendance(session.sessionId);
  const [lockOpen, setLockOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecordResponse | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>("PRESENT");
  const [note, setNote] = useState("");

  const attendanceKey = portalKeys.attendance(userId, session.sessionId);
  const data = attendance.data;
  const ended = sessionEnd(session).getTime() <= now.getTime();

  const lock = useMutation({
    mutationFn: (reason: string) => setAttendanceLock(session.sessionId, { locked: !data?.locked, reason }),
    onSuccess: (updated) => {
      queryClient.setQueryData(attendanceKey, updated);
      setLockOpen(false);
      void refresh();
    },
  });
  const correct = useMutation({
    mutationFn: (reason: string) =>
      correctAttendance(session.sessionId, (editing as AttendanceRecordResponse).recordId, {
        status,
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: attendanceKey });
    },
  });

  function startEditing(record: AttendanceRecordResponse) {
    correct.reset();
    setEditing(record);
    setStatus(record.status);
    setNote(record.note ?? "");
  }

  const studentLabel = (studentId: number) => {
    const name = nameOf(studentId);
    return name ? `${name} (#${studentId})` : `Học viên #${studentId}`;
  };

  return (
    <div className="space-y-3">
      {data?.locked ? (
        <>
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {data.studentIds.map((studentId) => {
              const record = data.records.find((item) => item.studentId === studentId);
              const style = record ? ATTENDANCE_STATUS[record.status] : null;
              return (
                <li key={studentId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3.5 py-2.5">
                  <span className="text-[14.5px] font-semibold text-brand-ink">{studentLabel(studentId)}</span>
                  <span className="flex items-center gap-3">
                    {style ? (
                      <StatusChip tone={style.tone} icon={style.icon}>
                        {style.label}
                      </StatusChip>
                    ) : (
                      <span className="text-[13.5px] text-brand-muted">Chưa điểm danh</span>
                    )}
                    {record && (
                      <button type="button" onClick={() => startEditing(record)} className={`text-[13.5px] ${PORTAL_TEXT_LINK}`}>
                        Sửa
                      </button>
                    )}
                  </span>
                  {record?.note && <span className="w-full text-[13.5px] text-brand-muted">{record.note}</span>}
                </li>
              );
            })}
          </ul>
          {editing && (
            <ReasonForm
              id={`correct-reason-${editing.recordId}`}
              label="Lý do sửa"
              submitLabel="Lưu bản ghi"
              isPending={correct.isPending}
              error={correct.error}
              errorFallback="Chưa sửa được bản ghi. Vui lòng thử lại."
              onSubmit={(reason) => correct.mutate(reason)}
              onCancel={() => setEditing(null)}
            >
              <p className="text-[14.5px] font-semibold text-brand-ink">Sửa điểm danh của {studentLabel(editing.studentId)}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`correct-status-${editing.recordId}`} className={`mb-1.5 ${AUTH_LABEL}`}>
                    Trạng thái
                  </label>
                  <select
                    id={`correct-status-${editing.recordId}`}
                    value={status}
                    onChange={(event) => setStatus(event.target.value as AttendanceStatus)}
                    className={PORTAL_INPUT}
                  >
                    {STATUS_ORDER.map((item) => (
                      <option key={item} value={item}>
                        {ATTENDANCE_STATUS[item].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`correct-note-${editing.recordId}`} className={`mb-1.5 ${AUTH_LABEL}`}>
                    Ghi chú
                  </label>
                  <input
                    id={`correct-note-${editing.recordId}`}
                    type="text"
                    maxLength={1000}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className={PORTAL_INPUT}
                  />
                </div>
              </div>
            </ReasonForm>
          )}
        </>
      ) : (
        <AttendanceEditor
          sessionId={session.sessionId}
          editable={isRecordable(session, now)}
          readOnlyNote={session.status === "COMPLETED" ? "Buổi học đã hoàn tất." : "Buổi học chưa ở trạng thái ghi điểm danh được."}
          asAdmin
          nameOf={nameOf}
        />
      )}

      {data && ended && !editing && (
        <div>
          {lockOpen ? (
            <ReasonForm
              id={`lock-reason-${session.sessionId}`}
              label={data.locked ? "Lý do mở khóa" : "Lý do khóa"}
              submitLabel={data.locked ? "Mở khóa điểm danh" : "Khóa điểm danh"}
              isPending={lock.isPending}
              error={lock.error}
              errorFallback="Chưa đổi được trạng thái khóa. Vui lòng thử lại."
              onSubmit={(reason) => lock.mutate(reason)}
              onCancel={() => setLockOpen(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                lock.reset();
                setLockOpen(true);
              }}
              className={PORTAL_BTN_SECONDARY}
            >
              {data.locked ? "Mở khóa điểm danh" : "Khóa điểm danh"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

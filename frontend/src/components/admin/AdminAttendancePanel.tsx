import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { AttendanceEditor } from "@/components/dashboard/AttendanceEditor";
import { Select } from "@/components/ui/Select";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { AUTH_LABEL, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_TEXT_LINK } from "@/constants/classNames";
import { ATTENDANCE_STATUS, ATTENDANCE_STATUS_ORDER } from "@/constants/labels";
import { useRefreshAdmin } from "@/hooks/useAdminData";
import { portalKeys, useSessionAttendance, useUserId } from "@/hooks/usePortalData";
import type { AttendanceRecordResponse, AttendanceStatus } from "@/interfaces/dto";
import { correctStudentAttendance, setAttendanceLock } from "@/services/adminService";
import { studentLabel as formatStudent, isRecordable, sessionEnd } from "@/utils/sessions";
import type { AdminAttendancePanelProps } from "@/interfaces/admin";

// Khung điểm danh của một buổi cho admin: xem, sửa điểm danh từng học viên và khóa / mở khóa điểm danh
export function AdminAttendancePanel({ session, now, nameOf }: AdminAttendancePanelProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const refresh = useRefreshAdmin();
  const attendance = useSessionAttendance(session.sessionId);
  // Form khóa / mở khóa đang mở?
  const [lockOpen, setLockOpen] = useState(false);
  // Học viên đang sửa / điền điểm danh (khi đã khóa; record null nghĩa là chưa có bản ghi) và giá trị đang nhập
  const [editing, setEditing] = useState<{ studentId: number; record: AttendanceRecordResponse | null } | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>("PRESENT");
  const [note, setNote] = useState("");

  const attendanceKey = portalKeys.attendance(userId, session.sessionId);
  const data = attendance.data;
  const ended = sessionEnd(session).getTime() <= now.getTime();

  // Đảo trạng thái khóa hiện tại
  const lock = useMutation({
    mutationFn: (reason: string) => setAttendanceLock(session.sessionId, { locked: !data?.locked, reason }),
    onSuccess: (updated) => {
      queryClient.setQueryData(attendanceKey, updated);
      setLockOpen(false);
      void refresh();
    },
  });
  // Sửa (hoặc điền mới) điểm danh đã khóa của một học viên; ghi chú để trống thì không gửi
  const correct = useMutation({
    mutationFn: (reason: string) =>
      correctStudentAttendance(session.sessionId, (editing as { studentId: number }).studentId, {
        status,
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: attendanceKey });
      // Trạng thái buổi (hoàn tất / cần xem lại) có thể đổi theo
      void refresh();
    },
  });

  // Mở form sửa, điền sẵn giá trị cũ (học viên chưa có bản ghi thì mặc định Có mặt)
  function startEditing(studentId: number, record: AttendanceRecordResponse | undefined) {
    correct.reset();
    setEditing({ studentId, record: record ?? null });
    setStatus(record?.status ?? "PRESENT");
    setNote(record?.note ?? "");
  }

  // Tên hiển thị của học viên theo id
  const studentLabel = (studentId: number) => formatStudent(studentId, nameOf);

  return (
    <div className="space-y-3">
      {
        // Đã khóa: danh sách chỉ đọc, sửa từng dòng. Chưa khóa: dùng bộ điểm danh như gia sư
      }
      {data?.locked ? (
        <>
          <ul className="divide-y divide-brand-sandLine rounded-xl border border-brand-sandLine bg-white">
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
                    <button type="button" onClick={() => startEditing(studentId, record)} className={`text-[13.5px] ${PORTAL_TEXT_LINK}`}>
                      {record ? "Sửa" : "Điền"}
                    </button>
                  </span>
                  {record?.note && <span className="w-full text-[13.5px] text-brand-muted">{record.note}</span>}
                </li>
              );
            })}
          </ul>
          {editing && (
            <ReasonForm
              id={`correct-reason-${editing.studentId}`}
              label={editing.record ? "Lý do sửa" : "Lý do bổ sung"}
              submitLabel="Lưu bản ghi"
              isPending={correct.isPending}
              error={correct.error}
              errorFallback="Chưa sửa được bản ghi. Vui lòng thử lại."
              onSubmit={(reason) => correct.mutate(reason)}
              onCancel={() => setEditing(null)}
            >
              <p className="text-[14.5px] font-semibold text-brand-ink">
                {editing.record ? "Sửa" : "Bổ sung"} điểm danh của {studentLabel(editing.studentId)}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`correct-status-${editing.studentId}`} className={`mb-1.5 ${AUTH_LABEL}`}>
                    Trạng thái
                  </label>
                  <Select
                    id={`correct-status-${editing.studentId}`}
                    value={status}
                    onChange={(event) => setStatus(event.target.value as AttendanceStatus)}
                    className={PORTAL_INPUT}
                  >
                    {ATTENDANCE_STATUS_ORDER.map((item) => (
                      <option key={item} value={item}>
                        {ATTENDANCE_STATUS[item].label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor={`correct-note-${editing.studentId}`} className={`mb-1.5 ${AUTH_LABEL}`}>
                    Ghi chú
                  </label>
                  <input
                    id={`correct-note-${editing.studentId}`}
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

      {
        // Chỉ khóa / mở khóa được khi buổi đã kết thúc
      }
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

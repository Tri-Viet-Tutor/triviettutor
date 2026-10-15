import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { AUTH_LABEL, PORTAL_BTN_PRIMARY, PORTAL_INPUT } from "@/constants/classNames";
import { ATTENDANCE_STATUS, ATTENDANCE_STATUS_ORDER } from "@/constants/labels";
import { portalKeys, useSessionAttendance, useUserId } from "@/hooks/usePortalData";
import type { AttendanceRecordInput, AttendanceResponse, AttendanceStatus } from "@/interfaces/api";
import { submitAttendance } from "@/services/portalService";
import { formatClockTime, formatDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import { studentLabel as formatStudent } from "@/utils/sessions";
import type { AttendanceDraft, AttendanceEditorProps } from "@/interfaces/portal";

/** Dựng bản nháp từ dữ liệu máy chủ: mọi học viên đều có dòng, dòng đã điểm danh điền sẵn */
function toDrafts(data: AttendanceResponse): Record<number, AttendanceDraft> {
  const drafts: Record<number, AttendanceDraft> = {};
  for (const studentId of data.studentIds) drafts[studentId] = { status: "", note: "" };
  for (const record of data.records) drafts[record.studentId] = { status: record.status, note: record.note ?? "" };
  return drafts;
}

/**
 * Điểm danh cả lớp của một buổi (GET + PUT /sessions/{id}/attendance) — gia sư dạy buổi đó và quản trị dùng chung.
 * Backend chỉ trả mã học viên nên mỗi dòng ghi "Học viên #mã". Gửi một phần cũng được: dòng chưa chọn thì bỏ qua.
 */
export function AttendanceEditor({ sessionId, editable, readOnlyNote, asAdmin = false, nameOf }: AttendanceEditorProps) {
  const studentLabel = (studentId: number) => formatStudent(studentId, nameOf);
  const userId = useUserId();
  const queryClient = useQueryClient();
  const attendance = useSessionAttendance(sessionId);
  // Bản nháp theo mã học viên
  const [drafts, setDrafts] = useState<Record<number, AttendanceDraft>>({});
  const [reason, setReason] = useState("");
  const [teachingConfirmed, setTeachingConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);

  const data = attendance.data;
  // Có dữ liệu mới từ máy chủ thì dựng lại bản nháp
  useEffect(() => {
    if (data) setDrafts(toDrafts(data));
  }, [data]);

  // Quản trị gửi kèm xác nhận đã dạy và lý do (nếu có)
  const save = useMutation({
    mutationFn: (records: AttendanceRecordInput[]) =>
      submitAttendance(sessionId, {
        records,
        ...(asAdmin && teachingConfirmed ? { teachingConfirmed: true } : {}),
        ...(asAdmin && reason.trim() ? { reason: reason.trim() } : {}),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(portalKeys.attendance(userId, sessionId), updated);
      setSaved(true);
      setReason("");
      // Trạng thái buổi học có thể đổi sau khi điểm danh (SCHEDULED → IN_SESSION…)
      void queryClient.invalidateQueries({ queryKey: portalKeys.sessions(userId) });
      void queryClient.invalidateQueries({ queryKey: ["admin"] }); // khóa gốc của dữ liệu khu quản trị (adminKeys.all)
    },
  });

  if (attendance.isPending) return <p className="text-[14.5px] text-brand-muted">Đang tải danh sách lớp…</p>;
  if (attendance.isError || !data) {
    return (
      <p className="text-[14.5px] text-brand-muted">{portalErrorMessage(attendance.error, "Không tải được điểm danh của buổi này.")}</p>
    );
  }
  if (data.studentIds.length === 0) return <p className="text-[14.5px] text-brand-muted">Buổi này chưa có học viên nào trong danh sách.</p>;

  // Khóa hoặc không còn ghi được thì chỉ hiện danh sách để xem
  const locked = data.locked || !editable;
  // Chỉ gửi những dòng đã chọn trạng thái
  const chosen = Object.entries(drafts).filter(([, draft]) => draft.status !== "");
  // Quản trị xác nhận thay gia sư thì bắt buộc có lý do
  const needsReason = asAdmin && teachingConfirmed && reason.trim() === "";

  /** Sửa bản nháp của một học viên */
  function setDraft(studentId: number, patch: Partial<AttendanceDraft>) {
    setDrafts((current) => ({ ...current, [studentId]: { ...current[studentId], ...patch } }));
    setSaved(false);
  }

  /** Gửi các dòng đã chọn; ghi chú để trống thì không gửi */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (chosen.length === 0 || needsReason) return;
    save.mutate(
      chosen.map(([studentId, draft]) => ({
        studentId: Number(studentId),
        status: draft.status as AttendanceStatus,
        ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
      })),
    );
  }

  if (locked) {
    return (
      <div>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {data.studentIds.map((studentId) => {
            const record = data.records.find((item) => item.studentId === studentId);
            const style = record ? ATTENDANCE_STATUS[record.status] : null;
            return (
              <li key={studentId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3.5 py-2.5">
                <span className="text-[14.5px] font-semibold text-brand-ink">{studentLabel(studentId)}</span>
                {style ? (
                  <StatusChip tone={style.tone} icon={style.icon}>
                    {style.label}
                  </StatusChip>
                ) : (
                  <span className="text-[13.5px] text-brand-muted">Chưa điểm danh</span>
                )}
                {record?.note && <span className="w-full text-[13.5px] text-brand-muted">{record.note}</span>}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[13.5px] text-brand-muted">{data.locked ? "Điểm danh đã khóa." : readOnlyNote}</p>
      </div>
    );
  }

  const deadline = data.editDeadline ? new Date(data.editDeadline) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {data.studentIds.map((studentId) => {
          const draft = drafts[studentId] ?? { status: "", note: "" };
          return (
            <li key={studentId} className="px-3.5 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span id={`attendance-${sessionId}-${studentId}`} className="text-[14.5px] font-semibold text-brand-ink">
                  {studentLabel(studentId)}
                </span>
                <div role="radiogroup" aria-labelledby={`attendance-${sessionId}-${studentId}`} className="flex flex-wrap gap-1.5">
                  {ATTENDANCE_STATUS_ORDER.map((status) => {
                    const selected = draft.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setDraft(studentId, { status })}
                        className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-navy ${
                          selected
                            ? "border-brand-navy bg-brand-navy text-white"
                            : "border-slate-300 bg-white text-brand-ink hover:border-brand-navy"
                        }`}
                      >
                        {ATTENDANCE_STATUS[status].label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Chỉ hỏi ghi chú khi không phải "Có mặt" */}
              {draft.status !== "" && draft.status !== "PRESENT" && (
                <input
                  type="text"
                  value={draft.note}
                  maxLength={1000}
                  onChange={(event) => setDraft(studentId, { note: event.target.value })}
                  placeholder="Ghi chú (không bắt buộc)"
                  aria-label={`Ghi chú cho ${studentLabel(studentId)}`}
                  className={`mt-2 ${PORTAL_INPUT}`}
                />
              )}
            </li>
          );
        })}
      </ul>

      {asAdmin && (
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
          <label className="flex items-start gap-2.5 text-[14.5px] text-brand-ink">
            <input
              type="checkbox"
              checked={teachingConfirmed}
              onChange={(event) => setTeachingConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-400 text-brand-navy focus:ring-brand-navy"
            />
            Xác nhận buổi này đã được dạy (thay cho gia sư)
          </label>
          <div>
            <label htmlFor={`attendance-reason-${sessionId}`} className={`mb-1.5 ${AUTH_LABEL}`}>
              Lý do {teachingConfirmed ? "(bắt buộc)" : "(không bắt buộc)"}
            </label>
            <input
              id={`attendance-reason-${sessionId}`}
              type="text"
              value={reason}
              maxLength={1000}
              onChange={(event) => setReason(event.target.value)}
              className={PORTAL_INPUT}
            />
          </div>
        </div>
      )}

      {saved && <AuthNotice tone="success">Đã lưu điểm danh.</AuthNotice>}
      {save.error && <AuthNotice tone="error">{portalErrorMessage(save.error, "Chưa lưu được điểm danh. Vui lòng thử lại.")}</AuthNotice>}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="submit" disabled={save.isPending || chosen.length === 0 || needsReason} className={PORTAL_BTN_PRIMARY}>
          {save.isPending ? "Đang lưu…" : "Lưu điểm danh"}
        </button>
        {deadline && !asAdmin && (
          <p className="text-[13.5px] text-brand-muted">
            Sửa được tới {formatClockTime(deadline)} ngày {formatDate(deadline)}.
          </p>
        )}
      </div>
    </form>
  );
}

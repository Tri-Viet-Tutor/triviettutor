import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTH_LABEL } from "@/features/auth/components/AuthField";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { submitAttendance } from "@/features/portal/api/portalApi";
import { StatusChip } from "@/features/portal/components/StatusChip";
import { portalErrorMessage } from "@/features/portal/data/errors";
import { ATTENDANCE_STATUS } from "@/features/portal/data/labels";
import { PORTAL_BTN_PRIMARY, PORTAL_INPUT } from "@/features/portal/data/ui";
import { portalKeys, useSessionAttendance, useUserId } from "@/features/portal/hooks/usePortalData";
import type { AttendanceRecordInput, AttendanceResponse, AttendanceStatus } from "@/types/api";
import { formatClockTime, formatDate } from "@/utils/date";

const STATUS_ORDER: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

interface Draft {
  status: AttendanceStatus | "";
  note: string;
}

function toDrafts(data: AttendanceResponse): Record<number, Draft> {
  const drafts: Record<number, Draft> = {};
  for (const studentId of data.studentIds) drafts[studentId] = { status: "", note: "" };
  for (const record of data.records) drafts[record.studentId] = { status: record.status, note: record.note ?? "" };
  return drafts;
}

interface AttendanceEditorProps {
  sessionId: number;
  /** Buổi còn ghi được (đã bắt đầu, chưa hoàn tất, chưa quá hạn của người đang ghi) */
  editable: boolean;
  /** Câu giải thích vì sao không ghi được, hiện khi `editable` là false */
  readOnlyNote?: string;
  /** Quản trị ghi điểm danh: có thêm ô lý do và ô xác nhận buổi đã được dạy */
  asAdmin?: boolean;
  /** Tra họ tên học viên theo mã (khu quản trị có); không có thì chỉ hiện mã */
  nameOf?: (studentId: number) => string | undefined;
}

/**
 * Điểm danh cả lớp của một buổi (GET + PUT /sessions/{id}/attendance) — gia sư dạy buổi đó và quản trị dùng chung.
 * Backend chỉ trả mã học viên nên mỗi dòng ghi "Học viên #mã". Gửi một phần cũng được: dòng chưa chọn thì bỏ qua.
 */
export function AttendanceEditor({ sessionId, editable, readOnlyNote, asAdmin = false, nameOf }: AttendanceEditorProps) {
  const studentLabel = (studentId: number) => {
    const name = nameOf?.(studentId);
    return name ? `${name} (#${studentId})` : `Học viên #${studentId}`;
  };
  const userId = useUserId();
  const queryClient = useQueryClient();
  const attendance = useSessionAttendance(sessionId);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [reason, setReason] = useState("");
  const [teachingConfirmed, setTeachingConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);

  const data = attendance.data;
  useEffect(() => {
    if (data) setDrafts(toDrafts(data));
  }, [data]);

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
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  if (attendance.isPending) return <p className="text-[14.5px] text-brand-muted">Đang tải danh sách lớp…</p>;
  if (attendance.isError || !data) {
    return <p className="text-[14.5px] text-brand-muted">{portalErrorMessage(attendance.error, "Không tải được điểm danh của buổi này.")}</p>;
  }
  if (data.studentIds.length === 0) return <p className="text-[14.5px] text-brand-muted">Buổi này chưa có học viên nào trong danh sách.</p>;

  const locked = data.locked || !editable;
  const chosen = Object.entries(drafts).filter(([, draft]) => draft.status !== "");
  const needsReason = asAdmin && teachingConfirmed && reason.trim() === "";

  function setDraft(studentId: number, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [studentId]: { ...current[studentId], ...patch } }));
    setSaved(false);
  }

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
                  {STATUS_ORDER.map((status) => {
                    const selected = draft.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setDraft(studentId, { status })}
                        className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-navy ${
                          selected ? "border-brand-navy bg-brand-navy text-white" : "border-slate-300 bg-white text-brand-ink hover:border-brand-navy"
                        }`}
                      >
                        {ATTENDANCE_STATUS[status].label}
                      </button>
                    );
                  })}
                </div>
              </div>
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

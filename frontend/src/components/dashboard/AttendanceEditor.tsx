import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { displayCode } from "@/utils/classes";
import { AUTH_LABEL, PORTAL_BTN_PRIMARY, PORTAL_INPUT } from "@/constants/classNames";
import { ATTENDANCE_STATUS, ATTENDANCE_STATUS_ORDER } from "@/constants/labels";
import { portalKeys, useSessionAttendance, useUserId } from "@/hooks/usePortalData";
import type { AttendanceRecordInput, AttendanceResponse, AttendanceStatus } from "@/interfaces/dto";
import { submitAttendance } from "@/services/portalService";
import { formatClockTime, formatDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import { studentLabel as formatStudent } from "@/utils/sessions";
import type { AttendanceDraft, AttendanceEditorProps } from "@/interfaces/portal";

// Dựng bản nháp từ dữ liệu máy chủ: mọi học viên đều có dòng, dòng đã điểm danh điền sẵn
function toDrafts(data: AttendanceResponse): Record<number, AttendanceDraft> {
  const drafts: Record<number, AttendanceDraft> = {};
  for (const studentId of data.studentIds) drafts[studentId] = { status: "", note: "" };
  for (const record of data.records) drafts[record.studentId] = { status: record.status, note: record.note ?? "" };
  return drafts;
}

// Điểm danh cả lớp của một buổi (GET + PUT /sessions/{id}/attendance) — gia sư dạy buổi đó và quản trị dùng chung.
// Backend chỉ trả mã học viên nên mỗi dòng ghi "Học viên #mã". Gửi một phần cũng được: dòng chưa chọn thì bỏ qua.
// Nhãn ngắn trên nút chọn (nhãn đầy đủ ở title)
const SHORT_LABEL: Record<AttendanceStatus, string> = { PRESENT: "Có mặt", LATE: "Đi trễ", ABSENT: "Vắng mặt", EXCUSED: "Có phép" };

// Màu từng trạng thái điểm danh (nút chọn và ô xem)
const STATUS_STYLE: Record<AttendanceStatus, { on: string; off: string; soft: string }> = {
  PRESENT: { on: "bg-emerald-600 text-white border-emerald-600", off: "hover:border-emerald-400 hover:text-emerald-700", soft: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  LATE: { on: "bg-amber-500 text-white border-amber-500", off: "hover:border-amber-400 hover:text-amber-700", soft: "bg-amber-50 text-amber-800 ring-amber-200" },
  ABSENT: { on: "bg-red-600 text-white border-red-600", off: "hover:border-red-400 hover:text-red-700", soft: "bg-red-50 text-red-800 ring-red-200" },
  EXCUSED: { on: "bg-brand-navy text-white border-brand-navy", off: "hover:border-brand-navy/50 hover:text-brand-navy", soft: "bg-brand-tint text-brand-navy ring-brand-navy/20" },
};

// Điểm danh cả lớp của một buổi (GET + PUT /sessions/{id}/attendance) — gia sư dạy buổi đó và quản trị dùng chung.
// Danh sách học viên có ảnh, tên (backend trả kèm họ tên), thanh tổng hợp có mặt / trễ / vắng / có phép,
// nút "Tất cả có mặt" và bốn nút trạng thái tô màu cho từng em. Gửi một phần cũng được: dòng chưa chọn thì bỏ qua.
export function AttendanceEditor({ sessionId, editable, readOnlyNote, asAdmin = false, nameOf }: AttendanceEditorProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const attendance = useSessionAttendance(sessionId);
  // Bản nháp theo mã học viên
  const [drafts, setDrafts] = useState<Record<number, AttendanceDraft>>({});
  const [reason, setReason] = useState("");
  const [teachingConfirmed, setTeachingConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);

  const data = attendance.data;
  // Tên học viên theo id (từ danh bạ hoặc từ dữ liệu điểm danh)
  const studentName = (studentId: number) => nameOf?.(studentId) ?? data?.studentNames?.[String(studentId)];
  // Tên hiển thị của học viên, chưa có tên thì hiện mã
  const studentLabel = (studentId: number) => studentName(studentId) ?? formatStudent(studentId, nameOf);
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
  if (data.studentIds.length === 0)
    return (
      <p className="flex items-center gap-2 rounded-xl border border-dashed border-brand-sandLine bg-white px-4 py-5 text-[14px] text-brand-muted">
        <Icon name="group_off" className="text-[20px]" />
        Buổi này chưa có học viên nào trong danh sách.
      </p>
    );

  // Khóa hoặc không còn ghi được thì chỉ hiện danh sách để xem
  const locked = data.locked || !editable;
  // Chỉ gửi những dòng đã chọn trạng thái
  const chosen = Object.entries(drafts).filter(([, draft]) => draft.status !== "");
  // Quản trị xác nhận thay gia sư thì bắt buộc có lý do
  const needsReason = asAdmin && teachingConfirmed && reason.trim() === "";
  const total = data.studentIds.length;
  // Học viên trung tâm đã duyệt nghỉ có phép: miễn điểm danh (backend tự ghi "Nghỉ có phép" khi lưu)
  const excused = new Set(data.excusedStudentIds ?? []);
  // Học viên được trung tâm duyệt nghỉ có phép, miễn điểm danh
  const isExcused = (studentId: number) => excused.has(studentId) && !data.records.some((item) => item.studentId === studentId && item.status !== "EXCUSED");
  // Trạng thái điểm danh đang hiện của một học viên
  const statusOf = (studentId: number): AttendanceStatus | "" =>
    isExcused(studentId)
      ? "EXCUSED"
      : locked
        ? (data.records.find((item) => item.studentId === studentId)?.status ?? "")
        : (drafts[studentId]?.status ?? "");
  // Có mặt / Vắng mặt; Đi trễ, Có phép chỉ hiện khi còn bản ghi cũ
  const counts = (["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[])
    .map((status) => ({ status, count: data.studentIds.filter((studentId) => statusOf(studentId) === status).length }))
    .filter(({ status, count }) => ATTENDANCE_STATUS_ORDER.includes(status) || count > 0);
  const marked = counts.reduce((sum, item) => sum + item.count, 0);

  // Sửa bản nháp của một học viên
  function setDraft(studentId: number, patch: Partial<AttendanceDraft>) {
    setDrafts((current) => ({ ...current, [studentId]: { ...current[studentId], ...patch } }));
    setSaved(false);
  }

  // Đánh dấu có mặt cho những em chưa chọn
  function markRestPresent() {
    setDrafts((current) => {
      const next = { ...current };
      for (const studentId of data!.studentIds)
        if (!next[studentId]?.status && !isExcused(studentId)) next[studentId] = { status: "PRESENT", note: next[studentId]?.note ?? "" };
      return next;
    });
    setSaved(false);
  }

  // Gửi các dòng đã chọn; ghi chú để trống thì không gửi
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

  // Thanh tổng hợp: số đã điểm danh + từng trạng thái, kèm thanh màu theo tỉ lệ
  const summary = (
    <div className="rounded-2xl border border-brand-sandLine bg-white p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-bold text-brand-ink">
          Đã điểm danh <span className="tabular-nums text-brand-navy">{marked}</span>
          <span className="font-semibold text-brand-muted">/{total} học viên</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {counts.map(({ status, count }) => (
            <span key={status} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ${STATUS_STYLE[status].soft}`}>
              <Icon name={ATTENDANCE_STATUS[status].icon} className="text-[14px]" />
              {ATTENDANCE_STATUS[status].label} {count}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-brand-sand" aria-hidden="true">
        {counts.map(({ status, count }) => (
          <span
            key={status}
            style={{ width: `${(count / total) * 100}%` }}
            className={{ PRESENT: "bg-emerald-500", LATE: "bg-amber-400", ABSENT: "bg-red-500", EXCUSED: "bg-brand-navy" }[status]}
          />
        ))}
      </div>
    </div>
  );

  // Ảnh + tên + mã học viên
  const person = (studentId: number) => (
    <span className="flex min-w-0 items-center gap-2.5">
      <UserAvatar userId={studentId} name={studentName(studentId) ?? "Học viên"} size={36} />
      <span className="min-w-0">
        <span id={`attendance-${sessionId}-${studentId}`} className="block truncate text-[14.5px] font-bold text-brand-ink">
          {studentLabel(studentId)}
        </span>
        <span className="block text-[12px] text-brand-muted">{displayCode("student", studentId)}</span>
      </span>
    </span>
  );

  if (locked) {
    return (
      <div className="space-y-3">
        {summary}
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.studentIds.map((studentId) => {
            const record = data.records.find((item) => item.studentId === studentId);
            const shown: AttendanceStatus | null = record?.status ?? (isExcused(studentId) ? "EXCUSED" : null);
            return (
              <li key={studentId} className="rounded-xl border border-brand-sandLine bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  {person(studentId)}
                  {shown ? (
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-bold ring-1 ${STATUS_STYLE[shown].soft}`}>
                      <Icon name={ATTENDANCE_STATUS[shown].icon} className="text-[15px]" />
                      {ATTENDANCE_STATUS[shown].label}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[12.5px] text-brand-muted">Chưa điểm danh</span>
                  )}
                </div>
                {record?.note && <p className="mt-1.5 rounded-lg bg-brand-sand/60 px-2.5 py-1.5 text-[12.5px] text-brand-muted">{record.note}</p>}
              </li>
            );
          })}
        </ul>
        <p className="flex items-center gap-1.5 text-[13px] text-brand-muted">
          <Icon name="lock" className="text-[16px]" />
          {data.locked ? "Điểm danh đã khóa." : readOnlyNote}
        </p>
      </div>
    );
  }

  const deadline = data.editDeadline ? new Date(data.editDeadline) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {summary}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-brand-muted">Chọn trạng thái cho từng học viên.</p>
        {marked < total && (
          <button
            type="button"
            onClick={markRestPresent}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-50 px-3 text-[13px] font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            <Icon name="done_all" className="text-[17px]" />
            Còn lại có mặt hết
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {data.studentIds.map((studentId) => {
          const draft = drafts[studentId] ?? { status: "", note: "" };
          if (isExcused(studentId))
            return (
              <li key={studentId} className="flex flex-col gap-2 rounded-xl border border-brand-navy/15 bg-brand-tint/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                {person(studentId)}
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[12.5px] font-bold text-brand-navy ring-1 ring-brand-navy/20">
                  <Icon name="verified" className="text-[17px]" />
                  Nghỉ có phép - trung tâm đã duyệt, miễn điểm danh
                </span>
              </li>
            );
          return (
            <li
              key={studentId}
              className={`rounded-xl border bg-white px-3 py-2.5 transition-colors ${draft.status ? "border-brand-sandLine" : "border-dashed border-brand-navy/25"}`}
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                {person(studentId)}
                <div role="radiogroup" aria-labelledby={`attendance-${sessionId}-${studentId}`} className="grid grid-cols-2 gap-1.5 sm:flex">
                  {ATTENDANCE_STATUS_ORDER.map((status) => {
                    const selected = draft.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        title={ATTENDANCE_STATUS[status].label}
                        onClick={() => setDraft(studentId, { status })}
                        className={`flex h-9 min-w-[110px] items-center justify-center gap-1 rounded-lg border px-3 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-navy ${
                          selected ? STATUS_STYLE[status].on : `border-brand-sandLine bg-white text-brand-ink ${STATUS_STYLE[status].off}`
                        }`}
                      >
                        <Icon name={ATTENDANCE_STATUS[status].icon} className="text-[16px]" />
                        <span className="whitespace-nowrap">{SHORT_LABEL[status]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {
                // Chỉ hỏi ghi chú khi vắng
              }
              {draft.status !== "" && draft.status !== "PRESENT" && (
                <input
                  type="text"
                  value={draft.note}
                  maxLength={1000}
                  onChange={(event) => setDraft(studentId, { note: event.target.value })}
                  placeholder="Ghi chú (không bắt buộc), ví dụ: báo ốm"
                  aria-label={`Ghi chú cho ${studentLabel(studentId)}`}
                  className={`mt-2 ${PORTAL_INPUT}`}
                />
              )}
            </li>
          );
        })}
      </ul>
      {asAdmin && (
        <div className="space-y-2.5 rounded-xl border border-brand-sandLine bg-white px-3.5 py-3">
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

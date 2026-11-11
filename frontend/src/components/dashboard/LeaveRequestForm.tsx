import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AntMascot } from "@/components/dashboard/AntMascot";
import { AUTH_INPUT, AUTH_LABEL } from "@/constants/classNames";
import { LATE_NOTICE_HOURS } from "@/constants/rules";
import { portalKeys, useUserId } from "@/hooks/usePortalData";
import { submitLeaveRequest } from "@/services/portalService";
import { portalErrorMessage } from "@/utils/errors";
import { isLateNotice, sessionOptionLabel } from "@/utils/sessions";
import type { LeaveRequestFormProps } from "@/interfaces/portal";
import { Select } from "@/components/ui/Select";

// Giới hạn của LeaveRequestInput.reason ở backend
const REASON_MAX = 1000;

// Form gửi đơn xin nghỉ một buổi học (POST /sessions/{id}/leave).
export function LeaveRequestForm({ sessions, initialSessionId, now, role = "student" }: LeaveRequestFormProps) {
  const isTutor = role === "tutor";
  const userId = useUserId();
  const queryClient = useQueryClient();
  // Mã buổi đang chọn (dạng chuỗi cho ô chọn); chỉ chọn sẵn nếu buổi đó còn xin nghỉ được
  const [sessionId, setSessionId] = useState(() =>
    sessions.some((session) => session.sessionId === initialSessionId) ? String(initialSessionId) : "",
  );
  const [reason, setReason] = useState("");
  // Vừa gửi thành công — để hiện thông báo
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: () => submitLeaveRequest(Number(sessionId), { reason: reason.trim() }),
    onSuccess: () => {
      setSent(true);
      setSessionId("");
      setReason("");
      // Danh sách đơn và trạng thái buổi học đều có thể đổi
      void queryClient.invalidateQueries({ queryKey: portalKeys.leaveRequests(userId) });
      void queryClient.invalidateQueries({ queryKey: portalKeys.sessions(userId) });
    },
  });

  const selected = sessions.find((session) => String(session.sessionId) === sessionId);
  const canSubmit = Boolean(selected) && reason.trim().length > 0;

  // Gửi đơn khi đã chọn buổi và có lý do
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSent(false);
    submit.mutate();
  }

  return (
    <section className="aged-paper aged-paper-frame rounded-sm p-6 sm:p-7" aria-labelledby="leave-form-title">
      <div className="flex items-end justify-between gap-3">
        <h2 id="leave-form-title" className="pb-1 text-[18px] font-bold text-brand-navy">
          Gửi đơn xin nghỉ
        </h2>
        <AntMascot variant="pen" className="-mt-2 h-[78px] w-[75px] shrink-0" />
      </div>

      {sessions.length === 0 ? (
        <p className="mt-3 text-[14.5px] leading-relaxed text-brand-muted">
          {isTutor ? "Hiện không có buổi dạy sắp tới nào để xin nghỉ." : "Hiện không có buổi học sắp tới nào để xin nghỉ."}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="leave-session" className={`mb-1.5 ${AUTH_LABEL}`}>
              {isTutor ? "Buổi muốn nghỉ dạy" : "Buổi muốn nghỉ"}
            </label>
            <Select
              id="leave-session"
              required
              value={sessionId}
              onChange={(event) => {
                setSessionId(event.target.value);
                setSent(false);
                submit.reset();
              }}
              className={AUTH_INPUT}
            >
              <option value="">{isTutor ? "Chọn buổi dạy" : "Chọn buổi học"}</option>
              {sessions.map((session) => (
                <option key={session.sessionId} value={session.sessionId}>
                  {sessionOptionLabel(session)}
                </option>
              ))}
            </Select>
            {selected && isLateNotice(selected, now) && (
              <p className="mt-1.5 text-[13.5px] font-medium text-amber-800">
                Buổi này còn chưa tới {LATE_NOTICE_HOURS} giờ nữa là học, đơn sẽ bị ghi là báo trễ.
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor="leave-reason" className={AUTH_LABEL}>
                Lý do
              </label>
              <span className="text-[12.5px] tabular-nums text-brand-muted">
                {reason.length} / {REASON_MAX}
              </span>
            </div>
            <textarea
              id="leave-reason"
              required
              rows={4}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={isTutor ? "Ví dụ: tôi có việc gia đình vào tối hôm đó." : "Ví dụ: em có lịch thi ở trường vào tối hôm đó."}
              className={`${AUTH_INPUT} h-auto resize-y py-2.5 leading-relaxed`}
            />
          </div>

          {sent && <AuthNotice tone="success">Đã gửi đơn xin nghỉ. Trung tâm sẽ duyệt và báo kết quả tại đây.</AuthNotice>}
          {submit.error && <AuthNotice tone="error">{portalErrorMessage(submit.error, "Chưa gửi được đơn. Vui lòng thử lại.")}</AuthNotice>}

          <AuthSubmitButton label="Gửi đơn xin nghỉ" pendingLabel="Đang gửi…" isPending={submit.isPending} disabled={!canSubmit} />

          <p className="text-[13.5px] leading-relaxed text-brand-muted">
            {isTutor
              ? `Báo trước ít nhất ${LATE_NOTICE_HOURS} giờ để trung tâm kịp xếp gia sư dạy thay hoặc buổi học bù.`
              : `Báo trước ít nhất ${LATE_NOTICE_HOURS} giờ thì mới được tính là nghỉ có phép.`}
          </p>
        </form>
      )}
    </section>
  );
}

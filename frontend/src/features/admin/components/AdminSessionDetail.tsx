import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";
import { cancelSession, setMeetingUrl } from "@/features/admin/api/adminApi";
import { AdminAttendancePanel } from "@/features/admin/components/AdminAttendancePanel";
import { ReasonForm } from "@/features/admin/components/ReasonForm";
import { useRefreshAdmin, useUserDirectory } from "@/features/admin/hooks/useAdminData";
import { AUTH_LABEL } from "@/features/auth/components/AuthField";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { portalErrorMessage } from "@/features/portal/data/errors";
import { formatLongDate, formatTimeRange, hasSubstituteTutor, sessionStart } from "@/features/portal/data/sessions";
import { PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_TEXT_LINK } from "@/features/portal/data/ui";
import type { SessionResponse } from "@/types/api";
import { parseIsoDate } from "@/utils/date";

interface AdminSessionDetailProps {
  session: SessionResponse;
  now: Date;
}

/**
 * Chi tiết một buổi học dưới quyền quản trị: thông tin, gia sư, link lớp trực tuyến (PUT …/meeting-url),
 * điểm danh, hủy buổi (POST …/cancel) và lối sang các đơn xin nghỉ của buổi.
 */
export function AdminSessionDetail({ session, now }: AdminSessionDetailProps) {
  const refresh = useRefreshAdmin();
  const { nameOf } = useUserDirectory();
  /** "Hồ Đức Thuận (#3)", hoặc chỉ "#3" khi chưa biết tên */
  const tutorLabel = (tutorId: number) => [nameOf(tutorId), `(#${tutorId})`].filter(Boolean).join(" ");
  const [url, setUrl] = useState(session.meetingUrl ?? "");
  const [cancelOpen, setCancelOpen] = useState(false);

  const saveUrl = useMutation({ mutationFn: () => setMeetingUrl(session.sessionId, url.trim()), onSuccess: () => void refresh() });
  const cancel = useMutation({
    mutationFn: (reason: string) => cancelSession(session.sessionId, { reason }),
    onSuccess: () => {
      setCancelOpen(false);
      void refresh();
    },
  });

  const cancelled = session.status === "CANCELLED";
  const started = sessionStart(session).getTime() <= now.getTime();
  const urlChanged = url.trim() !== (session.meetingUrl ?? "") && url.trim() !== "";

  function handleUrlSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (urlChanged) saveUrl.mutate();
  }

  return (
    <div className="space-y-5 border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-[14.5px] sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 text-brand-muted">Mã buổi</dt>
          <dd className="font-medium text-brand-ink">#{session.sessionId}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 text-brand-muted">Ngày giờ</dt>
          <dd className="font-medium text-brand-ink">
            {formatLongDate(parseIsoDate(session.date))}, {formatTimeRange(session)}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 text-brand-muted">Lớp</dt>
          <dd className="font-medium text-brand-ink">
            #{session.classGroupId}, buổi số {session.sessionNumber}
            {session.originalSessionId !== null && ` (học bù cho buổi #${session.originalSessionId})`}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 text-brand-muted">Gia sư</dt>
          <dd className="font-medium text-brand-ink">
            {session.scheduledTutorId === null ? "Chưa phân công" : tutorLabel(session.scheduledTutorId)}
            {hasSubstituteTutor(session) && session.actualTutorId !== null && (
              <span className="block text-brand-muted">Dạy thay: {tutorLabel(session.actualTutorId)}</span>
            )}
          </dd>
        </div>
      </dl>

      {!cancelled && (
        <form onSubmit={handleUrlSubmit}>
          <label htmlFor={`meeting-url-${session.sessionId}`} className={`mb-1.5 ${AUTH_LABEL}`}>
            Link lớp trực tuyến
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`meeting-url-${session.sessionId}`}
              type="url"
              inputMode="url"
              maxLength={2048}
              placeholder="https://…"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                saveUrl.reset();
              }}
              className={`flex-1 ${PORTAL_INPUT}`}
            />
            <button type="submit" disabled={!urlChanged || saveUrl.isPending} className={PORTAL_BTN_SECONDARY}>
              {saveUrl.isPending ? "Đang lưu…" : "Lưu link"}
            </button>
          </div>
          {saveUrl.isSuccess && !urlChanged && <p className="mt-1.5 text-[13.5px] font-medium text-emerald-700">Đã lưu link lớp học.</p>}
          {saveUrl.error && (
            <div className="mt-2">
              <AuthNotice tone="error">{portalErrorMessage(saveUrl.error, "Chưa lưu được link. Vui lòng thử lại.")}</AuthNotice>
            </div>
          )}
        </form>
      )}

      {!cancelled && session.status !== "PENDING_RESCHEDULE" && session.scheduledTutorId !== null && (
        <section aria-label="Điểm danh">
          <h3 className="mb-2.5 text-[15.5px] font-bold text-brand-navy">Điểm danh</h3>
          {started ? (
            <AdminAttendancePanel session={session} now={now} nameOf={nameOf} />
          ) : (
            <p className="text-[14.5px] text-brand-muted">Buổi học chưa bắt đầu nên chưa điểm danh được.</p>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <Link to={`${ROUTES.adminLeaveRequests}?buoi=${session.sessionId}`} className={`inline-flex items-center gap-1 text-[14px] ${PORTAL_TEXT_LINK}`}>
          <Icon name="event_busy" className="text-[18px]" />
          Đơn xin nghỉ của buổi này
        </Link>
        {!cancelled && session.status !== "COMPLETED" && !cancelOpen && (
          <button
            type="button"
            onClick={() => {
              cancel.reset();
              setCancelOpen(true);
            }}
            className="rounded text-[14px] font-semibold text-red-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            Hủy buổi học
          </button>
        )}
      </div>
      {cancelOpen && (
        <ReasonForm
          id={`cancel-reason-${session.sessionId}`}
          label="Lý do hủy buổi"
          submitLabel="Hủy buổi học"
          danger
          isPending={cancel.isPending}
          error={cancel.error}
          errorFallback="Chưa hủy được buổi học. Vui lòng thử lại."
          onSubmit={(reason) => cancel.mutate(reason)}
          onCancel={() => setCancelOpen(false)}
        />
      )}
    </div>
  );
}

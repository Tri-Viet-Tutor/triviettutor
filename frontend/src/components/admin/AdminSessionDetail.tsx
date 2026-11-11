import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { AdminActualTutorForm } from "@/components/admin/AdminActualTutorForm";
import { AdminAttendancePanel } from "@/components/admin/AdminAttendancePanel";
import { MakeupForm } from "@/components/admin/MakeupForm";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { Icon } from "@/components/ui/Icon";
import { AUTH_LABEL, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_TEXT_LINK } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { useCanOfferMakeup, useRefreshAdmin, useUserDirectory } from "@/hooks/useAdminData";
import { cancelSession, setMeetingUrl } from "@/services/adminService";
import { parseIsoDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import { formatLongDate, formatTimeRange, hasSubstituteTutor, sessionStart } from "@/utils/sessions";
import type { AdminSessionDetailProps } from "@/interfaces/admin";
import { displayCode } from "@/utils/classes";

// Chi tiết một buổi học cho admin: link phòng học, đổi gia sư dạy, hủy buổi, xếp học bù và điểm danh
export function AdminSessionDetail({ session, now }: AdminSessionDetailProps) {
  const refresh = useRefreshAdmin();
  const { nameOf, tutors } = useUserDirectory();

  // Tên gia sư theo id, chưa có tên thì hiện mã gia sư
  const tutorLabel = (tutorId: number) => nameOf(tutorId) ?? `Gia sư ${displayCode("tutor", tutorId)}`;
  const [makeupOpen, setMakeupOpen] = useState(false);
  const [url, setUrl] = useState(session.meetingUrl ?? "");
  const [cancelOpen, setCancelOpen] = useState(false);
  // Form đổi gia sư thực dạy đang mở?
  const [tutorOpen, setTutorOpen] = useState(false);

  const saveUrl = useMutation({ mutationFn: () => setMeetingUrl(session.sessionId, url.trim()), onSuccess: () => void refresh() });
  const cancel = useMutation({
    mutationFn: (reason: string) => cancelSession(session.sessionId, { reason }),
    onSuccess: () => {
      setCancelOpen(false);
      void refresh();
    },
  });

  const cancelled = session.status === "CANCELLED";
  // Buổi đã hủy cần được học bù để lớp đủ buổi; buổi bù bị hủy thì xếp lại bù cho buổi gốc
  const makeupTargetId = session.originalSessionId ?? session.sessionId;
  const canMakeup = useCanOfferMakeup(makeupTargetId, session.classGroupId, cancelled) === true;
  const started = sessionStart(session).getTime() <= now.getTime();
  // Chỉ cho lưu khi link đã đổi và không để trống
  const urlChanged = url.trim() !== (session.meetingUrl ?? "") && url.trim() !== "";

  // Lưu link phòng học khi link có thay đổi
  function handleUrlSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (urlChanged) saveUrl.mutate();
  }

  return (
    <div className="space-y-5 border-t border-brand-sandLine bg-brand-sand/60/70 px-4 py-4 sm:px-5">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-[14.5px] sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 text-brand-muted">Mã buổi</dt>
          <dd className="font-medium text-brand-ink">{displayCode("session", session.sessionId)}</dd>
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
            {displayCode("class", session.classGroupId)}, buổi số {session.sessionNumber}
            {session.originalSessionId !== null && ` (học bù cho buổi ${displayCode("session", session.originalSessionId)})`}
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

      {
        // Điểm danh chỉ có ở buổi chưa hủy, không chờ xếp lại lịch và đã có gia sư
      }
      {!cancelled && session.status !== "PENDING_RESCHEDULE" && session.scheduledTutorId !== null && (
        <section aria-label="Điểm danh">
          <h3 className="mb-2.5 text-[15.5px] font-bold text-brand-navy">Điểm danh</h3>
          {started ? (
            <div className="space-y-3">
              <AdminAttendancePanel session={session} now={now} nameOf={nameOf} />
              {tutorOpen ? (
                <AdminActualTutorForm session={session} tutors={tutors} onDone={() => setTutorOpen(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setTutorOpen(true)}
                  className={`inline-block text-[14px] ${PORTAL_TEXT_LINK}`}
                >
                  <Icon name="swap_horiz" className="text-[18px]" />
                  Đổi gia sư thực dạy
                </button>
              )}
            </div>
          ) : (
            <p className="text-[14.5px] text-brand-muted">Buổi học chưa bắt đầu nên chưa điểm danh được.</p>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <Link
          to={`${ROUTES.adminReschedules}?buoi=${session.sessionId}`}
          className={`inline-flex items-center gap-1 text-[14px] ${PORTAL_TEXT_LINK}`}
        >
          <Icon name="event_busy" className="mr-1 text-[18px]" />
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
        {canMakeup && !makeupOpen && (
          <button type="button" onClick={() => setMakeupOpen(true)} className={PORTAL_BTN_SECONDARY}>
            Xếp buổi bù
          </button>
        )}
      </div>
      {makeupOpen && (
        <MakeupForm
          idPrefix={`session-makeup-${session.sessionId}`}
          sessionId={makeupTargetId}
          note={
            session.originalSessionId === null
              ? "Buổi học bù được tạo cho cả lớp thay cho buổi đã hủy này."
              : `Buổi bù này đã hủy; buổi bù mới sẽ thay cho buổi gốc ${displayCode("session", session.originalSessionId)}.`
          }
          onDone={() => {
            setMakeupOpen(false);
            void refresh();
          }}
          onCancel={() => setMakeupOpen(false)}
        />
      )}
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

import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";
import { AttendanceEditor } from "@/features/portal/components/AttendanceEditor";
import { StatusChip } from "@/features/portal/components/StatusChip";
import {
  attendanceDeadlinePassed,
  canRequestLeave,
  formatLongDate,
  formatTimeRange,
  isRecordable,
  sessionStart,
  teacherOf,
} from "@/features/portal/data/sessions";
import { PORTAL_BTN_SECONDARY } from "@/features/portal/data/ui";
import type { SessionResponse } from "@/types/api";
import { parseIsoDate } from "@/utils/date";

interface TutorSessionDetailProps {
  session: SessionResponse;
  now: Date;
  /** Mã của gia sư đang xem */
  tutorId: number | undefined;
  /** Buổi này đã có đơn xin nghỉ đang chờ duyệt của tôi */
  hasPendingLeave: boolean;
}

/**
 * Chi tiết một buổi dạy: ngày giờ, link lớp trực tuyến, điểm danh cả lớp (chỉ khi tôi là người dạy buổi đó)
 * và lối xin nghỉ dạy.
 */
export function TutorSessionDetail({ session, now, tutorId, hasPendingLeave }: TutorSessionDetailProps) {
  const isTeacher = teacherOf(session) === tutorId;
  const started = sessionStart(session).getTime() <= now.getTime();
  const editable = isRecordable(session, now) && !attendanceDeadlinePassed(session, now);
  const readOnlyNote =
    session.status === "COMPLETED"
      ? "Buổi học đã hoàn tất."
      : attendanceDeadlinePassed(session, now)
        ? "Đã quá 24 giờ sau buổi học nên không sửa được nữa."
        : undefined;

  return (
    <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-[14.5px] sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-brand-muted">Ngày</dt>
          <dd className="font-medium text-brand-ink">{formatLongDate(parseIsoDate(session.date))}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-brand-muted">Giờ dạy</dt>
          <dd className="font-medium text-brand-ink">{formatTimeRange(session)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-brand-muted">Lớp</dt>
          <dd className="font-medium text-brand-ink">
            #{session.classGroupId}, buổi số {session.sessionNumber}
            {session.originalSessionId !== null && " (buổi học bù)"}
          </dd>
        </div>
      </dl>

      {!isTeacher && (
        <p className="mt-3 flex items-center gap-2 text-[14.5px] text-brand-ink">
          <Icon name="swap_horiz" className="text-[18px] text-brand-navy" />
          Buổi này đã có gia sư khác dạy thay bạn.
        </p>
      )}
      {isTeacher && session.scheduledTutorId !== null && session.scheduledTutorId !== tutorId && (
        <p className="mt-3 flex items-center gap-2 text-[14.5px] text-brand-ink">
          <Icon name="swap_horiz" className="text-[18px] text-brand-navy" />
          Bạn dạy thay buổi này.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {session.meetingUrl && session.status !== "CANCELLED" && session.status !== "COMPLETED" && (
          <a
            href={session.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-brand-orange px-4 text-[14px] font-semibold text-brand-navyDeep transition-colors hover:bg-brand-orangeHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            <Icon name="videocam" className="text-[19px]" />
            Vào lớp trực tuyến
          </a>
        )}
        {isTeacher &&
          (hasPendingLeave ? (
            <StatusChip tone="amber" icon="hourglass_top">
              Đơn xin nghỉ đang chờ duyệt
            </StatusChip>
          ) : (
            canRequestLeave(session, now) && (
              <Link to={`${ROUTES.tutorLeave}?buoi=${session.sessionId}`} className={PORTAL_BTN_SECONDARY}>
                Xin nghỉ dạy buổi này
              </Link>
            )
          ))}
      </div>

      {isTeacher && session.status !== "CANCELLED" && session.status !== "PENDING_RESCHEDULE" && (
        <section className="mt-5" aria-label="Điểm danh">
          <h3 className="mb-2.5 text-[15.5px] font-bold text-brand-navy">Điểm danh</h3>
          {started ? (
            <AttendanceEditor sessionId={session.sessionId} editable={editable} readOnlyNote={readOnlyNote} />
          ) : (
            <p className="text-[14.5px] text-brand-muted">Buổi dạy chưa bắt đầu nên chưa điểm danh được.</p>
          )}
        </section>
      )}
    </div>
  );
}

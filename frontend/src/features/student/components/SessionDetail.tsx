import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";
import { StatusChip } from "@/features/portal/components/StatusChip";
import { ATTENDANCE_STATUS } from "@/features/portal/data/labels";
import { canRequestLeave, formatLongDate, formatTimeRange, hasSubstituteTutor, sessionStart } from "@/features/portal/data/sessions";
import { useSessionAttendance } from "@/features/portal/hooks/usePortalData";
import type { SessionResponse } from "@/types/api";
import { formatClockTime, parseIsoDate } from "@/utils/date";

const LINK =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-4 text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

interface SessionDetailProps {
  session: SessionResponse;
  now: Date;
  /** Buổi này đã có đơn xin nghỉ đang chờ duyệt */
  hasPendingLeave: boolean;
}

/**
 * Chi tiết một buổi học: ngày giờ, ghi chú (học bù, dạy thay), điểm danh của tôi
 * (GET /sessions/{id}/attendance, chỉ tải khi buổi đã bắt đầu) và lối xin nghỉ / vào lớp.
 */
export function SessionDetail({ session, now, hasPendingLeave }: SessionDetailProps) {
  const started = sessionStart(session).getTime() <= now.getTime();
  const showAttendance = started && session.status !== "CANCELLED";
  const attendance = useSessionAttendance(session.sessionId, showAttendance);
  const record = attendance.data?.records[0];
  const recordStyle = record ? ATTENDANCE_STATUS[record.status] : null;
  const canJoin = Boolean(session.meetingUrl) && session.status !== "CANCELLED" && session.status !== "COMPLETED";
  const canLeave = canRequestLeave(session, now);

  return (
    <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-[14.5px] sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-brand-muted">Ngày</dt>
          <dd className="font-medium text-brand-ink">{formatLongDate(parseIsoDate(session.date))}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-brand-muted">Giờ học</dt>
          <dd className="font-medium text-brand-ink">{formatTimeRange(session)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-brand-muted">Lớp</dt>
          <dd className="font-medium text-brand-ink">
            #{session.classGroupId}, buổi số {session.sessionNumber}
          </dd>
        </div>
        {showAttendance && (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-brand-muted">Điểm danh</dt>
            <dd className="min-w-0">
              {attendance.isPending && <span className="text-brand-muted">Đang tải…</span>}
              {attendance.isError && <span className="text-brand-muted">Chưa xem được điểm danh của buổi này.</span>}
              {attendance.isSuccess && !record && <span className="text-brand-muted">Gia sư chưa điểm danh.</span>}
              {record && recordStyle && (
                <span className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={recordStyle.tone} icon={recordStyle.icon}>
                    {recordStyle.label}
                  </StatusChip>
                  {record.arrivedAt && <span className="text-brand-muted">tới lớp lúc {formatClockTime(new Date(record.arrivedAt))}</span>}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      {record?.note && <p className="mt-3 text-[14.5px] text-brand-ink">Ghi chú của gia sư: {record.note}</p>}

      {(session.originalSessionId !== null || hasSubstituteTutor(session)) && (
        <ul className="mt-3 space-y-1.5 text-[14.5px] text-brand-ink">
          {session.originalSessionId !== null && (
            <li className="flex items-center gap-2">
              <Icon name="event_repeat" className="text-[18px] text-brand-navy" />
              Đây là buổi học bù.
            </li>
          )}
          {hasSubstituteTutor(session) && (
            <li className="flex items-center gap-2">
              <Icon name="swap_horiz" className="text-[18px] text-brand-navy" />
              Buổi này có gia sư dạy thay.
            </li>
          )}
        </ul>
      )}

      {(canJoin || canLeave || hasPendingLeave) && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {canJoin && session.meetingUrl && (
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${LINK} bg-brand-orange text-brand-navyDeep hover:bg-brand-orangeHover`}
            >
              <Icon name="videocam" className="text-[19px]" />
              Vào lớp trực tuyến
            </a>
          )}
          {hasPendingLeave ? (
            <StatusChip tone="amber" icon="hourglass_top">
              Đơn xin nghỉ đang chờ duyệt
            </StatusChip>
          ) : (
            canLeave && (
              <Link to={`${ROUTES.studentLeave}?buoi=${session.sessionId}`} className={`${LINK} border border-slate-300 bg-white text-brand-navy hover:border-brand-navy`}>
                Xin nghỉ buổi này
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}

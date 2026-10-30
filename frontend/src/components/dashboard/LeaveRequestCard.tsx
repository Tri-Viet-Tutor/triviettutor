import { Link } from "react-router-dom";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { AUTH_TEXT_LINK, PORTAL_CARD } from "@/constants/classNames";
import { LEAVE_RESOLUTION, LEAVE_STATUS } from "@/constants/labels";
import { formatClockTime, formatDate, formatDayMonth, parseIsoDate, weekdayName } from "@/utils/date";
import { formatLongDate, formatTimeRange } from "@/utils/sessions";
import type { LeaveRequestCardProps } from "@/interfaces/portal";
import { displayCode } from "@/utils/classes";

/** Một đơn xin nghỉ: buổi nào, lý do, trạng thái duyệt và cách trung tâm xử lý. */
export function LeaveRequestCard({ request, session, compact = false, scheduleTo }: LeaveRequestCardProps) {
  const status = LEAVE_STATUS[request.status];
  const requestedAt = new Date(request.requestedAt);
  // Có thông tin buổi thì ghi ngày giờ, không thì chỉ ghi mã buổi
  const title = session ? `${formatLongDate(parseIsoDate(session.date))}, ${formatTimeRange(session)}` : `Buổi học ${displayCode("session", request.sessionId)}`;

  // Bản gọn: một dòng ngày giờ + trạng thái
  if (compact) {
    const day = session ? parseIsoDate(session.date) : null;
    const shortTitle = session && day ? `${weekdayName(day)} ${formatDayMonth(day)}, ${session.startTime.slice(0, 5)}` : title;
    return (
      <li className="flex items-center justify-between gap-3 py-2.5">
        <span className="min-w-0 truncate text-[14.5px] font-semibold text-brand-ink">{shortTitle}</span>
        <StatusChip tone={status.tone} icon={status.icon}>
          {status.label}
        </StatusChip>
      </li>
    );
  }

  return (
    <li className={`p-4 sm:p-5 ${PORTAL_CARD}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="text-[16px] font-semibold text-brand-ink">{title}</p>
          {session && (
            <p className="text-[14px] text-brand-muted">
              Lớp {displayCode("class", session.classGroupId)}, buổi {session.sessionNumber}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {request.isLateNotice && <StatusChip tone="slate">Báo trễ</StatusChip>}
          <StatusChip tone={status.tone} icon={status.icon}>
            {status.label}
          </StatusChip>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line break-words text-[14.5px] leading-relaxed text-brand-ink">{request.reason}</p>

      {request.resolution && (
        <p className="mt-3 text-[14.5px] font-medium text-brand-navy">
          {LEAVE_RESOLUTION[request.resolution]}.{" "}
          {request.replacementSessionId !== null && (
            <Link to={`${scheduleTo}?buoi=${request.replacementSessionId}`} className={AUTH_TEXT_LINK}>
              Xem buổi thay thế
            </Link>
          )}
        </p>
      )}
      {request.resolutionReason && <p className="mt-1 text-[14.5px] text-brand-ink">Phản hồi của trung tâm: {request.resolutionReason}</p>}

      <p className="mt-3 text-[13px] text-brand-muted">
        Gửi lúc {formatClockTime(requestedAt)} ngày {formatDate(requestedAt)}
      </p>
    </li>
  );
}

import { Link } from "react-router-dom";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD, PORTAL_TEXT_LINK } from "@/constants/classNames";
import { SESSION_STATUS } from "@/constants/labels";
import { formatDayMonth, parseIsoDate } from "@/utils/date";
import { dayLabel, formatTimeRange } from "@/utils/sessions";
import type { UpcomingListProps } from "@/interfaces/portal";

/** Vài buổi sắp tới ở trang Tổng quan; bấm một buổi để mở nó ở trang lịch. */
export function UpcomingList({ title, sessions, today, scheduleTo, emptyText }: UpcomingListProps) {
  return (
    <section className={`p-5 ${PORTAL_CARD}`} aria-labelledby="upcoming-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="upcoming-title" className="text-[17px] font-bold text-brand-navy">
          {title}
        </h2>
        <Link to={scheduleTo} className={`inline-flex items-center gap-1 text-[14px] ${PORTAL_TEXT_LINK}`}>
          Toàn bộ lịch
          <Icon name="chevron_right" className="text-[18px]" />
        </Link>
      </div>
      {sessions.length === 0 ? (
        <p className="mt-3 text-[14.5px] text-brand-muted">{emptyText}</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {sessions.map((session) => {
            const date = parseIsoDate(session.date);
            const status = SESSION_STATUS[session.status];
            return (
              <li key={session.sessionId}>
                <Link
                  to={`${scheduleTo}?buoi=${session.sessionId}`}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
                >
                  <span className="w-[92px] shrink-0 text-[14.5px] font-semibold text-brand-navy">
                    {dayLabel(date, today)} <span className="tabular-nums">{formatDayMonth(date)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold tabular-nums text-brand-ink">{formatTimeRange(session)}</span>
                    <span className="block truncate text-[13.5px] text-brand-muted">
                      Lớp #{session.classGroupId}, buổi {session.sessionNumber}
                    </span>
                    {session.status !== "SCHEDULED" && (
                      <span className="mt-1 block sm:hidden">
                        <StatusChip tone={status.tone}>{status.label}</StatusChip>
                      </span>
                    )}
                  </span>
                  {/* Chỉ hiện nhãn khi trạng thái khác "Sắp học" */}
                  {session.status !== "SCHEDULED" && (
                    <span className="hidden sm:block">
                      <StatusChip tone={status.tone}>{status.label}</StatusChip>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

import { StatusChip } from "@/components/dashboard/StatusChip";
import { PORTAL_CARD } from "@/constants/classNames";
import { ATTENDANCE_STATUS } from "@/constants/labels";
import type { RecentAttendanceProps } from "@/interfaces/portal";
import { formatDayMonth, parseIsoDate, weekdayName } from "@/utils/date";
import { formatTimeRange } from "@/utils/sessions";

// Điểm danh của tôi ở mấy buổi đã học gần đây nhất.
export function RecentAttendance({ items }: RecentAttendanceProps) {
  return (
    <section className={`p-4 ${PORTAL_CARD}`} aria-labelledby="recent-attendance-title">
      <h2 id="recent-attendance-title" className="text-[16px] font-bold text-brand-navy">
        Điểm danh gần đây
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-[14.5px] text-brand-muted">Chưa có buổi nào đã học.</p>
      ) : (
        <ul className="mt-3 divide-y divide-brand-sandLine">
          {items.map(({ session, record, isPending }) => {
            const style = record ? ATTENDANCE_STATUS[record.status] : null;
            const date = parseIsoDate(session.date);
            return (
              <li key={session.sessionId} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-semibold text-brand-ink">
                    {weekdayName(date)} {formatDayMonth(date)}
                  </span>
                  <span className="block text-[13px] tabular-nums text-brand-muted">{formatTimeRange(session)}</span>
                </span>
                {style ? (
                  <StatusChip tone={style.tone} icon={style.icon}>
                    {style.label}
                  </StatusChip>
                ) : (
                  <span className="text-[13px] text-brand-muted">{isPending ? "Đang tải…" : "Chưa điểm danh"}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

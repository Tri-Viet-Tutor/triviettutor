import { StatusChip } from "@/features/portal/components/StatusChip";
import { ATTENDANCE_STATUS } from "@/features/portal/data/labels";
import { formatTimeRange } from "@/features/portal/data/sessions";
import { PORTAL_CARD } from "@/features/portal/data/ui";
import { type RecentAttendanceItem } from "@/features/portal/hooks/usePortalData";
import { formatDayMonth, parseIsoDate, weekdayName } from "@/utils/date";

interface RecentAttendanceProps {
  /** Điểm danh các buổi đã học gần nhất (useRecentAttendance), mới nhất trước */
  items: RecentAttendanceItem[];
}

/** Điểm danh của tôi ở mấy buổi đã học gần đây nhất. */
export function RecentAttendance({ items }: RecentAttendanceProps) {
  return (
    <section className={`p-5 ${PORTAL_CARD}`} aria-labelledby="recent-attendance-title">
      <h2 id="recent-attendance-title" className="text-[17px] font-bold text-brand-navy">
        Điểm danh gần đây
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-[14.5px] text-brand-muted">Chưa có buổi nào đã học.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {items.map(({ session, record, isPending }) => {
            const style = record ? ATTENDANCE_STATUS[record.status] : null;
            const date = parseIsoDate(session.date);
            return (
              <li key={session.sessionId} className="flex items-center justify-between gap-3 py-2.5">
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

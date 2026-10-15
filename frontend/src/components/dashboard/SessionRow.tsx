import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD } from "@/constants/classNames";
import { SESSION_STATUS } from "@/constants/labels";
import { formatDayMonth, parseIsoDate } from "@/utils/date";
import { dayLabel, formatTimeRange } from "@/utils/sessions";
import type { SessionRowProps } from "@/interfaces/portal";

/** Một buổi trong danh sách lịch học / lịch dạy; bấm để mở phần chi tiết (children) ngay bên dưới. */
export function SessionRow({ session, open, onToggle, hasPendingLeave, badge, children }: SessionRowProps) {
  const date = parseIsoDate(session.date);
  const status = SESSION_STATUS[session.status];
  const detailId = `session-detail-${session.sessionId}`;

  return (
    <li id={`session-${session.sessionId}`} className={`scroll-mt-24 overflow-hidden ${PORTAL_CARD} ${open ? "border-brand-navy/50" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-navy sm:gap-4 sm:px-5"
      >
        <span className="w-[68px] shrink-0">
          <span className="block text-[13px] font-medium text-brand-muted">{dayLabel(date)}</span>
          <span className="block text-[17px] font-bold tabular-nums text-brand-navy">{formatDayMonth(date)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-[16px] font-semibold tabular-nums text-brand-ink ${session.status === "CANCELLED" ? "line-through decoration-slate-400" : ""}`}
          >
            {formatTimeRange(session)}
          </span>
          <span className="block truncate text-[14px] text-brand-muted">
            Lớp #{session.classGroupId}, buổi {session.sessionNumber}
            {session.originalSessionId !== null && " (học bù)"}
          </span>
          {/* Điện thoại: nhãn trạng thái nằm dưới để không chèn mất giờ học */}
          <span className="mt-1.5 flex flex-wrap gap-1.5 sm:hidden">
            <StatusChip tone={status.tone}>{status.label}</StatusChip>
            {hasPendingLeave && <StatusChip tone="amber">Đã xin nghỉ</StatusChip>}
            {badge}
          </span>
        </span>
        <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">
          {badge}
          {hasPendingLeave && (
            <StatusChip tone="amber" icon="hourglass_top">
              Đã xin nghỉ
            </StatusChip>
          )}
          <StatusChip tone={status.tone} icon={status.icon}>
            {status.label}
          </StatusChip>
        </span>
        <Icon
          name="expand_more"
          className={`shrink-0 text-[22px] text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div id={detailId}>{children}</div>}
    </li>
  );
}

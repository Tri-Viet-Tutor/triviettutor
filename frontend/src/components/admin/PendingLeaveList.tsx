import { Link } from "react-router-dom";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD, PORTAL_MORE_LINK } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { useUserDirectory } from "@/hooks/useAdminData";
import type { Role } from "@/interfaces/api";
import { formatClockTime, formatDate } from "@/utils/date";
import type { PendingLeaveListProps } from "@/interfaces/admin";

/** Mấy đơn xin nghỉ mới nhất đang chờ duyệt, ở trang Tổng quan của quản trị; bấm để sang trang xử lý. */
export function PendingLeaveList({ requests, isError }: PendingLeaveListProps) {
  const { label } = useUserDirectory();
  return (
    <section className={`p-4 ${PORTAL_CARD}`} aria-labelledby="pending-leave-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pending-leave-title" className="text-[16px] font-bold text-brand-navy">
          Đơn xin nghỉ chờ duyệt
        </h2>
        <Link to={ROUTES.adminReschedules} className={`inline-flex items-center gap-1 text-[14px] ${PORTAL_MORE_LINK}`}>
          Xử lý đơn
          <Icon name="chevron_right" className="text-[18px]" />
        </Link>
      </div>
      {isError ? (
        <p className="mt-3 text-[14.5px] text-brand-muted">Không tải được đơn xin nghỉ.</p>
      ) : !requests ? (
        <p className="mt-3 text-[14.5px] text-brand-muted">Đang tải…</p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-[14.5px] text-brand-muted">Không có đơn nào đang chờ.</p>
      ) : (
        <ul className="mt-2 divide-y divide-brand-sandLine">
          {requests.map((request) => {
            const requestedAt = new Date(request.requestedAt);
            return (
              <li key={request.leaveRequestId}>
                <Link
                  to={`${ROUTES.adminReschedules}?buoi=${request.sessionId}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-brand-sand/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-brand-ink">
                      {label(request.requesterRole as Role, request.requesterId)}
                    </span>
                    <span className="block text-[13.5px] text-brand-muted">
                      Buổi #{request.sessionId} · gửi {formatClockTime(requestedAt)} ngày {formatDate(requestedAt)}
                    </span>
                  </span>
                  {request.isLateNotice && <StatusChip tone="slate">Báo trễ</StatusChip>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

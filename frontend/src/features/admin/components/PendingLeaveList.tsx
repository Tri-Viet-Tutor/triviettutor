import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";
import { useUserDirectory } from "@/features/admin/hooks/useAdminData";
import { StatusChip } from "@/features/portal/components/StatusChip";
import { PORTAL_CARD } from "@/features/portal/data/ui";
import type { LeaveRequestResponse, Role } from "@/types/api";
import { formatClockTime, formatDate } from "@/utils/date";

interface PendingLeaveListProps {
  /** Các đơn đang chờ, mới nhất trước; undefined khi chưa tải xong */
  requests: LeaveRequestResponse[] | undefined;
  isError: boolean;
}

/** Mấy đơn xin nghỉ mới nhất đang chờ duyệt, ở trang Tổng quan của quản trị; bấm để sang trang xử lý. */
export function PendingLeaveList({ requests, isError }: PendingLeaveListProps) {
  const { label } = useUserDirectory();
  return (
    <section className={`p-5 ${PORTAL_CARD}`} aria-labelledby="pending-leave-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pending-leave-title" className="text-[17px] font-bold text-brand-navy">
          Đơn xin nghỉ chờ duyệt
        </h2>
        <Link
          to={ROUTES.adminLeaveRequests}
          className="inline-flex items-center gap-1 rounded text-[14px] font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
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
        <ul className="mt-2 divide-y divide-slate-100">
          {requests.map((request) => {
            const requestedAt = new Date(request.requestedAt);
            return (
              <li key={request.leaveRequestId}>
                <Link
                  to={`${ROUTES.adminLeaveRequests}?buoi=${request.sessionId}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-brand-ink">{label(request.requesterRole as Role, request.requesterId)}</span>
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

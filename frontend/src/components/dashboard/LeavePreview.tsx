import { Link } from "react-router-dom";
import { LeaveRequestCard } from "@/components/dashboard/LeaveRequestCard";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD, PORTAL_TEXT_LINK } from "@/constants/classNames";
import type { LeavePreviewProps } from "@/interfaces/portal";

/** Số đơn hiện ở trang Tổng quan */
const PREVIEW_COUNT = 3;

/** Mấy đơn xin nghỉ mới nhất của tôi, ở cột phải trang Tổng quan. */
export function LeavePreview({ requests, isError, sessions, leaveTo, scheduleTo }: LeavePreviewProps) {
  return (
    <section className={`p-5 ${PORTAL_CARD}`} aria-labelledby="home-leave-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-leave-title" className="text-[17px] font-bold text-brand-navy">
          Đơn xin nghỉ
        </h2>
        <Link to={leaveTo} className={`inline-flex items-center gap-1 text-[14px] ${PORTAL_TEXT_LINK}`}>
          Xem và gửi đơn
          <Icon name="chevron_right" className="text-[18px]" />
        </Link>
      </div>
      {isError ? (
        <p className="mt-3 text-[14.5px] text-brand-muted">Không tải được đơn xin nghỉ.</p>
      ) : !requests ? (
        <p className="mt-3 text-[14.5px] text-brand-muted">Đang tải…</p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-[14.5px] text-brand-muted">Bạn chưa gửi đơn nào.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {requests.slice(0, PREVIEW_COUNT).map((request) => (
            <LeaveRequestCard
              key={request.leaveRequestId}
              request={request}
              session={sessions.find((session) => session.sessionId === request.sessionId)}
              scheduleTo={scheduleTo}
              compact
            />
          ))}
        </ul>
      )}
    </section>
  );
}

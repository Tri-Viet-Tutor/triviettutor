import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { LeaveRequestCard } from "@/features/portal/components/LeaveRequestCard";
import { PORTAL_CARD } from "@/features/portal/data/ui";
import type { LeaveRequestResponse, SessionResponse } from "@/types/api";

/** Số đơn hiện ở trang Tổng quan */
const PREVIEW_COUNT = 3;

interface LeavePreviewProps {
  /** Các đơn mới nhất; undefined khi chưa tải xong */
  requests: LeaveRequestResponse[] | undefined;
  isError: boolean;
  sessions: SessionResponse[];
  /** Trang xin nghỉ và trang lịch của khu */
  leaveTo: string;
  scheduleTo: string;
}

/** Mấy đơn xin nghỉ mới nhất của tôi, ở cột phải trang Tổng quan. */
export function LeavePreview({ requests, isError, sessions, leaveTo, scheduleTo }: LeavePreviewProps) {
  return (
    <section className={`p-5 ${PORTAL_CARD}`} aria-labelledby="home-leave-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-leave-title" className="text-[17px] font-bold text-brand-navy">
          Đơn xin nghỉ
        </h2>
        <Link
          to={leaveTo}
          className="inline-flex items-center gap-1 rounded text-[14px] font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
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

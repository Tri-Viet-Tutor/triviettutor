import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminLeaveCard } from "@/components/admin/AdminLeaveCard";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { Pager } from "@/components/dashboard/Pager";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { PORTAL_TEXT_LINK } from "@/constants/classNames";
import { LEAVE_STATUS } from "@/constants/labels";
import { ROUTES } from "@/constants/routes";
import { useAdminLeaveRequests } from "@/hooks/useAdminData";
import type { LeaveRequestStatus } from "@/interfaces/api";
import { displayCode } from "@/utils/classes";

/** Số đơn mỗi trang */
const PAGE_SIZE = 10;

/** Thẻ lọc theo trạng thái — "Chờ duyệt" đứng đầu vì là việc cần làm */
const STATUS_TABS: { value: LeaveRequestStatus | ""; label: string }[] = [
  { value: "PENDING", label: LEAVE_STATUS.PENDING.label },
  { value: "APPROVED", label: LEAVE_STATUS.APPROVED.label },
  { value: "REJECTED", label: LEAVE_STATUS.REJECTED.label },
  { value: "", label: "Tất cả" },
];

/**
 * Trang Đơn xin nghỉ của quản trị (GET /admin/leave-requests): mặc định xem các đơn đang chờ, mới nhất trước.
 * Mỗi đơn có sẵn các cách xử lý (xem AdminLeaveCard). Mở kèm ?buoi=<mã buổi> thì chỉ hiện đơn của buổi đó.
 */
export function AdminReschedulesPage() {
  const [params] = useSearchParams();
  // Xem đơn của riêng một buổi qua ?buoi=<mã buổi>
  const sessionId = Number(params.get("buoi")) || null;
  // Xem đơn của riêng một buổi thì hiện mọi trạng thái
  const [status, setStatus] = useState<LeaveRequestStatus | "">(sessionId ? "" : "PENDING");
  const [page, setPage] = useState(0);

  const query = useAdminLeaveRequests({ ...(status ? { status } : {}), ...(sessionId ? { sessionId } : {}), page, size: PAGE_SIZE });
  const list = query.data;

  return (
    <>
      <PortalPageHeader
        icon="event_busy"
        title="Đơn xin nghỉ"
        description="Duyệt đơn và xếp buổi học bù, gia sư dạy thay hoặc hủy buổi."
        action={
          <FilterTabs
            label="Lọc đơn theo trạng thái"
            tabs={STATUS_TABS}
            value={status}
            onChange={(next) => {
              setStatus(next);
              setPage(0);
            }}
          />
        }
      />

      {sessionId !== null && (
        <p className="mb-4 text-[14.5px] text-brand-muted">
          Đang xem đơn của buổi học {displayCode("session", sessionId)}.{" "}
          <Link to={ROUTES.adminReschedules} className={PORTAL_TEXT_LINK}>
            Xem đơn của mọi buổi
          </Link>
        </p>
      )}

      {query.isPending ? (
        <PortalLoading label="Đang tải đơn xin nghỉ" />
      ) : query.isError || !list ? (
        <PortalError message="Không tải được đơn xin nghỉ." onRetry={() => void query.refetch()} />
      ) : list.content.length === 0 ? (
        <PortalEmpty
          icon="inbox"
          title={status === "PENDING" ? "Không có đơn nào đang chờ duyệt." : "Không có đơn nào."}
          description={status === "PENDING" ? "Đơn mới của học viên và gia sư sẽ hiện ở đây." : undefined}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {list.content.map((request) => (
              <AdminLeaveCard key={request.leaveRequestId} request={request} />
            ))}
          </ul>
          <Pager page={page} totalPages={list.totalPages} onChange={setPage} label="Phân trang đơn xin nghỉ" />
        </>
      )}
    </>
  );
}

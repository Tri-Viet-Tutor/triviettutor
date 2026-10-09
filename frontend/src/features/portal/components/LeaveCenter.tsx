import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FilterTabs } from "@/features/portal/components/FilterTabs";
import { LeaveRequestCard } from "@/features/portal/components/LeaveRequestCard";
import { LeaveRequestForm } from "@/features/portal/components/LeaveRequestForm";
import { Pager } from "@/features/portal/components/Pager";
import { PortalPageHeader } from "@/features/portal/components/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/features/portal/components/PortalState";
import { LEAVE_STATUS } from "@/features/portal/data/labels";
import { canRequestLeave, pendingLeaveOf, splitSessions } from "@/features/portal/data/sessions";
import { useMyLeaveRequests, useMySessions } from "@/features/portal/hooks/usePortalData";
import { useNow } from "@/hooks/useNow";
import type { LeaveRequestStatus, SessionResponse } from "@/types/api";

const PAGE_SIZE = 10;

const FILTERS: { value: LeaveRequestStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: LEAVE_STATUS.PENDING.label },
  { value: "APPROVED", label: LEAVE_STATUS.APPROVED.label },
  { value: "REJECTED", label: LEAVE_STATUS.REJECTED.label },
];

interface LeaveCenterProps {
  /** Học viên xin nghỉ học, gia sư xin nghỉ dạy */
  role: "student" | "tutor";
  /** Trang lịch của khu, để dẫn tới buổi thay thế */
  scheduleTo: string;
  /** Lọc thêm các buổi được phép xin nghỉ (gia sư: chỉ buổi mình dạy) */
  isEligible?: (session: SessionResponse) => boolean;
}

/**
 * Trang Xin nghỉ dùng chung cho học viên và gia sư: gửi đơn cho một buổi sắp tới và theo dõi các đơn đã gửi.
 * Mở kèm ?buoi=<mã buổi> thì buổi đó được chọn sẵn trong form.
 */
export function LeaveCenter({ role, scheduleTo, isEligible }: LeaveCenterProps) {
  const now = useNow();
  const [searchParams] = useSearchParams();
  const initialSessionId = Number(searchParams.get("buoi")) || undefined;

  const [status, setStatus] = useState<LeaveRequestStatus | "">("");
  const [page, setPage] = useState(0);

  const sessionsQuery = useMySessions();
  const listQuery = useMyLeaveRequests({ status: status || undefined, page, size: PAGE_SIZE });
  // Đơn đang chờ: để không cho gửi hai đơn cho cùng một buổi
  const pendingQuery = useMyLeaveRequests({ status: "PENDING", page: 0, size: 100 });

  const sessions = sessionsQuery.data ?? [];
  const pending = pendingQuery.data?.content ?? [];
  const eligible = splitSessions(sessions, now).upcoming.filter(
    (session) => canRequestLeave(session, now) && !pendingLeaveOf(session.sessionId, pending) && (isEligible?.(session) ?? true),
  );
  const list = listQuery.data;

  return (
    <>
      <PortalPageHeader title="Xin nghỉ" />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:sticky lg:top-24 lg:col-span-5">
          {sessionsQuery.isPending ? (
            <PortalLoading label="Đang tải buổi" rows={2} />
          ) : sessionsQuery.isError ? (
            <PortalError message="Không tải được danh sách buổi." onRetry={() => void sessionsQuery.refetch()} />
          ) : (
            // key: tải xong danh sách buổi rồi mới dựng form, để buổi chọn sẵn có trong danh sách
            <LeaveRequestForm key={sessions.length} sessions={eligible} initialSessionId={initialSessionId} now={now} role={role} />
          )}
        </div>

        <section className="lg:col-span-7" aria-labelledby="leave-list-title">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="leave-list-title" className="text-[18px] font-bold text-brand-navy">
              Đơn đã gửi
            </h2>
            <FilterTabs
              label="Lọc đơn theo trạng thái"
              tabs={FILTERS}
              value={status}
              onChange={(next) => {
                setStatus(next);
                setPage(0);
              }}
            />
          </div>

          {listQuery.isPending ? (
            <PortalLoading label="Đang tải đơn xin nghỉ" />
          ) : listQuery.isError || !list ? (
            <PortalError message="Không tải được đơn xin nghỉ." onRetry={() => void listQuery.refetch()} />
          ) : list.content.length === 0 ? (
            <PortalEmpty
              icon="inbox"
              title={status ? "Không có đơn nào ở trạng thái này" : "Bạn chưa gửi đơn xin nghỉ nào"}
            />
          ) : (
            <>
              <ul className="space-y-3">
                {list.content.map((request) => (
                  <LeaveRequestCard
                    key={request.leaveRequestId}
                    request={request}
                    session={sessions.find((session) => session.sessionId === request.sessionId)}
                    scheduleTo={scheduleTo}
                  />
                ))}
              </ul>
              <Pager page={page} totalPages={list.totalPages} onChange={setPage} label="Phân trang đơn xin nghỉ" />
            </>
          )}
        </section>
      </div>
    </>
  );
}

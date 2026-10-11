import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { AdminSessionDetail } from "@/features/admin/components/AdminSessionDetail";
import { SessionFilters, type SessionFilterValues } from "@/features/admin/components/SessionFilters";
import { useAdminSession, useAdminSessions, useUserDirectory } from "@/features/admin/hooks/useAdminData";
import { Pager } from "@/features/portal/components/Pager";
import { PortalPageHeader } from "@/features/portal/components/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/features/portal/components/PortalState";
import { SessionRow } from "@/features/portal/components/SessionRow";
import { StatusChip } from "@/features/portal/components/StatusChip";
import { SESSION_STATUS } from "@/features/portal/data/labels";
import { PORTAL_TEXT_LINK } from "@/features/portal/data/ui";
import { useNow } from "@/hooks/useNow";
import type { SessionResponse, SessionStatus } from "@/types/api";
import { startOfToday, toIsoDate } from "@/utils/date";

const PAGE_SIZE = 20;

/* Tên tham số trên thanh địa chỉ — để các trang khác dẫn thẳng tới một bộ lọc hoặc một buổi */
const PARAM = { from: "tu", to: "den", status: "trangthai", classId: "lop", tutorId: "giasu", page: "trang", session: "buoi" } as const;

/** Nhãn phụ của một buổi trong khu quản trị: chưa có gia sư, điểm danh cần xem lại */
function sessionBadge(session: SessionResponse) {
  if (session.scheduledTutorId === null) return <StatusChip tone="amber">Chưa có gia sư</StatusChip>;
  if (session.attendanceNeedsReview) {
    return (
      <StatusChip tone="amber" icon="fact_check">
        Cần xem điểm danh
      </StatusChip>
    );
  }
  return null;
}

/**
 * Trang Buổi học của quản trị (GET /admin/sessions): lọc theo ngày, trạng thái, gia sư, lớp;
 * bấm một buổi để gắn link lớp, điểm danh, hủy buổi. Bộ lọc nằm trên thanh địa chỉ;
 * mở kèm ?buoi=<mã buổi> thì buổi đó hiện sẵn ở đầu trang (GET /sessions/{id}).
 * Mặc định xem từ hôm nay trở đi.
 */
export function AdminSessionsPage() {
  const now = useNow();
  const { tutors } = useUserDirectory();
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<number | null>(null);

  const status = params.get(PARAM.status) ?? "";
  const filters: SessionFilterValues = {
    // Chưa có tham số "tu" thì xem từ hôm nay; "tu=" (rỗng) là xem cả các buổi đã qua
    from: params.get(PARAM.from) ?? toIsoDate(startOfToday()),
    to: params.get(PARAM.to) ?? "",
    status: status in SESSION_STATUS ? (status as SessionStatus) : "",
    classId: params.get(PARAM.classId) ?? "",
    tutorId: params.get(PARAM.tutorId) ?? "",
  };
  const page = Math.max(0, Number(params.get(PARAM.page)) || 0);
  const linkedId = Number(params.get(PARAM.session)) || null;

  const listQuery = useAdminSessions({
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.classId ? { classGroupId: Number(filters.classId) } : {}),
    ...(filters.tutorId ? { tutorId: Number(filters.tutorId) } : {}),
    page,
    size: PAGE_SIZE,
  });
  const linkedQuery = useAdminSession(linkedId);
  const list = listQuery.data;

  // Buổi được dẫn tới từ trang khác thì mở sẵn
  useEffect(() => {
    if (linkedId) setOpenId(linkedId);
  }, [linkedId]);

  function setParam(next: URLSearchParams, key: string, value: string, keepEmpty = false) {
    if (value || keepEmpty) next.set(key, value);
    else next.delete(key);
  }

  function changeFilters(patch: Partial<SessionFilterValues>) {
    const merged = { ...filters, ...patch };
    const next = new URLSearchParams();
    setParam(next, PARAM.from, merged.from, true);
    setParam(next, PARAM.to, merged.to);
    setParam(next, PARAM.status, merged.status);
    setParam(next, PARAM.classId, merged.classId);
    setParam(next, PARAM.tutorId, merged.tutorId);
    setParams(next, { replace: true });
    setOpenId(null);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(params);
    next.delete(PARAM.session);
    setParam(next, PARAM.page, nextPage > 0 ? String(nextPage) : "");
    setParams(next);
    setOpenId(null);
    window.scrollTo({ top: 0 });
  }

  const toggle = (sessionId: number) => setOpenId((current) => (current === sessionId ? null : sessionId));
  const renderRow = (session: SessionResponse) => {
    const open = openId === session.sessionId;
    return (
      <SessionRow key={session.sessionId} session={session} open={open} onToggle={() => toggle(session.sessionId)} hasPendingLeave={false} badge={sessionBadge(session)}>
        {open && <AdminSessionDetail session={session} now={now} />}
      </SessionRow>
    );
  };

  return (
    <>
      <PortalPageHeader title="Buổi học" />

      {linkedId !== null && (
        <section aria-label="Buổi đang xem" className="mb-6">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-brand-muted">Buổi #{linkedId}</h2>
            <Link to={ROUTES.adminSessions} className={`text-[14px] ${PORTAL_TEXT_LINK}`}>
              Xem tất cả buổi học
            </Link>
          </div>
          {linkedQuery.isPending ? (
            <PortalLoading label="Đang tải buổi học" rows={1} />
          ) : linkedQuery.isError || !linkedQuery.data ? (
            <PortalError message={`Không tìm thấy buổi học #${linkedId}.`} onRetry={() => void linkedQuery.refetch()} />
          ) : (
            <ul>{renderRow(linkedQuery.data)}</ul>
          )}
        </section>
      )}

      <SessionFilters values={filters} tutors={tutors} onChange={changeFilters} onReset={() => changeFilters({ from: toIsoDate(startOfToday()), to: "", status: "", classId: "", tutorId: "" })} />

      <div className="mt-5">
        {listQuery.isPending ? (
          <PortalLoading label="Đang tải buổi học" rows={5} />
        ) : listQuery.isError || !list ? (
          <PortalError message="Không tải được danh sách buổi học." onRetry={() => void listQuery.refetch()} />
        ) : list.content.length === 0 ? (
          <PortalEmpty icon="calendar_month" title="Không có buổi học nào khớp bộ lọc" description="Thử nới khoảng ngày hoặc bỏ bớt điều kiện lọc." />
        ) : (
          <>
            <p className="mb-2.5 text-[14px] text-brand-muted">
              <span className="font-semibold tabular-nums text-brand-ink">{list.totalElements}</span> buổi học
            </p>
            <ul className="space-y-2.5">{list.content.filter((session) => session.sessionId !== linkedId).map(renderRow)}</ul>
            <Pager page={page} totalPages={list.totalPages} onChange={changePage} label="Phân trang buổi học" />
          </>
        )}
      </div>
    </>
  );
}

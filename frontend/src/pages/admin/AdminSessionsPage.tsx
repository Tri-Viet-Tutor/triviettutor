import { Fragment, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { AdminSessionDetail } from "@/components/admin/AdminSessionDetail";
import { SessionFilters } from "@/components/admin/SessionFilters";
import type { SessionFilterValues } from "@/interfaces/admin";
import { useAdminSession, useAdminSessions, useUserDirectory } from "@/hooks/useAdminData";
import { Pager } from "@/components/dashboard/Pager";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { SESSION_STATUS } from "@/constants/labels";
import { PORTAL_TEXT_LINK } from "@/constants/classNames";
import { useNow } from "@/hooks/useNow";
import type { SessionResponse, SessionStatus } from "@/interfaces/dto";
import { formatDate, parseIsoDate, startOfToday, toIsoDate, weekdayName } from "@/utils/date";
import { displayCode } from "@/utils/classes";

// Số buổi mỗi trang
const PAGE_SIZE = 20;

// Tên tham số trên thanh địa chỉ — để các trang khác dẫn thẳng tới một bộ lọc hoặc một buổi
const PARAM = { from: "tu", to: "den", status: "trangthai", classId: "lop", tutorId: "giasu", page: "trang", session: "buoi" } as const;

// Nhãn phụ của một buổi trong khu quản trị: chưa có gia sư, điểm danh cần xem lại
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

// Trang Buổi học của quản trị (GET /admin/sessions): lọc theo ngày, trạng thái, gia sư, lớp;
// bấm một buổi để gắn link lớp, điểm danh, hủy buổi. Bộ lọc nằm trên thanh địa chỉ;
// mở kèm ?buoi=<mã buổi> thì buổi đó hiện sẵn ở đầu trang (GET /sessions/{id}).
// Mặc định xem từ hôm nay trở đi.
export function AdminSessionsPage() {
  const now = useNow();
  const { tutors, nameOf } = useUserDirectory();
  const [params, setParams] = useSearchParams();
  // Buổi đang mở chi tiết
  const [openId, setOpenId] = useState<number | null>(null);

  // Đọc bộ lọc từ thanh địa chỉ (trạng thái lạ thì bỏ qua)
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

  // Ghi một tham số; giá trị rỗng thì xóa (trừ khi `keepEmpty`)
  function setParam(next: URLSearchParams, key: string, value: string, keepEmpty = false) {
    if (value || keepEmpty) next.set(key, value);
    else next.delete(key);
  }

  // Đổi bộ lọc: viết lại thanh địa chỉ, về trang đầu, đóng buổi đang mở
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

  // Sang trang khác: bỏ buổi đang dẫn tới, cuộn lên đầu
  function changePage(nextPage: number) {
    const next = new URLSearchParams(params);
    next.delete(PARAM.session);
    setParam(next, PARAM.page, nextPage > 0 ? String(nextPage) : "");
    setParams(next);
    setOpenId(null);
    window.scrollTo({ top: 0 });
  }

  // Mở / đóng chi tiết một buổi
  const toggle = (sessionId: number) => setOpenId((current) => (current === sessionId ? null : sessionId));
  // Một dòng của bảng buổi học, mở ra là hiện phần xử lý của quản trị ngay dưới dòng đó
  const renderRow = (session: SessionResponse) => {
    const open = openId === session.sessionId;
    const date = parseIsoDate(session.date);
    const status = SESSION_STATUS[session.status];
    return (
      <Fragment key={session.sessionId}>
        <tr
          id={`session-${session.sessionId}`}
          className={`scroll-mt-24 border-t border-brand-sandLine ${open ? "bg-brand-tint/50" : "hover:bg-brand-sand/50"}`}
        >
          <td className="h-14 px-4 py-2 align-middle">
            <span className="text-[14px] font-bold tabular-nums text-brand-navy">{displayCode("session", session.sessionId)}</span>
          </td>
          <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
            <span className="block text-[12.5px] leading-tight text-brand-muted">{weekdayName(date)}</span>
            <span className="block text-[15px] font-bold leading-tight tabular-nums text-brand-navy">{formatDate(date)}</span>
          </td>
          <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
            <span className={`text-[14.5px] font-semibold tabular-nums text-brand-ink ${session.status === "CANCELLED" ? "line-through" : ""}`}>
              {session.startTime.slice(0, 5)} - {session.endTime.slice(0, 5)}
            </span>
          </td>
          <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
            <span className="block text-[14.5px] font-semibold leading-tight text-brand-ink">{displayCode("class", session.classGroupId)}</span>
            <span className="block text-[13px] leading-tight text-brand-muted">Buổi {session.sessionNumber}</span>
          </td>
          <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
            {session.scheduledTutorId === null ? (
              <span className="text-[14px] text-brand-muted">Chưa phân công</span>
            ) : (
              <span className="block truncate text-[14px] text-brand-ink">
                {nameOf(session.actualTutorId ?? session.scheduledTutorId) ?? "Gia sư"}
              </span>
            )}
          </td>
          <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
            <span className="flex flex-wrap items-center gap-1.5">
              {status && (
                <StatusChip tone={status.tone} icon={status.icon}>
                  {status.label}
                </StatusChip>
              )}
              {sessionBadge(session)}
            </span>
          </td>
          <td className="border-l border-brand-sandLine px-2 py-2 text-center align-middle">
            <button
              type="button"
              onClick={() => toggle(session.sessionId)}
              aria-expanded={open}
              aria-label={`${open ? "Đóng" : "Mở"} chi tiết buổi ${displayCode("session", session.sessionId)}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-slate-400 hover:bg-brand-sand hover:text-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
            >
              <Icon name="expand_more" className={`text-[21px] transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          </td>
        </tr>
        {open && (
          <tr className="border-t border-brand-sandLine bg-brand-tint/30">
            <td colSpan={7} className="px-4 py-3">
              <AdminSessionDetail session={session} now={now} />
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  return (
    <>
      <PortalPageHeader
        icon="calendar_month"
        title="Buổi học"
        description="Tra cứu mọi buổi học, điểm danh, link lớp và xử lý hủy / học bù / dạy thay."
      />

      {linkedId !== null && (
        <section aria-label="Buổi đang xem" className="mb-6">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-brand-muted">Buổi {displayCode("session", linkedId)}</h2>
            <Link to={ROUTES.adminSessions} className={`text-[14px] ${PORTAL_TEXT_LINK}`}>
              Xem tất cả buổi học
            </Link>
          </div>
          {linkedQuery.isPending ? (
            <PortalLoading label="Đang tải buổi học" rows={1} />
          ) : linkedQuery.isError || !linkedQuery.data ? (
            <PortalError message={`Không tìm thấy buổi học ${displayCode("session", linkedId)}.`} onRetry={() => void linkedQuery.refetch()} />
          ) : (
            <div className="overflow-x-auto rounded-sm border border-brand-sandLine bg-white">
              <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
                <colgroup>
                  <col className="w-[10%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[15%]" />
                  <col className="w-[19%]" />
                  <col className="w-[23%]" />
                  <col className="w-[5%]" />
                </colgroup>
                <tbody>{renderRow(linkedQuery.data)}</tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <SessionFilters
        values={filters}
        tutors={tutors}
        onChange={changeFilters}
        onReset={() => changeFilters({ from: toIsoDate(startOfToday()), to: "", status: "", classId: "", tutorId: "" })}
      />

      <div className="mt-5">
        {listQuery.isPending ? (
          <PortalLoading label="Đang tải buổi học" rows={5} />
        ) : listQuery.isError || !list ? (
          <PortalError message="Không tải được danh sách buổi học." onRetry={() => void listQuery.refetch()} />
        ) : list.content.length === 0 ? (
          <PortalEmpty
            icon="calendar_month"
            title="Không có buổi học nào khớp bộ lọc."
            description="Thử nới khoảng ngày hoặc bỏ bớt điều kiện lọc."
          />
        ) : (
          <>
            <p className="mb-2.5 text-[14px] text-brand-muted">
              <span className="font-semibold tabular-nums text-brand-ink">{list.totalElements}</span> buổi học
            </p>
            <div className="overflow-x-auto rounded-sm border border-brand-sandLine bg-white">
              <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
                <thead className="bg-brand-sand/70 text-[11.5px] font-bold uppercase tracking-wide text-brand-muted">
                  <tr>
                    <th scope="col" className="w-[10%] px-4 py-3">Mã buổi</th>
                    <th scope="col" className="w-[14%] border-l border-brand-sandLine px-4 py-3">Ngày</th>
                    <th scope="col" className="w-[14%] border-l border-brand-sandLine px-4 py-3">Giờ học</th>
                    <th scope="col" className="w-[15%] border-l border-brand-sandLine px-4 py-3">Lớp</th>
                    <th scope="col" className="w-[19%] border-l border-brand-sandLine px-4 py-3">Gia sư</th>
                    <th scope="col" className="w-[23%] border-l border-brand-sandLine px-4 py-3">Trạng thái</th>
                    <th scope="col" className="w-[5%] border-l border-brand-sandLine px-2 py-3">
                      <span className="sr-only">Chi tiết</span>
                    </th>
                  </tr>
                </thead>
                <tbody>{list.content.filter((session) => session.sessionId !== linkedId).map(renderRow)}</tbody>
              </table>
            </div>
            <Pager page={page} totalPages={list.totalPages} onChange={changePage} label="Phân trang buổi học" />
          </>
        )}
      </div>
    </>
  );
}

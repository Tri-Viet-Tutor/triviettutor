import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { FilterTabs } from "@/features/portal/components/FilterTabs";
import { PortalPageHeader } from "@/features/portal/components/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/features/portal/components/PortalState";
import { SessionRow } from "@/features/portal/components/SessionRow";
import { isUpcoming, pendingLeaveOf, splitSessions } from "@/features/portal/data/sessions";
import { useMyLeaveRequests, useMySessions } from "@/features/portal/hooks/usePortalData";
import type { SessionResponse } from "@/types/api";
import { parseIsoDate } from "@/utils/date";

type ScheduleTab = "upcoming" | "past";

/** Mỗi lần hiện thêm bấy nhiêu buổi */
const PAGE_SIZE = 12;

/** "Tháng 10, 2026" */
function monthLabel(session: SessionResponse): string {
  const date = parseIsoDate(session.date);
  return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
}

/** Gom các buổi (đã xếp thứ tự) theo tháng, giữ nguyên thứ tự */
function groupByMonth(sessions: SessionResponse[]): { month: string; sessions: SessionResponse[] }[] {
  const groups: { month: string; sessions: SessionResponse[] }[] = [];
  for (const session of sessions) {
    const month = monthLabel(session);
    const last = groups[groups.length - 1];
    if (last?.month === month) last.sessions.push(session);
    else groups.push({ month, sessions: [session] });
  }
  return groups;
}

interface SessionScheduleProps {
  /** Tiêu đề trang: "Lịch học" hoặc "Lịch dạy" */
  title: string;
  now: Date;
  /** Câu báo khi chưa có buổi nào, và nút gợi ý kèm theo */
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
  /** Phần chi tiết của một buổi (mỗi khu một kiểu) */
  renderDetail: (session: SessionResponse, hasPendingLeave: boolean) => ReactNode;
  /** Nhãn phụ trên dòng của một buổi (tuỳ chọn) */
  renderBadge?: (session: SessionResponse) => ReactNode;
}

/**
 * Lịch các buổi của tôi (GET /me/sessions), dùng cho Lịch học của học viên và Lịch dạy của gia sư:
 * hai thẻ sắp tới / đã qua, gom theo tháng, bấm một buổi để mở chi tiết.
 * Mở trang kèm ?buoi=<mã buổi> thì buổi đó được mở sẵn.
 */
export function SessionSchedule({ title, now, emptyTitle, emptyDescription, emptyAction, renderDetail, renderBadge }: SessionScheduleProps) {
  const sessionsQuery = useMySessions();
  const leaveQuery = useMyLeaveRequests({ page: 0, size: 100 });
  const [searchParams] = useSearchParams();
  const linkedId = Number(searchParams.get("buoi")) || null;

  const [tab, setTab] = useState<ScheduleTab>("upcoming");
  const [openId, setOpenId] = useState<number | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const leaveRequests = leaveQuery.data?.content ?? [];
  const { upcoming, past } = splitSessions(sessions, now);
  const list = tab === "upcoming" ? upcoming : past;

  // Mở sẵn buổi được dẫn tới từ trang khác: chuyển đúng thẻ, hiện đủ dòng rồi cuộn tới
  useEffect(() => {
    if (!linkedId) return;
    const target = sessions.find((session) => session.sessionId === linkedId);
    if (!target) return;
    const current = new Date();
    const targetTab: ScheduleTab = isUpcoming(target, current) ? "upcoming" : "past";
    const sameTab = splitSessions(sessions, current)[targetTab];
    setTab(targetTab);
    setVisible((count) => Math.max(count, sameTab.findIndex((session) => session.sessionId === linkedId) + 1));
    setOpenId(linkedId);
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`session-${linkedId}`)?.scrollIntoView({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [linkedId, sessions]);

  function changeTab(next: ScheduleTab) {
    setTab(next);
    setOpenId(null);
    setVisible(PAGE_SIZE);
  }

  const tabs: { value: ScheduleTab; label: string; count: number }[] = [
    { value: "upcoming", label: "Sắp tới", count: upcoming.length },
    { value: "past", label: "Đã qua", count: past.length },
  ];

  return (
    <>
      <PortalPageHeader
        title={title}
        action={
          sessions.length > 0 && <FilterTabs label="Lọc buổi" tabs={tabs} value={tab} onChange={changeTab} />
        }
      />

      {sessionsQuery.isPending ? (
        <PortalLoading label="Đang tải lịch" rows={5} />
      ) : sessionsQuery.isError ? (
        <PortalError message="Không tải được lịch." onRetry={() => void sessionsQuery.refetch()} />
      ) : sessions.length === 0 ? (
        <PortalEmpty icon="calendar_month" title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : list.length === 0 ? (
        <PortalEmpty
          icon={tab === "upcoming" ? "event_available" : "history"}
          title={tab === "upcoming" ? "Không còn buổi nào sắp tới" : "Chưa có buổi nào đã qua"}
        />
      ) : (
        <div className="space-y-6">
          {groupByMonth(list.slice(0, visible)).map((group) => (
            <section key={group.month} aria-label={group.month}>
              <h2 className="mb-2.5 text-[15px] font-semibold text-brand-muted">{group.month}</h2>
              <ul className="space-y-2.5">
                {group.sessions.map((session) => {
                  const hasPendingLeave = Boolean(pendingLeaveOf(session.sessionId, leaveRequests));
                  const open = openId === session.sessionId;
                  return (
                    <SessionRow
                      key={session.sessionId}
                      session={session}
                      open={open}
                      onToggle={() => setOpenId((current) => (current === session.sessionId ? null : session.sessionId))}
                      hasPendingLeave={hasPendingLeave}
                      badge={renderBadge?.(session)}
                    >
                      {open && renderDetail(session, hasPendingLeave)}
                    </SessionRow>
                  );
                })}
              </ul>
            </section>
          ))}

          {list.length > visible && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setVisible((count) => count + PAGE_SIZE)}
                className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-[14.5px] font-semibold text-brand-navy transition-colors hover:border-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
              >
                Xem thêm {Math.min(PAGE_SIZE, list.length - visible)} buổi
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

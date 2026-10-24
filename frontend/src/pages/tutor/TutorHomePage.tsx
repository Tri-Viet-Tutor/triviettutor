import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";
import { LeavePreview } from "@/components/dashboard/LeavePreview";
import { PortalGreeting } from "@/components/dashboard/PortalGreeting";
import { PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import type { SummaryRow } from "@/interfaces/ui";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import { UpcomingList } from "@/components/dashboard/UpcomingList";
import { WeekStrip } from "@/components/dashboard/WeekStrip";
import {
  completedHours,
  formatHours,
  formatLongDate,
  formatTimeRange,
  givenName,
  needsAttendance,
  nextSession,
  pendingLeaveOf,
  splitSessions,
  teacherOf,
} from "@/utils/sessions";
import { PORTAL_CARD } from "@/constants/classNames";
import { useMyLeaveRequests, useMySessions } from "@/hooks/usePortalData";
import { useNow } from "@/hooks/useNow";
import { useAuthStore } from "@/stores/authStore";
import { formatDayMonth, parseIsoDate, startOfToday, weekdayName } from "@/utils/date";

/** Số buổi sắp tới hiện ở trang Tổng quan (không tính buổi trên bảng "hôm nay") */
const UPCOMING_PREVIEW = 4;

/**
 * Trang Tổng quan của gia sư: buổi dạy hôm nay, các buổi cần điểm danh, lịch tuần này, các buổi sắp tới;
 * cột phải là tổng kết giảng dạy và đơn xin nghỉ. Chỉ tính những buổi mình thật sự là người dạy
 * (buổi đã có người dạy thay thì không tính). Dữ liệu từ GET /me/sessions và /me/leave-requests.
 */
export function TutorHomePage() {
  const user = useAuthStore((state) => state.user);
  const now = useNow();
  const today = startOfToday();
  const sessionsQuery = useMySessions();
  const leaveQuery = useMyLeaveRequests({ page: 0, size: 20 });

  // Chỉ tính những buổi mình thật sự dạy
  const teaching = (sessionsQuery.data ?? []).filter((session) => teacherOf(session) === user?.id);
  const leaveRequests = leaveQuery.data?.content ?? [];
  const { upcoming } = splitSessions(teaching, now);
  const next = nextSession(upcoming);
  const laterSessions = upcoming.filter((session) => session.sessionId !== next?.sessionId).slice(0, UPCOMING_PREVIEW);
  // Buổi đã bắt đầu, chưa khóa, chưa quá hạn mà mình cần điểm danh
  const toRecord = teaching.filter((session) => needsAttendance(session, user?.id, now));
  const fullName = user?.fullName ?? "bạn";
  const name = givenName(fullName);

  const completed = teaching.filter((session) => session.status === "COMPLETED").length;
  const upcomingCount = upcoming.filter((session) => session.status !== "CANCELLED").length;
  const activeClasses = new Set(upcoming.filter((session) => session.status !== "CANCELLED").map((session) => session.classGroupId)).size;
  // Các dòng của thẻ "Tổng kết giảng dạy"
  const rows: SummaryRow[] = [
    {
      icon: "timer",
      iconClassName: "text-[#1F63D8]",
      label: "Tổng thời lượng đã dạy",
      value: formatHours(completedHours(teaching)),
      valueClassName: "text-[#1F63D8]",
    },
    {
      icon: "co_present",
      iconClassName: "text-emerald-600",
      label: "Số buổi đã dạy",
      value: String(completed),
      valueClassName: "text-emerald-600",
    },
    {
      icon: "event_upcoming",
      iconClassName: "text-brand-orange",
      label: "Số buổi sắp dạy",
      value: String(upcomingCount),
      valueClassName: "text-brand-orangeHover",
    },
    {
      icon: "groups",
      iconClassName: "text-brand-navy",
      label: "Lớp đang dạy",
      value: String(activeClasses),
      valueClassName: "text-brand-navy",
    },
    {
      icon: "event_busy",
      iconClassName: "text-red-500",
      label: "Đơn xin nghỉ đã gửi",
      value: leaveQuery.data ? String(leaveQuery.data.totalElements) : "…",
      valueClassName: "text-red-600",
    },
  ];

  return (
    <>
      <PortalGreeting fullName={fullName} name={name} description={formatLongDate(today)} />

      {sessionsQuery.isPending ? (
        <PortalLoading label="Đang tải lịch dạy" />
      ) : sessionsQuery.isError ? (
        <PortalError message="Không tải được lịch dạy." onRetry={() => void sessionsQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-x-5 gap-y-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
            <TodayPanel
              role="tutor"
              scheduleTo={ROUTES.tutorSessions}
              leaveTo={ROUTES.tutorLeave}
              session={next}
              now={now}
              name={name}
              hasPendingLeave={Boolean(next && pendingLeaveOf(next.sessionId, leaveRequests))}
              hasAnySession={teaching.length > 0}
            />

            {toRecord.length > 0 && (
              <section className={`p-5 ${PORTAL_CARD}`} aria-labelledby="to-record-title">
                <h2 id="to-record-title" className="flex items-center gap-2 text-[17px] font-bold text-brand-navy">
                  <Icon name="fact_check" className="text-[22px] text-amber-600" />
                  Cần điểm danh
                </h2>
                <ul className="mt-2 divide-y divide-brand-sandLine">
                  {toRecord.map((session) => {
                    const date = parseIsoDate(session.date);
                    return (
                      <li key={session.sessionId}>
                        <Link
                          to={`${ROUTES.tutorSessions}?buoi=${session.sessionId}`}
                          className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-brand-sand/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
                        >
                          <span className="min-w-0">
                            <span className="block text-[15px] font-semibold text-brand-ink">
                              {weekdayName(date)} {formatDayMonth(date)}, <span className="tabular-nums">{formatTimeRange(session)}</span>
                            </span>
                            <span className="block text-[13.5px] text-brand-muted">
                              Lớp #{session.classGroupId}, buổi {session.sessionNumber}
                            </span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold text-brand-navy">
                            Điểm danh
                            <Icon name="chevron_right" className="text-[18px]" />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {teaching.length > 0 && (
              <>
                <WeekStrip sessions={teaching} today={today} scheduleTo={ROUTES.tutorSessions} />
                <UpcomingList
                  title="Các buổi dạy sau đó"
                  sessions={laterSessions}
                  today={today}
                  scheduleTo={ROUTES.tutorSessions}
                  emptyText="Chưa có buổi dạy nào khác được xếp."
                />
              </>
            )}
          </div>

          <div className="space-y-5 lg:col-span-4">
            <SummaryCard
              id="teaching-summary-title"
              title="Tổng kết giảng dạy"
              linkLabel="Xem lịch dạy"
              linkTo={ROUTES.tutorSessions}
              rows={rows}
            />
            <LeavePreview
              requests={leaveQuery.data?.content}
              isError={leaveQuery.isError}
              sessions={teaching}
              leaveTo={ROUTES.tutorLeave}
              scheduleTo={ROUTES.tutorSessions}
            />
          </div>
        </div>
      )}
    </>
  );
}

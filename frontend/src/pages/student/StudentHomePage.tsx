import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";
import { LeavePreview } from "@/components/dashboard/LeavePreview";
import { PortalGreeting } from "@/components/dashboard/PortalGreeting";
import { PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { TODAY_PANEL_CTA } from "@/constants/classNames";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import { UpcomingList } from "@/components/dashboard/UpcomingList";
import { WeekStrip } from "@/components/dashboard/WeekStrip";
import { formatLongDate, givenName, nextSession, pendingLeaveOf, splitSessions } from "@/utils/sessions";
import { useMyLeaveRequests, useMySessions, useRecentAttendance } from "@/hooks/usePortalData";
import { ClassProgressList } from "@/components/student/ClassProgressList";
import { LearningSummary } from "@/components/student/LearningSummary";
import { RecentAttendance } from "@/components/student/RecentAttendance";
import { useNow } from "@/hooks/useNow";
import { useAuthStore } from "@/stores/authStore";
import { startOfToday } from "@/utils/date";

/** Số buổi sắp tới hiện ở trang Tổng quan (không tính buổi trên bảng "hôm nay") */
const UPCOMING_PREVIEW = 4;
/** Số buổi gần nhất lấy điểm danh để tính chuyên cần */
const ATTENDANCE_RECENT = 10;
/** Số buổi hiện trong danh sách "Điểm danh gần đây" */
const ATTENDANCE_LIST = 5;

/**
 * Trang Tổng quan của học viên: bảng buổi học hôm nay có chú kiến nhắc lịch, tiến độ các lớp, lịch tuần này,
 * các buổi sắp tới; cột phải là hồ sơ học tập (chuyên cần, tổng kết), điểm danh gần đây và đơn xin nghỉ.
 * Tất cả lấy từ GET /me/sessions, /sessions/{id}/attendance và /me/leave-requests.
 */
export function StudentHomePage() {
  const user = useAuthStore((state) => state.user);
  const now = useNow();
  const today = startOfToday();
  const sessionsQuery = useMySessions();
  const leaveQuery = useMyLeaveRequests({ page: 0, size: 20 });

  const sessions = sessionsQuery.data ?? [];
  const leaveRequests = leaveQuery.data?.content ?? [];
  const { upcoming, past } = splitSessions(sessions, now);
  // Buổi kế tiếp nằm trên bảng "hôm nay"; danh sách bên dưới bỏ buổi đó
  const next = nextSession(upcoming);
  const laterSessions = upcoming.filter((session) => session.sessionId !== next?.sessionId).slice(0, UPCOMING_PREVIEW);
  const attendance = useRecentAttendance(past, ATTENDANCE_RECENT);
  const fullName = user?.fullName ?? "bạn";
  const name = givenName(fullName);
  const upcomingCount = upcoming.filter((session) => session.status !== "CANCELLED").length;

  return (
    <>
      <PortalGreeting fullName={fullName} name={name} description={formatLongDate(today)} />

      {sessionsQuery.isPending ? (
        <PortalLoading label="Đang tải lịch học" />
      ) : sessionsQuery.isError ? (
        <PortalError message="Không tải được lịch học." onRetry={() => void sessionsQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-x-8 gap-y-7 lg:grid-cols-12">
          <div className="space-y-7 lg:col-span-8">
            <TodayPanel
              role="student"
              scheduleTo={ROUTES.studentSchedule}
              leaveTo={ROUTES.studentLeave}
              emptyAction={
                <Link to={ROUTES.studentCatalog} className={TODAY_PANEL_CTA}>
                  Mua khóa học
                  <Icon name="arrow_forward" className="text-[19px]" />
                </Link>
              }
              session={next}
              now={now}
              name={name}
              hasPendingLeave={Boolean(next && pendingLeaveOf(next.sessionId, leaveRequests))}
              hasAnySession={sessions.length > 0}
            />

            {sessions.length > 0 && (
              <>
                <ClassProgressList sessions={sessions} />
                <WeekStrip sessions={sessions} today={today} scheduleTo={ROUTES.studentSchedule} />
                <UpcomingList
                  title="Các buổi sau đó"
                  sessions={laterSessions}
                  today={today}
                  scheduleTo={ROUTES.studentSchedule}
                  emptyText="Chưa có buổi nào khác được xếp."
                />
              </>
            )}
          </div>

          <div className="space-y-7 lg:col-span-4">
            <LearningSummary
              sessions={sessions}
              upcomingCount={upcomingCount}
              attendance={attendance}
              leaveTotal={leaveQuery.data?.totalElements}
            />
            {sessions.length > 0 && <RecentAttendance items={attendance.slice(0, ATTENDANCE_LIST)} />}
            <LeavePreview
              requests={leaveQuery.data?.content}
              isError={leaveQuery.isError}
              sessions={sessions}
              leaveTo={ROUTES.studentLeave}
              scheduleTo={ROUTES.studentSchedule}
            />
          </div>
        </div>
      )}
    </>
  );
}

import { useQueries, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RateTutorDialog, type StudentTutor, useMyRating, useStudentTutors } from "@/components/student/RateTutor";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Link } from "react-router-dom";
import { PORTAL_CARD, PORTAL_MORE_LINK } from "@/constants/classNames";
import type { SessionResponse, StudentHomeworkResponse } from "@/interfaces/api";
import { addDays, startOfWeek, toIsoDate, weekdayName } from "@/utils/date";
import { listMyHomeworks } from "@/services/homeworkService";
import { getTuitionClass } from "@/services/tuitionPaymentService";
import { displayCode } from "@/utils/classes";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";
import { LeavePreview } from "@/components/dashboard/LeavePreview";
import { PortalGreeting } from "@/components/dashboard/PortalGreeting";
import { PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { TODAY_PANEL_CTA } from "@/constants/classNames";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import { formatLongDate, givenName, nextSession, pendingLeaveOf, splitSessions } from "@/utils/sessions";
import { useMyLeaveRequests, useMySessions, useRecentAttendance } from "@/hooks/usePortalData";
import { ClassProgressList } from "@/components/student/ClassProgressList";
import { LearningSummary } from "@/components/student/LearningSummary";
import { RecentAttendance } from "@/components/student/RecentAttendance";
import { useNow } from "@/hooks/useNow";
import { useAuthStore } from "@/stores/authStore";
import { startOfToday } from "@/utils/date";

const stateOf = (item: StudentHomeworkResponse) =>
  item.submission.status === "GRADED" ? "GRADED" : item.submission.status === "SUBMITTED" ? "SUBMITTED" : "TODO";
/** Số buổi gần nhất lấy điểm danh để tính chuyên cần */
const ATTENDANCE_RECENT = 10;
/** Số buổi hiện trong danh sách "Điểm danh gần đây" */
const ATTENDANCE_LIST = 5;

/**
 * Trang Tổng quan của học viên: bảng buổi học hôm nay có chú kiến nhắc lịch, tiến độ các lớp và bài tập tổng quan;
 * cột phải là hồ sơ học tập (chuyên cần, tổng kết), điểm danh gần đây và đơn xin nghỉ;
 * bên dưới là thời khóa biểu tổng quan cả tuần.
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
  // Buổi kế tiếp nằm trên bảng "hôm nay"
  const next = nextSession(upcoming);
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
        <div className="grid grid-cols-1 items-start gap-x-5 gap-y-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
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

            <ClassProgressList sessions={sessions} />
            {/* Bài tập tổng quan */}
            <HomeworkOverview now={now} />
            <RatePrompt />
          </div>

          <div className="space-y-5 lg:col-span-4">
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

      {/* Thời khóa biểu tổng quan của cả tuần */}
      {!sessionsQuery.isPending && !sessionsQuery.isError && (
        <div className="mt-6">
          <WeekOverview sessions={sessions} now={now} />
        </div>
      )}
    </>
  );
}

/** Bài tập hôm nay: chỉ báo hôm nay có bài cần nộp hay không (bài chưa nộp, hạn nộp trong hôm nay) */
function HomeworkOverview({ now }: { now: Date }) {
  const homeworks = useQuery({ queryKey: ["my-homeworks"], queryFn: () => listMyHomeworks() });
  const todayIso = toIsoDate(now);
  const today = (homeworks.data?.content ?? []).filter(
    (item) => stateOf(item) === "TODO" && toIsoDate(new Date(item.homework.dueAt)) === todayIso,
  );
  const has = today.length > 0;

  return (
    <Link
      to={ROUTES.studentHomework}
      className={`flex items-center gap-4 p-4 transition-colors hover:border-brand-navy/30 ${PORTAL_CARD} ${has ? "border-amber-300 bg-amber-50/60" : ""}`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          homeworks.isError ? "bg-red-50 text-red-600" : has ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-600"
        }`}
      >
        <Icon name={homeworks.isError ? "cloud_off" : has ? "assignment_late" : "task_alt"} className="text-[25px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-extrabold text-brand-ink">
          {homeworks.isPending
            ? "Đang kiểm tra bài tập…"
            : homeworks.isError
              ? "Không tải được bài tập"
              : has
                ? `Hôm nay có ${today.length} bài tập cần nộp.`
                : (homeworks.data?.content.length ?? 0) === 0
                  ? "Bạn chưa có bài tập nhé!"
                  : "Hôm nay không có bài tập."}
        </span>
        {has && (
          <span className="mt-0.5 block truncate text-[13px] text-brand-muted">{today.map((item) => item.homework.title).join(", ")}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-[13.5px] font-semibold text-brand-navy">
        {has ? "Làm bài" : "Bài tập"}
        <Icon name="chevron_right" className="text-[18px]" />
      </span>
    </Link>
  );
}

/** Thời khóa biểu tuần này dạng gọn: bảy cột Thứ 2 → Chủ nhật, mỗi cột liệt kê giờ và tên khóa của các buổi */
function WeekOverview({ sessions, now }: { sessions: SessionResponse[]; now: Date }) {
  const monday = startOfWeek(now);
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const isoDays = days.map(toIsoDate);
  const todayIso = toIsoDate(now);
  const week = sessions
    .filter((session) => isoDays.includes(session.date))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const classIds = [...new Set(week.map((session) => session.classGroupId))];
  const classes = useQueries({
    queries: classIds.map((id) => ({ queryKey: ["catalog-class", id], queryFn: () => getTuitionClass(id), staleTime: 5 * 60_000, retry: false })),
  });
  const courseName = (id: number) => classes[classIds.indexOf(id)]?.data?.courseName ?? `Lớp ${displayCode("class", id)}`;
  const label = (date: Date) => `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  const total = week.filter((session) => session.status !== "CANCELLED").length;

  return (
    <section className={`overflow-hidden ${PORTAL_CARD}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-sandLine px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-[18px] font-extrabold text-brand-navy">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-tint">
              <Icon name="calendar_view_week" className="text-[20px]" />
            </span>
            Thời khóa biểu tuần này
          </h2>
          <p className="mt-0.5 text-[13px] text-brand-muted">
            {label(days[0])} – {label(days[6])} - {total} buổi học
          </p>
        </div>
        <Link to={ROUTES.studentSchedule} className={`text-[13.5px] ${PORTAL_MORE_LINK}`}>
          Xem lịch học
          <Icon name="chevron_right" className="text-[18px]" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <ol className="grid min-w-[760px] grid-cols-7 divide-x divide-brand-sandLine">
          {days.map((day, index) => {
            const iso = isoDays[index];
            const isToday = iso === todayIso;
            const items = week.filter((session) => session.date === iso);
            return (
              <li key={iso} className={`min-h-[150px] p-2 ${isToday ? "bg-brand-tint/40" : ""}`}>
                <p className="mb-2 flex items-center justify-center gap-1.5 text-center">
                  <span className={`text-[12px] font-semibold ${isToday ? "text-brand-navy" : "text-brand-muted"}`}>{weekdayName(day, true)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[12.5px] font-bold tabular-nums ${isToday ? "bg-brand-navy text-white" : "text-brand-ink"}`}
                  >
                    {label(day)}
                  </span>
                </p>
                {items.length === 0 ? (
                  <p className="pt-4 text-center text-[12px] text-slate-300">Trống</p>
                ) : (
                  <ul className="space-y-1.5">
                    {items.map((session) => {
                      const cancelled = session.status === "CANCELLED";
                      const done = session.status === "COMPLETED";
                      return (
                        <li
                          key={session.sessionId}
                          className={`rounded-lg border-l-[3px] px-2 py-1.5 ${
                            cancelled
                              ? "border-slate-300 bg-slate-50 opacity-60"
                              : done
                                ? "border-emerald-500 bg-emerald-50/70"
                                : "border-brand-navy bg-brand-tint/70"
                          }`}
                        >
                          <p className={`text-[12px] font-bold tabular-nums text-brand-ink ${cancelled ? "line-through" : ""}`}>
                            {session.startTime.slice(0, 5)} – {session.endTime.slice(0, 5)}
                          </p>
                          <p className="truncate text-[11.5px] text-brand-muted" title={courseName(session.classGroupId)}>
                            {courseName(session.classGroupId)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** Nhắc chấm sao các thầy cô chưa được đánh giá; bấm "Chấm sao" mở khung bật lên */
function RatePrompt() {
  const { tutors } = useStudentTutors();
  const [rating, setRating] = useState<StudentTutor | null>(null);
  if (tutors.length === 0) return null;
  return (
    <section className={`p-4 ${PORTAL_CARD}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-brand-navy">
          <Icon name="reviews" className="text-[20px]" />
          Đánh giá thầy cô
        </h2>
        <Link to={ROUTES.studentFeedback} className={`text-[13px] ${PORTAL_MORE_LINK}`}>
          Tất cả
          <Icon name="chevron_right" className="text-[17px]" />
        </Link>
      </div>
      <ul className="space-y-2">
        {tutors.map((tutor) => (
          <RateRow key={tutor.id} tutor={tutor} onRate={() => setRating(tutor)} />
        ))}
      </ul>
      <RateTutorDialog tutor={rating} onClose={() => setRating(null)} />
    </section>
  );
}

function RateRow({ tutor, onRate }: { tutor: StudentTutor; onRate: () => void }) {
  const mine = useMyRating(tutor.id);
  const rated = Boolean(mine.data);
  return (
    <li className="flex items-center gap-3 rounded-xl bg-brand-sand/50 px-3 py-2.5">
      <UserAvatar userId={tutor.id} name={tutor.name} size={34} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold text-brand-ink">{tutor.name}</span>
        <span className="block truncate text-[12px] text-brand-muted">{tutor.classes.map((item) => item.courseName).join(", ")}</span>
      </span>
      <button
        type="button"
        onClick={onRate}
        className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold transition-colors ${
          rated ? "border border-brand-sandLine bg-white text-brand-navy hover:bg-brand-tint" : "bg-amber-400 text-brand-navyDeep hover:bg-amber-300"
        }`}
      >
        <Icon name="star" className="text-[17px] [font-variation-settings:'FILL'_1]" />
        {rated ? "Đã chấm" : "Chấm sao"}
      </button>
    </li>
  );
}

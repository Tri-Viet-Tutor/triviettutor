import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { TutorSessionDetail } from "@/components/tutor/TutorSessionDetail";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, PORTAL_CARD } from "@/constants/classNames";
import { TIME_SLOT_OPTIONS } from "@/constants/classOptions";
import { gradeLabel, patternLabel, subjectLabel } from "@/constants/management";
import { useMyLeaveRequests, useMySessions } from "@/hooks/usePortalData";
import type { SessionResponse, TuitionClass } from "@/interfaces/api";
import { getTuitionClass } from "@/services/tuitionPaymentService";
import { displayCode } from "@/utils/classes";
import { addDays, parseIsoDate, startOfWeek, toIsoDate } from "@/utils/date";
import { needsAttendance, pendingLeaveOf, teacherOf } from "@/utils/sessions";

/** Bảng màu cho từng lớp (nền nhạt, viền trái đậm, chữ) */
const CLASS_COLORS = [
  { bg: "bg-sky-50", bar: "bg-sky-500", text: "text-sky-900", dot: "bg-sky-500" },
  { bg: "bg-amber-50", bar: "bg-amber-500", text: "text-amber-900", dot: "bg-amber-500" },
  { bg: "bg-emerald-50", bar: "bg-emerald-500", text: "text-emerald-900", dot: "bg-emerald-500" },
  { bg: "bg-violet-50", bar: "bg-violet-500", text: "text-violet-900", dot: "bg-violet-500" },
  { bg: "bg-rose-50", bar: "bg-rose-500", text: "text-rose-900", dot: "bg-rose-500" },
  { bg: "bg-teal-50", bar: "bg-teal-500", text: "text-teal-900", dot: "bg-teal-500" },
  { bg: "bg-orange-50", bar: "bg-orange-500", text: "text-orange-900", dot: "bg-orange-500" },
  { bg: "bg-indigo-50", bar: "bg-indigo-500", text: "text-indigo-900", dot: "bg-indigo-500" },
];

const WEEKDAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

/** Các ca học lấy theo enum TimeSlot của backend; ca khác (buổi dạy bù lệch giờ) được thêm vào khi có */
const FIXED_SLOTS = TIME_SLOT_OPTIONS.map((option) => (option.hint ?? "").replace(/\s*–\s*/, "-")).filter(Boolean);

const slotOf = (session: SessionResponse) => `${session.startTime.slice(0, 5)}-${session.endTime.slice(0, 5)}`;
const shortDate = (date: Date) => `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;

/**
 * Thời khóa biểu tuần của gia sư: cột là ngày trong tuần, hàng là ca học; mỗi ô là buổi dạy tô màu theo lớp,
 * kèm tên khóa, mã lớp, buổi thứ mấy, hình thức và nhãn cần điểm danh. Bấm buổi để mở chi tiết / điểm danh / xin nghỉ.
 */
export function TutorTimetable({ now, tutorId }: { now: Date; tutorId: number | undefined }) {
  const sessionsQuery = useMySessions();
  const leaveQuery = useMyLeaveRequests({ page: 0, size: 100 });
  const [searchParams] = useSearchParams();
  const linkedId = Number(searchParams.get("buoi")) || null;
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now));
  const [openId, setOpenId] = useState<number | null>(null);

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const leaveRequests = leaveQuery.data?.content ?? [];

  // Thông tin lớp (tên khóa, môn, hình thức, sĩ số) cho từng lớp gia sư dạy
  const classIds = useMemo(() => [...new Set(sessions.map((session) => session.classGroupId))].sort((a, b) => a - b), [sessions]);
  const classQueries = useQueries({
    queries: classIds.map((id) => ({ queryKey: ["catalog-class", id], queryFn: () => getTuitionClass(id), staleTime: 5 * 60_000, retry: false })),
  });
  const classInfo = new Map<number, TuitionClass | undefined>(classIds.map((id, index) => [id, classQueries[index]?.data]));
  /**
   * Lớp còn đang bán (chưa mở / đang tuyển sinh) hoặc chưa công khai: lịch chỉ là dự kiến —
   * lớp chạy khi có học viên, không có ai đăng ký thì trung tâm hủy lớp.
   */
  const tentativeOf = (classId: number) => {
    const query = classQueries[classIds.indexOf(classId)];
    const status = query?.data?.status;
    return status === "PUBLISHED" || status === "ENROLLING" || status === "DRAFT" || Boolean(query?.isError);
  };
  const colorOf = (classId: number) => CLASS_COLORS[Math.max(0, classIds.indexOf(classId)) % CLASS_COLORS.length];

  // Mở sẵn buổi được dẫn tới qua ?buoi=: chuyển tới đúng tuần
  useEffect(() => {
    if (!linkedId) return;
    const target = sessions.find((session) => session.sessionId === linkedId);
    if (!target) return;
    setWeekStart(startOfWeek(parseIsoDate(target.date)));
    setOpenId(linkedId);
  }, [linkedId, sessions]);

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const dayIsos = days.map(toIsoDate);
  const weekSessions = sessions.filter((session) => dayIsos.includes(session.date));
  const slots = [...new Set([...FIXED_SLOTS, ...weekSessions.map(slotOf)])].sort();
  const todayIso = toIsoDate(now);

  const active = weekSessions.filter((session) => session.status !== "CANCELLED" && !tentativeOf(session.classGroupId));
  const tentativeCount = weekSessions.filter((session) => session.status !== "CANCELLED" && tentativeOf(session.classGroupId)).length;
  const tentativeClasses = classIds.filter(tentativeOf);
  const toMark = sessions.filter((session) => needsAttendance(session, tutorId, now)).length;
  const next = sessions
    .filter(
      (session) => session.status === "SCHEDULED" && !tentativeOf(session.classGroupId) && new Date(`${session.date}T${session.startTime}`) > now,
    )
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];
  const openSession = sessions.find((session) => session.sessionId === openId) ?? null;

  if (sessionsQuery.isPending) return <PortalLoading label="Đang tải lịch dạy" rows={4} />;
  if (sessionsQuery.isError) return <PortalError message="Không tải được lịch dạy." onRetry={() => void sessionsQuery.refetch()} />;
  if (sessions.length === 0)
    return (
      <PortalEmpty
        icon="calendar_month"
        title="Bạn chưa có buổi dạy nào."
        description="Thời khóa biểu sẽ hiện ở đây sau khi trung tâm phân công lớp cho bạn."
      />
    );

  return (
    <div className="space-y-5">
      {/* Tổng quan: một dải bốn ô */}
      <dl className={`grid grid-cols-2 divide-brand-sandLine overflow-hidden lg:grid-cols-4 lg:divide-x ${PORTAL_CARD}`}>
        <Stat
          icon="event"
          label="Buổi dạy tuần này"
          value={`${active.length} buổi`}
          sub={tentativeCount > 0 ? `+${tentativeCount} buổi dự kiến` : undefined}
        />
        <Stat
          icon="groups"
          label="Lớp đang dạy"
          value={`${classIds.length - tentativeClasses.length} lớp`}
          sub={tentativeClasses.length > 0 ? `+${tentativeClasses.length} lớp đang tuyển sinh` : undefined}
        />
        <Stat icon="fact_check" label="Cần điểm danh" value={`${toMark} buổi`} warn={toMark > 0} />
        <Stat
          icon="schedule"
          label="Buổi tiếp theo"
          value={next ? `${shortDate(parseIsoDate(next.date))} - ${next.startTime.slice(0, 5)}` : "—"}
          sub={next ? (classInfo.get(next.classGroupId)?.courseName ?? displayCode("class", next.classGroupId)) : undefined}
        />
      </dl>

      {/* Thời khóa biểu */}
      <section className={`overflow-hidden ${PORTAL_CARD}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-sandLine px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-[17px] font-extrabold text-brand-navy">
              Tuần {shortDate(days[0])} – {shortDate(days[6])}
              <span className="font-semibold text-brand-muted">/{days[6].getFullYear()}</span>
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-brand-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-navy" /> Đã chốt lớp
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-amber-500" /> Dự kiến — lớp đang tuyển sinh, không có học viên sẽ bị hủy
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-brand-sand/70 p-1">
            <WeekButton icon="chevron_left" label="Tuần trước" onClick={() => setWeekStart(addDays(weekStart, -7))} />
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(now))}
              className={`h-8 rounded-lg bg-white px-3 text-[13px] font-semibold text-brand-navy shadow-sm hover:bg-brand-tint ${FOCUS_RING}`}
            >
              Tuần này
            </button>
            <WeekButton icon="chevron_right" label="Tuần sau" onClick={() => setWeekStart(addDays(weekStart, 7))} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
            <thead>
              <tr>
                <th scope="col" className="w-[120px] px-3 py-3 text-[11.5px] font-bold uppercase tracking-wide text-brand-muted">
                  Ca học
                </th>
                {days.map((day, index) => {
                  const isToday = dayIsos[index] === todayIso;
                  return (
                    <th key={dayIsos[index]} scope="col" className="px-1.5 py-2.5 text-center">
                      <span className={`block text-[12px] font-semibold ${isToday ? "text-brand-navy" : "text-brand-muted"}`}>{WEEKDAYS[index]}</span>
                      <span
                        className={`mt-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[14px] font-extrabold tabular-nums ${
                          isToday ? "bg-brand-navy text-white shadow-[0_6px_14px_-6px_rgba(11,58,140,0.8)]" : "text-brand-ink"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const [start, end] = slot.split("-");
                const fixedIndex = FIXED_SLOTS.indexOf(slot);
                return (
                  <tr key={slot} className="border-t border-brand-sandLine">
                    <th scope="row" className="px-3 py-2 align-top">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-brand-muted">
                        {fixedIndex >= 0 ? `Ca ${fixedIndex + 1}` : "Ca thêm"}
                      </span>
                      <span className="block text-[14px] font-extrabold tabular-nums text-brand-ink">{start}</span>
                      <span className="block text-[12px] tabular-nums text-brand-muted">đến {end}</span>
                    </th>
                    {dayIsos.map((iso) => {
                      const cell = weekSessions.filter((session) => session.date === iso && slotOf(session) === slot);
                      return (
                        <td key={iso} className={`h-[104px] border-l border-brand-sandLine/70 p-1.5 align-top ${iso === todayIso ? "bg-brand-tint/35" : ""}`}>
                          <div className="space-y-1.5">
                            {cell.map((session) => (
                              <SessionCard
                                key={session.sessionId}
                                session={session}
                                info={classInfo.get(session.classGroupId)}
                                color={colorOf(session.classGroupId)}
                                tentative={tentativeOf(session.classGroupId)}
                                mark={needsAttendance(session, tutorId, now)}
                                substitute={teacherOf(session) !== tutorId}
                                leave={Boolean(pendingLeaveOf(session.sessionId, leaveRequests))}
                                onOpen={() => setOpenId(session.sessionId)}
                              />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {active.length === 0 && tentativeCount === 0 && (
          <p className="border-t border-brand-sandLine px-4 py-3 text-center text-[13.5px] text-brand-muted">Tuần này không có buổi dạy.</p>
        )}
      </section>

      {/* Các lớp đang dạy */}
      <section>
        <h2 className="mb-3 text-[16px] font-bold text-brand-navy">Lớp của tôi</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {classIds.map((id) => {
            const info = classInfo.get(id);
            const color = colorOf(id);
            const own = sessions.filter((session) => session.classGroupId === id && session.originalSessionId === null);
            const done = own.filter((session) => session.status === "COMPLETED").length;
            const total = info?.totalSessions || own.length;
            const tentative = tentativeOf(id);
            return (
              <li key={id} className={`flex gap-3 p-4 ${PORTAL_CARD} ${tentative ? "border-dashed border-amber-300" : ""}`}>
                <span className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${color.bar}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold text-brand-ink">{info?.courseName ?? `Lớp ${displayCode("class", id)}`}</span>
                    {tentative && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Đang xếp lịch</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-[12.5px] text-brand-muted">
                    {displayCode("class", id)}
                    {info && (
                      <>
                        {" "}- {subjectLabel(info.subject)} {gradeLabel(info.gradeLevel)} - {patternLabel(info.schedulePattern)} {info.timeSlotLabel}
                      </>
                    )}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-sand" aria-hidden="true">
                      <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
                    </div>
                    <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-brand-ink">
                      {done}/{total} buổi
                    </span>
                  </div>
                  {info && (
                    <p className="mt-1.5 flex items-center gap-3 text-[12.5px] text-brand-muted">
                      <span className="flex items-center gap-1">
                        <Icon name="groups" className="text-[15px]" />
                        {tentative ? `${info.currentStudents}/${info.maxStudents} đã đăng ký` : `${info.currentStudents} học viên`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name={info.deliveryMode === "ONLINE" ? "videocam" : "location_on"} className="text-[15px]" />
                        {info.deliveryMode === "ONLINE" ? "Trực tuyến" : "Tại trung tâm"}
                      </span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <PortalDialog
        open={openSession !== null}
        onClose={() => setOpenId(null)}
        title={openSession ? (classInfo.get(openSession.classGroupId)?.courseName ?? `Lớp ${displayCode("class", openSession.classGroupId)}`) : ""}
        description={
          openSession
            ? `${displayCode("class", openSession.classGroupId)} - Buổi ${openSession.sessionNumber} - ${shortDate(parseIsoDate(openSession.date))} ${openSession.startTime.slice(0, 5)}–${openSession.endTime.slice(0, 5)}`
            : undefined
        }
        widthClassName="max-w-[780px]"
      >
        {openSession && (
          <TutorSessionDetail
            session={openSession}
            now={now}
            tutorId={tutorId}
            hasPendingLeave={Boolean(pendingLeaveOf(openSession.sessionId, leaveRequests))}
          />
        )}
      </PortalDialog>
    </div>
  );
}

/** Một buổi trong ô thời khóa biểu: thẻ trắng có dải màu theo lớp; lớp còn tuyển sinh thì viền đứt cam */
function SessionCard({
  session,
  info,
  color,
  tentative,
  mark,
  substitute,
  leave,
  onOpen,
}: {
  session: SessionResponse;
  info: TuitionClass | undefined;
  color: (typeof CLASS_COLORS)[number];
  /** Lớp còn đang tuyển sinh: lịch dự kiến */
  tentative: boolean;
  mark: boolean;
  substitute: boolean;
  leave: boolean;
  onOpen: () => void;
}) {
  const cancelled = session.status === "CANCELLED";
  const total = info?.totalSessions;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative block w-full overflow-hidden rounded-xl text-left transition-all hover:-translate-y-px hover:shadow-[0_10px_20px_-12px_rgba(11,58,140,0.6)] ${FOCUS_RING} ${
        cancelled
          ? "border border-slate-200 bg-slate-50 opacity-60"
          : tentative
            ? "border border-dashed border-amber-400 bg-white"
            : `border border-transparent ${color.bg}`
      }`}
    >
      <span className={`block h-1 ${cancelled ? "bg-slate-300" : tentative ? "bg-amber-300" : color.bar}`} aria-hidden="true" />
      <span className="block px-2 pb-1.5 pt-1">
        <span className={`block truncate text-[12.5px] font-extrabold leading-snug ${cancelled ? "text-slate-500 line-through" : tentative ? "text-brand-ink" : color.text}`}>
          {info?.courseName ?? `Lớp ${displayCode("class", session.classGroupId)}`}
        </span>
        <span className="flex items-center justify-between gap-1 text-[11px] text-brand-muted">
          <span className="truncate">
            {displayCode("class", session.classGroupId)} - B{session.sessionNumber}
            {total ? `/${total}` : ""}
          </span>
          {info && (
            <span className="flex shrink-0 items-center gap-0.5 tabular-nums">
              <Icon name="person" className="text-[12px]" />
              {tentative ? `${info.currentStudents}/${info.maxStudents}` : info.currentStudents}
            </span>
          )}
        </span>
        {(tentative || mark || cancelled || substitute || leave || session.originalSessionId !== null) && (
          <span className="mt-1 flex flex-wrap gap-1">
            {tentative && !cancelled && <Tag tone="amber">Dự kiến</Tag>}
            {mark && <Tag tone="red">Điểm danh</Tag>}
            {cancelled && <Tag tone="slate">Đã hủy</Tag>}
            {substitute && !cancelled && <Tag tone="slate">Dạy thay</Tag>}
            {leave && <Tag tone="red">Chờ duyệt nghỉ</Tag>}
            {session.originalSessionId !== null && <Tag tone="navy">Học bù</Tag>}
          </span>
        )}
      </span>
    </button>
  );
}

function Tag({ tone, children }: { tone: "amber" | "slate" | "red" | "navy"; children: string }) {
  const style = {
    amber: "bg-amber-100 text-amber-800",
    slate: "bg-slate-200 text-slate-700",
    red: "bg-red-100 text-red-700",
    navy: "bg-brand-tint text-brand-navy",
  }[tone];
  return <span className={`rounded px-1.5 py-px text-[10.5px] font-bold ${style}`}>{children}</span>;
}

function Stat({ icon, label, value, sub, warn = false }: { icon: string; label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-brand-sandLine px-4 py-3.5 lg:border-b-0">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${warn ? "bg-red-50 text-red-600" : "bg-brand-tint text-brand-navy"}`}
      >
        <Icon name={icon} className="text-[22px]" />
      </span>
      <div className="min-w-0">
        <dt className="text-[12px] font-semibold text-brand-muted">{label}</dt>
        <dd className={`text-[18px] font-extrabold leading-tight tabular-nums ${warn ? "text-red-700" : "text-brand-ink"}`}>{value}</dd>
        {sub && <dd className="truncate text-[11.5px] font-medium text-amber-700">{sub}</dd>}
      </div>
    </div>
  );
}

function WeekButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-brand-navy hover:bg-white ${FOCUS_RING}`}
    >
      <Icon name={icon} className="text-[22px]" />
    </button>
  );
}

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

  const active = weekSessions.filter((session) => session.status !== "CANCELLED");
  const toMark = sessions.filter((session) => needsAttendance(session, tutorId, now)).length;
  const next = sessions
    .filter((session) => session.status === "SCHEDULED" && new Date(`${session.date}T${session.startTime}`) > now)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];
  const openSession = sessions.find((session) => session.sessionId === openId) ?? null;

  if (sessionsQuery.isPending) return <PortalLoading label="Đang tải lịch dạy" rows={4} />;
  if (sessionsQuery.isError) return <PortalError message="Không tải được lịch dạy." onRetry={() => void sessionsQuery.refetch()} />;
  if (sessions.length === 0)
    return (
      <PortalEmpty
        icon="calendar_month"
        title="Bạn chưa có buổi dạy nào"
        description="Thời khóa biểu sẽ hiện ở đây sau khi trung tâm phân công lớp cho bạn."
      />
    );

  return (
    <div className="space-y-5">
      {/* Tổng quan */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="event" label="Buổi dạy tuần này" value={`${active.length} buổi`} />
        <Stat icon="groups" label="Lớp đang dạy" value={`${classIds.length} lớp`} />
        <Stat icon="fact_check" label="Cần điểm danh" value={`${toMark} buổi`} warn={toMark > 0} />
        <Stat
          icon="schedule"
          label="Buổi tiếp theo"
          value={next ? `${shortDate(parseIsoDate(next.date))} · ${next.startTime.slice(0, 5)}` : "—"}
          sub={next ? (classInfo.get(next.classGroupId)?.courseName ?? displayCode("class", next.classGroupId)) : undefined}
        />
      </dl>

      {/* Chọn tuần */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold text-brand-navy">
          Tuần {shortDate(days[0])} – {shortDate(days[6])}/{days[6].getFullYear()}
        </h2>
        <div className="flex items-center gap-1 rounded-xl border border-brand-sandLine bg-white p-1">
          <WeekButton icon="chevron_left" label="Tuần trước" onClick={() => setWeekStart(addDays(weekStart, -7))} />
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(now))}
            className={`h-9 rounded-lg px-3 text-[13.5px] font-semibold text-brand-navy hover:bg-brand-tint ${FOCUS_RING}`}
          >
            Tuần này
          </button>
          <WeekButton icon="chevron_right" label="Tuần sau" onClick={() => setWeekStart(addDays(weekStart, 7))} />
        </div>
      </div>

      {/* Thời khóa biểu */}
      <div className={`overflow-x-auto ${PORTAL_CARD}`}>
        <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
          <thead>
            <tr>
              <th scope="col" className="w-[148px] border-b border-brand-sandLine bg-brand-sand/40 px-3 py-3 text-[12px] font-semibold text-brand-muted">
                Ca học
              </th>
              {days.map((day, index) => {
                const isToday = dayIsos[index] === todayIso;
                return (
                  <th
                    key={dayIsos[index]}
                    scope="col"
                    className={`border-b border-l border-brand-sandLine px-2 py-3 text-center ${isToday ? "bg-brand-tint" : "bg-brand-sand/40"}`}
                  >
                    <span className={`block text-[12.5px] font-semibold ${isToday ? "text-brand-navy" : "text-brand-muted"}`}>{WEEKDAYS[index]}</span>
                    <span
                      className={`mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[14px] font-bold tabular-nums ${
                        isToday ? "bg-brand-navy text-white" : "text-brand-ink"
                      }`}
                    >
                      {shortDate(day)}
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
                <tr key={slot}>
                  <th scope="row" className="border-b border-brand-sandLine bg-brand-sand/20 px-3 py-2 align-middle">
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold tabular-nums ${
                          fixedIndex >= 0 ? "bg-brand-navy text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {fixedIndex >= 0 ? fixedIndex + 1 : "+"}
                      </span>
                      <span className="whitespace-nowrap text-[13.5px] font-semibold tabular-nums text-brand-ink">
                        {start} – {end}
                      </span>
                    </span>
                  </th>
                  {dayIsos.map((iso) => {
                    const cell = weekSessions.filter((session) => session.date === iso && slotOf(session) === slot);
                    return (
                      <td
                        key={iso}
                        className={`h-[112px] border-b border-l border-brand-sandLine p-1.5 align-top ${iso === todayIso ? "bg-brand-tint/40" : ""}`}
                      >
                        <div className="space-y-1.5">
                          {cell.map((session) => (
                            <SessionCard
                              key={session.sessionId}
                              session={session}
                              info={classInfo.get(session.classGroupId)}
                              color={colorOf(session.classGroupId)}
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
        {active.length === 0 && (
          <p className="border-t border-brand-sandLine px-4 py-3 text-center text-[13.5px] text-brand-muted">Tuần này không có buổi dạy.</p>
        )}
      </div>

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
            return (
              <li key={id} className={`flex gap-3 p-4 ${PORTAL_CARD}`}>
                <span className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${color.bar}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-brand-ink">{info?.courseName ?? `Lớp ${displayCode("class", id)}`}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-brand-muted">
                    {displayCode("class", id)}
                    {info && (
                      <>
                        {" "}· {subjectLabel(info.subject)} {gradeLabel(info.gradeLevel)} · {patternLabel(info.schedulePattern)} {info.timeSlotLabel}
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
                        {info.currentStudents} học viên
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
            ? `${displayCode("class", openSession.classGroupId)} · Buổi ${openSession.sessionNumber} · ${shortDate(parseIsoDate(openSession.date))} ${openSession.startTime.slice(0, 5)}–${openSession.endTime.slice(0, 5)}`
            : undefined
        }
        widthClassName="max-w-[640px]"
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

/** Một buổi trong ô thời khóa biểu */
function SessionCard({
  session,
  info,
  color,
  mark,
  substitute,
  leave,
  onOpen,
}: {
  session: SessionResponse;
  info: TuitionClass | undefined;
  color: (typeof CLASS_COLORS)[number];
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
      className={`relative block w-full overflow-hidden rounded-lg py-1.5 pl-3 pr-2 text-left transition-shadow hover:shadow-md ${FOCUS_RING} ${
        cancelled ? "bg-slate-50 opacity-60" : color.bg
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${cancelled ? "bg-slate-300" : color.bar}`} aria-hidden="true" />
      <span className={`block truncate text-[12.5px] font-bold leading-snug ${cancelled ? "text-slate-500 line-through" : color.text}`}>
        {info?.courseName ?? `Lớp ${displayCode("class", session.classGroupId)}`}
      </span>
      <span className="block truncate text-[11.5px] text-brand-muted">
        {displayCode("class", session.classGroupId)} · Buổi {session.sessionNumber}
        {total ? `/${total}` : ""}
      </span>
      <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-brand-muted">
        <Icon name={info?.deliveryMode === "ONLINE" ? "videocam" : "location_on"} className="text-[13px]" />
        <span className="truncate">{info ? (info.deliveryMode === "ONLINE" ? "Online" : "Trung tâm") : ""}</span>
        {info && <span className="ml-auto shrink-0 tabular-nums">{info.currentStudents} HV</span>}
      </span>
      {(mark || cancelled || substitute || leave || session.originalSessionId !== null) && (
        <span className="mt-1 flex flex-wrap gap-1">
          {mark && <Tag tone="amber">Điểm danh</Tag>}
          {cancelled && <Tag tone="slate">Đã hủy</Tag>}
          {substitute && !cancelled && <Tag tone="slate">Dạy thay</Tag>}
          {leave && <Tag tone="red">Chờ duyệt nghỉ</Tag>}
          {session.originalSessionId !== null && <Tag tone="navy">Học bù</Tag>}
        </span>
      )}
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
    <div className={`flex items-start gap-3 p-4 ${PORTAL_CARD}`}>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${warn ? "bg-amber-50 text-amber-600" : "bg-brand-tint text-brand-navy"}`}
      >
        <Icon name={icon} className="text-[21px]" />
      </span>
      <div className="min-w-0">
        <dt className="text-[12.5px] font-semibold text-brand-muted">{label}</dt>
        <dd className="text-[17px] font-extrabold tabular-nums text-brand-ink">{value}</dd>
        {sub && <dd className="truncate text-[12px] text-brand-muted">{sub}</dd>}
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
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-brand-navy hover:bg-brand-tint ${FOCUS_RING}`}
    >
      <Icon name={icon} className="text-[22px]" />
    </button>
  );
}

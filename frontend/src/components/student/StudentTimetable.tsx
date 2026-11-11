import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AntMascot } from "@/components/dashboard/AntMascot";
import { CrawlingAnt } from "@/components/home/CrawlingAnt";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { SessionDetail } from "@/components/student/SessionDetail";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { FOCUS_RING } from "@/constants/classNames";
import { TIME_SLOT_OPTIONS, TIME_SLOT_START } from "@/constants/classOptions";
import { subjectIcon } from "@/constants/management";
import { useMyLeaveRequests, useMySessions } from "@/hooks/usePortalData";
import type { SessionResponse, TuitionClass } from "@/interfaces/dto";
import { getTuitionClass } from "@/services/tuitionPaymentService";
import { displayCode } from "@/utils/classes";
import { addDays, parseIsoDate, startOfWeek, toIsoDate } from "@/utils/date";
import { pendingLeaveOf } from "@/utils/sessions";

// Màu nhấn theo lớp, chỉ lấy trong bảng màu của web (navy, cam, xanh lá đồi cỏ, xanh trời)
const CLASS_TONES = [
  { chip: "bg-brand-tint text-brand-navy", bar: "bg-brand-navy" },
  { chip: "bg-brand-orangeSubtle text-brand-orangeHover", bar: "bg-brand-orange" },
  { chip: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-600" },
  { chip: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
  { chip: "bg-violet-50 text-violet-700", bar: "bg-violet-500" },
];

const WEEKDAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
// Ca học của backend (TimeSlot): "08:00-10:00"…
// Lưới chung: cột ca học 140px + 7 cột ngày
const GRID = "grid grid-cols-[140px_repeat(7,minmax(0,1fr))] gap-x-2.5";
// Bốn ca của trung tâm, nhận theo giờ bắt đầu; giờ tan hiện trên từng buổi vì mỗi khóa một thời lượng
const SLOT_ROWS = TIME_SLOT_OPTIONS.map((option, index) => ({
  start: TIME_SLOT_START[option.value] ?? "",
  label: option.label,
  order: index + 1,
})).filter((row) => row.start);
const SLOT_STARTS = SLOT_ROWS.map((row) => row.start);
// Ngày dạng dd/mm
const shortDate = (date: Date) => `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
// Giờ dạng "HH:mm" từ "HH:mm:ss"
const time = (value: string) => value.slice(0, 5);
// Ca học của buổi (theo giờ bắt đầu)
const slotOf = (session: SessionResponse) => time(session.startTime);

// Thời khóa biểu tuần của học viên kiểu "tổ kiến" (mặt cắt dưới lòng đất): hàng là ca học, cột là ngày;
// mỗi buổi là một thẻ đặt trong một "phòng" của tổ, nối với nhau bằng đường hầm. Mọi nội dung lấy từ backend:
// /me/sessions (ngày, giờ, buổi, trạng thái), /me/leave-requests (chờ duyệt nghỉ), /catalog/classes/{id} (tên khóa, tổng buổi, gia sư).
export function StudentTimetable({ now }: { now: Date }) {
  const sessionsQuery = useMySessions();
  const leaveQuery = useMyLeaveRequests({ page: 0, size: 100 });
  const [searchParams] = useSearchParams();
  const linkedId = Number(searchParams.get("buoi")) || null;
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now));
  const [openId, setOpenId] = useState<number | null>(null);

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const leaveRequests = leaveQuery.data?.content ?? [];
  const classIds = useMemo(() => [...new Set(sessions.map((session) => session.classGroupId))].sort((a, b) => a - b), [sessions]);
  const classQueries = useQueries({
    queries: classIds.map((id) => ({ queryKey: ["catalog-class", id], queryFn: () => getTuitionClass(id), staleTime: 5 * 60_000, retry: false })),
  });
  const classInfo = new Map<number, TuitionClass | undefined>(classIds.map((id, index) => [id, classQueries[index]?.data]));
  // Màu của lớp trên thời khóa biểu
  const toneOf = (classId: number) => CLASS_TONES[Math.max(0, classIds.indexOf(classId)) % CLASS_TONES.length];
  // Tên khóa của lớp, chưa tải được thì hiện mã lớp
  const nameOf = (classId: number) => classInfo.get(classId)?.courseName ?? `Lớp ${displayCode("class", classId)}`;

  useEffect(() => {
    if (!linkedId) return;
    const target = sessions.find((session) => session.sessionId === linkedId);
    if (!target) return;
    setWeekStart(startOfWeek(parseIsoDate(target.date)));
    setOpenId(linkedId);
  }, [linkedId, sessions]);

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const dayIsos = days.map(toIsoDate);
  const todayIso = toIsoDate(now);
  const weekSessions = sessions.filter((session) => dayIsos.includes(session.date));
  // Bốn ca luôn có mặt để lưới không rỗng khi tuần chỉ có một buổi, cộng giờ lạ nếu có
  const slots = [...new Set([...SLOT_STARTS, ...weekSessions.map(slotOf)])].sort();
  const next = sessions
    .filter((session) => session.status === "SCHEDULED" && new Date(`${session.date}T${session.startTime}`) > now)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];
  const openSession = sessions.find((session) => session.sessionId === openId) ?? null;

  if (sessionsQuery.isPending) return <PortalLoading label="Đang tải lịch học" rows={4} />;
  if (sessionsQuery.isError) return <PortalError message="Không tải được lịch học." onRetry={() => void sessionsQuery.refetch()} />;
  if (sessions.length === 0)
    return <PortalEmpty icon="calendar_month" title="Bạn chưa có buổi học nào." description="Thời khóa biểu sẽ hiện ở đây sau khi bạn vào lớp." />;

  return (
    <div className="space-y-5">
      {
        // Khung nét đứt nhẹ, nền trong suốt để hòa với nền giấy của trang
      }
      <section className="relative overflow-hidden rounded-3xl border-2 border-dashed border-brand-line bg-white/40 px-4 pb-8 pt-5 sm:px-6">

        {
          // Bảng tên + chuyển tuần + chú kiến
        }
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-1 rounded-xl bg-white/80 p-1 shadow-sm ring-1 ring-brand-line backdrop-blur">
            <WeekButton icon="chevron_left" label="Tuần trước" onClick={() => setWeekStart(addDays(weekStart, -7))} />
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(now))}
              className={`h-8 rounded-lg px-3 text-[13px] font-semibold text-brand-navy hover:bg-brand-tint ${FOCUS_RING}`}
            >
              Tuần này
            </button>
            <WeekButton icon="chevron_right" label="Tuần sau" onClick={() => setWeekStart(addDays(weekStart, 7))} />
          </div>

          <div className="order-first mx-auto text-center sm:order-none">
            <p className="inline-block rounded-[999px] bg-white/95 px-8 py-2 shadow-[0_10px_24px_-12px_rgba(11,58,140,0.55)] ring-4 ring-white/50">
              <span className="block text-[18px] font-extrabold uppercase tracking-wide text-brand-navy sm:text-[20px]">
                Thời khóa biểu của bạn
              </span>
              <span className="block text-[12.5px] font-semibold text-brand-muted">
                Tuần {shortDate(days[0])} – {shortDate(days[6])}/{days[6].getFullYear()}
              </span>
            </p>
          </div>

          <div className="flex items-start gap-1">
            <p className="mt-1 max-w-[190px] rounded-2xl rounded-tr-sm bg-white px-3 py-1.5 text-[12px] font-semibold text-brand-navy shadow-sm ring-1 ring-brand-line">
              {next ? (
                <>
                  Buổi tới: {shortDate(parseIsoDate(next.date))} - {time(next.startTime)}
                  <span className="block truncate font-normal text-brand-muted">{nameOf(next.classGroupId)}</span>
                </>
              ) : (
                "Chưa có buổi học sắp tới"
              )}
            </p>
            <AntMascot variant="book" className="h-16 w-16 shrink-0 drop-shadow" />
          </div>
        </div>

        {
          // Lưới: mỗi ca học là một "tầng hầm" chạy ngang qua 7 ngày
        }
        <div className="relative -mx-4 mt-6 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          <div className="min-w-[1080px]">
            <div className={`${GRID} mb-3`}>
              <span />
              {days.map((day, index) => {
                const today = dayIsos[index] === todayIso;
                return (
                  <p
                    key={dayIsos[index]}
                    className={`rounded-xl px-2 py-1.5 text-center ${
                      today ? "bg-brand-navy text-white shadow-[0_6px_14px_-6px_rgba(11,58,140,0.6)]" : "bg-white text-brand-navy ring-1 ring-brand-line"
                    }`}
                  >
                    <span className="block text-[12.5px] font-extrabold uppercase tracking-wide">{WEEKDAYS[index]}</span>
                    <span className={`block text-[12px] font-medium tabular-nums ${today ? "text-white/75" : "text-brand-muted"}`}>{shortDate(day)}</span>
                  </p>
                );
              })}
            </div>

            <div className="space-y-2.5">
              {slots.map((slot, row) => {
                const slotRow = SLOT_ROWS.find((item) => item.start === slot);
                return (
                  <div key={slot} className={`relative ${GRID} items-center`}>
                    {
                      // Đường hầm của tầng này
                    }
                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-[45%] left-[140px] right-0 rounded-full bg-brand-navy/45" />
                    <TunnelAnt
                      row={row}
                      emptyColumns={dayIsos
                        .map((iso, column) => (weekSessions.some((session) => session.date === iso && slotOf(session) === slot) ? -1 : column))
                        .filter((column) => column >= 0)}
                      hiding={row === 0}
                      visible={row < 3}
                    />

                    {
                      // Nhãn ca: khối cố định, xếp chồng nên bốn hàng rộng bằng nhau dù tên ca dài ngắn khác nhau
                    }
                    <span className="relative flex items-center">
                      <span className="w-full border-l-2 border-brand-navy/25 pl-2.5">
                        <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                          {slotRow ? `Ca ${slotRow.order} - ${slotRow.label}` : "Ca thêm"}
                        </span>
                        <span className="block text-[15px] font-extrabold tabular-nums leading-tight text-brand-ink">
                          <span className="text-[11.5px] font-semibold text-brand-muted">Từ </span>
                          {slot}
                        </span>
                      </span>
                    </span>

                    {dayIsos.map((iso) => {
                      const cell = weekSessions.filter((session) => session.date === iso && slotOf(session) === slot);
                      const today = iso === todayIso;
                      return (
                        <div key={iso} className="relative flex min-h-[112px] items-center py-2">
                          {cell.length > 0 ? (
                            // Phòng trong tổ: khung bo tròn màu kem ôm thẻ buổi học
                            <div
                              className={`relative z-10 w-full space-y-2 rounded-2xl p-1.5 ${
                                today ? "bg-brand-orangeSubtle ring-1 ring-brand-orange/50" : "bg-brand-tint ring-1 ring-brand-line"
                              }`}
                            >
                              {cell.map((session) => (
                                <SessionCard
                                  key={session.sessionId}
                                  session={session}
                                  info={classInfo.get(session.classGroupId)}
                                  tone={toneOf(session.classGroupId)}
                                  leave={Boolean(pendingLeaveOf(session.sessionId, leaveRequests))}
                                  onOpen={() => setOpenId(session.sessionId)}
                                />
                              ))}
                            </div>
                          ) : (
                            <span aria-hidden="true" className={`relative mx-auto h-2.5 w-2.5 rounded-full ${today ? "bg-brand-orange ring-2 ring-white" : "bg-white/70"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {
        // Lớp đang học
      }
      <section>
        <h2 className="mb-3 text-[16px] font-bold text-brand-navy">Lớp đang học</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {classIds.map((id) => {
            const info = classInfo.get(id);
            const tone = toneOf(id);
            const own = sessions.filter((session) => session.classGroupId === id && session.originalSessionId === null);
            const done = own.filter((session) => session.status === "COMPLETED").length;
            const total = info?.totalSessions || own.length;
            const percent = total ? Math.round((done / total) * 100) : 0;
            return (
              <li key={id} className="flex gap-3 rounded-2xl border border-brand-line bg-white p-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.chip}`}>
                  <Icon name={info ? subjectIcon(info.subject) : "menu_book"} className="text-[21px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-brand-ink">{nameOf(id)}</p>
                  <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-brand-muted">
                    <span className="shrink-0">{displayCode("class", id)}</span>
                    {info?.tutorName && (
                      <>
                        <span aria-hidden="true">-</span>
                        <UserAvatar userId={info.tutorId} name={info.tutorName} size={18} />
                        <span className="truncate">{info.tutorName}</span>
                      </>
                    )}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-paper" aria-hidden="true">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${percent}%` }} />
                    </div>
                    <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-brand-ink">
                      {done}/{total} buổi
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <PortalDialog
        open={openSession !== null}
        onClose={() => setOpenId(null)}
        title={openSession ? nameOf(openSession.classGroupId) : ""}
        description={
          openSession
            ? `${displayCode("class", openSession.classGroupId)} - Buổi ${openSession.sessionNumber} - ${shortDate(parseIsoDate(openSession.date))} ${time(openSession.startTime)}–${time(openSession.endTime)}`
            : undefined
        }
        widthClassName="max-w-[600px]"
      >
        {openSession && (
          <SessionDetail session={openSession} now={now} hasPendingLeave={Boolean(pendingLeaveOf(openSession.sessionId, leaveRequests))} />
        )}
      </PortalDialog>
    </div>
  );
}

// Thẻ buổi học đặt trên đảo: dải trạng thái (nếu có), biểu tượng sách, "Lớp LH010 - Buổi 4"
function SessionCard({
  session,
  info,
  tone,
  leave,
  onOpen,
}: {
  session: SessionResponse;
  info: TuitionClass | undefined;
  tone: (typeof CLASS_TONES)[number];
  leave: boolean;
  onOpen: () => void;
}) {
  const cancelled = session.status === "CANCELLED";
  const ribbon = leave
    ? { text: "Chờ duyệt nghỉ", className: "bg-brand-orange text-white" }
    : cancelled
      ? { text: "Đã hủy", className: "bg-slate-400 text-white" }
      : session.originalSessionId !== null
        ? { text: "Học bù", className: "bg-sky-500 text-white" }
        : session.status === "COMPLETED"
          ? { text: "Đã học", className: "bg-emerald-600 text-white" }
          : session.status === "IN_SESSION"
            ? { text: "Đang học", className: "bg-brand-navy text-white" }
            : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative block w-full rounded-2xl bg-white px-2.5 pb-2 pt-2.5 text-left shadow-[0_10px_20px_-14px_rgba(11,58,140,0.6)] ring-1 transition-transform hover:-translate-y-0.5 ${FOCUS_RING} ${
        cancelled ? "opacity-60 ring-slate-200" : "ring-brand-line"
      }`}
    >
      {ribbon && (
        <span className={`absolute -top-2.5 left-2 -rotate-3 rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase shadow-sm ${ribbon.className}`}>
          {ribbon.text}
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${tone.chip}`}>
          <Icon name="menu_book" className="text-[15px]" />
        </span>
        <span className={`whitespace-nowrap text-[13px] font-extrabold text-brand-ink ${cancelled ? "line-through" : ""}`}>
          {displayCode("class", session.classGroupId)}
        </span>
      </span>
      <span className="mt-1 block text-[11.5px] font-semibold tabular-nums text-brand-muted">
        {time(session.startTime)} đến {time(session.endTime)}
      </span>
      {info && <span className="mt-0.5 block truncate text-[11.5px] font-semibold text-brand-navy">{info.courseName}</span>}
      <span className="block truncate text-[11px] text-brand-muted">
        Buổi {session.sessionNumber}
        {info?.totalSessions ? `/${info.totalSessions}` : ""}
      </span>
    </button>
  );
}

// Chú kiến vàng trên đường hầm của mỗi ca học. Chỉ đặt vào ô trống (không đè lên thẻ buổi học), nằm giữa hai chấm.
// `hiding`: chú kiến núp dưới chiếc lá, chỉ ló đầu và râu ra.
// Tốc độ bò của từng chú (một lượt bò hết đường hầm = nửa vòng đi về):
// ca 1 (núp lá) 3 phút, ca 2 (giữa) 2 phút 30 giây, ca 3 2 phút. Chân bước chậm; mỗi chú xuất phát lệch nhau.
const ANT_TIMING: { duration: string; delay: string }[] = [
  { duration: "360s", delay: "-20s" },
  { duration: "300s", delay: "-90s" },
  { duration: "240s", delay: "-150s" },
];

// Chú kiến bò dọc đường hầm của một hàng trên thời khóa biểu
function TunnelAnt({ row, hiding, visible }: { row: number; emptyColumns: number[]; hiding: boolean; visible: boolean }) {
  if (!visible) return null;
  const timing = ANT_TIMING[row % ANT_TIMING.length];
  // Biến CSS truyền xuống .ant-walker / .ant-body / .ant-legs-* (xem styles/index.css)
  const speed = { "--ant-duration": timing.duration, "--ant-delay": timing.delay, "--ant-step": "0.55s" } as React.CSSProperties;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-[150px] right-3 top-[calc(50%+7px)] z-[1] h-0" style={speed}>
      {hiding ? (
        // Chú kiến núp lá cũng bò qua bò lại theo cùng chuyển động của kiến trang chủ
        <span className="ant-lane is-active absolute inset-x-0 bottom-full block h-[40px]">
          <span className="ant-walker absolute bottom-0 block -translate-x-1/2">
            <span className="ant-body block">
              <HidingAnt />
            </span>
          </span>
        </span>
      ) : (
        // Dùng lại con kiến bò qua bò lại của trang chủ (ca 3 màu nâu sáng hơn cho khác nhau); bò khuất sau các phòng
        <CrawlingAnt className="inset-x-0" color={row === 2 ? "#8A5427" : undefined} />
      )}
    </span>
  );
}

// Màu chú kiến: thân vàng mật, viền cam đậm, má hồng
const ANT = { body: "#FFB627", light: "#FFD873", line: "#C9790A", cheek: "#FF9B8A", eye: "#1F2A44" };

// Chú kiến núp dưới chiếc lá xanh: lá úp lên lưng, chỉ ló đầu (mắt, má hồng) và hai râu
function HidingAnt() {
  return (
    <svg viewBox="0 0 60 38" className="block h-6 w-[38px] overflow-visible">
      <defs>
        <radialGradient id="ant-shine-hide" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={ANT.light} />
          <stop offset="100%" stopColor={ANT.body} />
        </radialGradient>
        <linearGradient id="leaf-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9BD27F" />
          <stop offset="100%" stopColor="#5EAE57" />
        </linearGradient>
      </defs>
      {
        // Chân ló dưới mép lá
      }
      <g stroke={ANT.line} strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M18 27 Q16 31 14 34 L11.5 34.5" />
        <path d="M27 27 Q28 31 29 34.5 L31.5 35" />
      </g>
      {
        // Râu và đầu ló ra bên phải
      }
      <g stroke={ANT.line} strokeWidth="1.4" strokeLinecap="round" fill="none">
        <path d="M44 14 Q44 8 49 7.5" />
        <path d="M48 15 Q51 10 56 11" />
      </g>
      <circle cx="49.5" cy="7.5" r="1.8" fill={ANT.body} stroke={ANT.line} strokeWidth="1" />
      <circle cx="56.5" cy="11" r="1.8" fill={ANT.body} stroke={ANT.line} strokeWidth="1" />
      <circle cx="45" cy="21.5" r="8.5" fill="url(#ant-shine-hide)" stroke={ANT.line} strokeWidth="1.3" />
      <ellipse cx="48" cy="20" rx="2.3" ry="2.7" fill={ANT.eye} />
      <circle cx="48.9" cy="19" r="0.85" fill="#ffffff" />
      <ellipse cx="48.5" cy="25" rx="1.9" ry="1.1" fill={ANT.cheek} opacity="0.75" />
      {
        // Lá úp lên lưng, có cuống và gân
      }
      <path d="M2 26 Q6 4 40 9 Q43 26 24 30 Q10 32 2 26 Z" fill="url(#leaf-fill)" stroke="#3F8C3E" strokeWidth="1.1" />
      <path d="M5 25 Q20 17 38 11" stroke="#3F8C3E" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M12 21.5 L13 15.5 M19 18.5 L21.5 12.5 M26 15.5 L29.5 10.5 M14 22 L18 26 M22 19 L26 24.5 M30 15.5 L33 21" stroke="#3F8C3E" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M2 26 Q-1 28 -3 31.5" stroke="#3F8C3E" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <ellipse cx="16" cy="13" rx="6" ry="2" fill="#ffffff" opacity="0.25" transform="rotate(-18 16 13)" />
    </svg>
  );
}

// Nút chuyển tuần trước / tuần sau
function WeekButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-brand-navy hover:bg-brand-tint ${FOCUS_RING}`}
    >
      <Icon name={icon} className="text-[20px]" />
    </button>
  );
}

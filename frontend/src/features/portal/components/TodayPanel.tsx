import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { AntMascot } from "@/features/portal/components/AntMascot";
import { StatusChip } from "@/features/portal/components/StatusChip";
import { SESSION_STATUS } from "@/features/portal/data/labels";
import { canRequestLeave, dayLabel, formatTimeRange, LATE_NOTICE_HOURS, sessionEnd, sessionStart } from "@/features/portal/data/sessions";
import type { SessionResponse } from "@/types/api";
import { diffDays, formatDayMonth, parseIsoDate, startOfToday, weekdayName } from "@/utils/date";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";
/** Nút chính trong bảng (xuất ra để trang truyền `emptyAction` cùng kiểu) */
export const TODAY_PANEL_CTA = `inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#1F63D8] px-5 text-[15px] font-bold text-white transition-colors hover:bg-brand-navy ${FOCUS}`;

/** "Còn 2 giờ 15 phút", "Còn 3 ngày", hoặc "Đang diễn ra" */
function countdown(session: SessionResponse, now: Date): string {
  const start = sessionStart(session).getTime();
  if (now.getTime() >= start && now.getTime() < sessionEnd(session).getTime()) return "Đang diễn ra";
  const minutes = Math.max(1, Math.round((start - now.getTime()) / 60_000));
  if (minutes < 60) return `Còn ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 === 0 ? `Còn ${hours} giờ` : `Còn ${hours} giờ ${minutes % 60} phút`;
  return `Còn ${Math.floor(hours / 24)} ngày`;
}

interface TodayPanelProps {
  /** Học viên xem buổi học, gia sư xem buổi dạy — chữ trên bảng đổi theo */
  role: "student" | "tutor";
  /** Buổi kế tiếp; không có thì bảng báo chưa có lịch */
  session?: SessionResponse;
  now: Date;
  /** Tên gọi thân mật của người xem, để chú kiến gọi */
  name: string;
  /** Trang lịch và trang xin nghỉ của khu */
  scheduleTo: string;
  leaveTo: string;
  /** Nút gợi ý khi không có buổi nào (ví dụ "Mua khóa học" của học viên) */
  emptyAction?: ReactNode;
  /** Buổi này đã có đơn xin nghỉ đang chờ duyệt */
  hasPendingLeave: boolean;
  /** Đã từng có buổi nào chưa (để chọn câu khi không có buổi kế tiếp) */
  hasAnySession: boolean;
}

/**
 * Bảng xanh mở đầu trang Tổng quan của học viên và gia sư: buổi hôm nay (hoặc buổi kế tiếp),
 * nút vào lớp trực tuyến, lối xin nghỉ, và chú kiến nhắc lịch trong bong bóng lời nói.
 */
export function TodayPanel({ role, session, now, name, scheduleTo, leaveTo, emptyAction, hasPendingLeave, hasAnySession }: TodayPanelProps) {
  const isTutor = role === "tutor";
  const noun = isTutor ? "dạy" : "học";
  const today = startOfToday();
  const date = session ? parseIsoDate(session.date) : null;
  const isToday = date !== null && diffDays(today, date) === 0;
  const ongoing = session ? sessionStart(session).getTime() <= now.getTime() : false;
  const status = session ? (ongoing ? SESSION_STATUS.IN_SESSION : SESSION_STATUS[session.status]) : null;

  const bubble = !session || !date
    ? `Chưa có lịch ${noun} mới, ${name} ạ.`
    : isToday
      ? `Hôm nay có lớp lúc ${session.startTime.slice(0, 5)}, ${name} ơi!`
      : `Buổi kế tiếp là ${dayLabel(date, today).toLowerCase()} ${formatDayMonth(date)}, ${name} nhé!`;

  return (
    <section aria-labelledby="today-panel-title" className="relative rounded-[26px] bg-gradient-to-br from-[#1456C8] to-[#2F7BEA] p-2 pt-0 md:mt-12">
      {/* Chú kiến và bong bóng lời nói nhô lên trên mép bảng (màn hình rộng) */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-14 right-5 hidden items-end gap-1 md:flex">
        <p className="relative mb-7 max-w-[340px] rounded-2xl rounded-br-md bg-brand-navyDeep px-4 py-3 text-[15px] font-semibold leading-snug text-white shadow-[0_14px_28px_-16px_rgba(8,42,102,0.9)]">
          {bubble}
        </p>
        <AntMascot className="h-[124px] w-[119px] drop-shadow-[0_10px_10px_rgba(8,42,102,0.35)]" />
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id="today-panel-title" className="flex items-center gap-2 text-[20px] font-bold text-white">
            <Icon name="local_fire_department" className="text-[24px] text-brand-orange" />
            {isToday || !session ? `Buổi ${noun} hôm nay` : `Buổi ${noun} kế tiếp`}
          </h2>
          {/* Điện thoại: lời nhắc nằm ngay dưới tiêu đề */}
          <p className="mt-1 text-[14px] font-medium text-white/90 md:hidden">{bubble}</p>
        </div>
        <AntMascot className="h-[76px] w-[73px] shrink-0 md:hidden" />
      </div>

      <div className="rounded-[20px] bg-white p-2">
        {session && date && status ? (
          <>
            <div className="flex flex-col gap-4 rounded-2xl border-2 border-[#2F7BEA] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-tint leading-none text-brand-navy"
                >
                  <span className="text-[10.5px] font-semibold">{weekdayName(date, true)}</span>
                  <span className="text-[17px] font-bold">{date.getDate()}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-[18px] font-bold leading-tight text-brand-ink">
                    Lớp #{session.classGroupId}, buổi {session.sessionNumber}
                    {session.originalSessionId !== null && " (học bù)"}
                  </p>
                  <p className="mt-0.5 text-[15.5px] tabular-nums text-brand-muted">
                    {formatTimeRange(session)}, {weekdayName(date)} {formatDayMonth(date)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusChip tone={status.tone} icon={status.icon}>
                      {countdown(session, now)}
                    </StatusChip>
                    {session.meetingUrl && (
                      <StatusChip tone="slate" icon="videocam">
                        Trực tuyến
                      </StatusChip>
                    )}
                  </div>
                </div>
              </div>

              {session.meetingUrl ? (
                <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className={TODAY_PANEL_CTA}>
                  Vào lớp
                  <Icon name="arrow_forward" className="text-[19px]" />
                </a>
              ) : (
                <Link to={`${scheduleTo}?buoi=${session.sessionId}`} className={TODAY_PANEL_CTA}>
                  Xem chi tiết
                  <Icon name="arrow_forward" className="text-[19px]" />
                </Link>
              )}
            </div>

            <p className="flex items-center gap-2.5 px-4 py-3 text-[14px] text-brand-muted">
              {hasPendingLeave ? (
                <>
                  <Icon name="hourglass_top" className="text-[19px] text-amber-600" />
                  Bạn đã gửi đơn xin nghỉ buổi này, trung tâm đang duyệt.
                </>
              ) : canRequestLeave(session, now) ? (
                <>
                  <Icon name="event_busy" className="text-[19px] text-slate-400" />
                  <span>
                    Bận hôm đó?{" "}
                    <Link
                      to={`${leaveTo}?buoi=${session.sessionId}`}
                      className={`rounded font-semibold text-brand-navy underline-offset-4 hover:underline ${FOCUS}`}
                    >
                      Xin nghỉ buổi này
                    </Link>{" "}
                    {isTutor ? `trước ${LATE_NOTICE_HOURS} giờ để trung tâm kịp xếp người dạy thay.` : `trước ${LATE_NOTICE_HOURS} giờ để được tính có phép.`}
                  </span>
                </>
              ) : (
                <>
                  <Icon name="schedule" className="text-[19px] text-slate-400" />
                  {isTutor ? "Buổi dạy đã bắt đầu. Nhớ điểm danh học viên trong Lịch dạy." : "Buổi học đã bắt đầu nên không xin nghỉ được nữa."}
                </>
              )}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15.5px] leading-relaxed text-brand-ink">
              {isTutor
                ? hasAnySession
                  ? "Không còn buổi dạy nào sắp tới. Các buổi đã dạy vẫn xem lại được ở Lịch dạy."
                  : "Bạn chưa được phân công lớp nào. Lịch dạy sẽ hiện ở đây sau khi trung tâm phân công."
                : hasAnySession
                  ? "Không còn buổi học nào sắp tới. Các buổi đã học vẫn xem lại được ở Lịch học."
                  : "Bạn chưa có lớp nào. Lịch học sẽ hiện ở đây sau khi trung tâm xếp bạn vào lớp."}
            </p>
            {emptyAction}
          </div>
        )}
      </div>
    </section>
  );
}

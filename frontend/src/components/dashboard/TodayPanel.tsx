import { Link } from "react-router-dom";
import { AntMascot } from "@/components/dashboard/AntMascot";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING as FOCUS, TODAY_PANEL_CTA } from "@/constants/classNames";
import { SESSION_STATUS } from "@/constants/labels";
import { LATE_NOTICE_HOURS } from "@/constants/rules";
import type { SessionResponse } from "@/interfaces/api";
import { diffDays, formatDayMonth, parseIsoDate, startOfToday, weekdayName } from "@/utils/date";
import { canRequestLeave, dayLabel, formatTimeRange, sessionEnd, sessionStart } from "@/utils/sessions";
import type { TodayPanelProps } from "@/interfaces/portal";

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

/**
 * Bảng xanh mở đầu trang Tổng quan của học viên và gia sư: buổi hôm nay (hoặc buổi kế tiếp),
 * nút vào lớp trực tuyến, lối xin nghỉ, và chú kiến nhắc lịch trong bong bóng lời nói.
 */
export function TodayPanel({
  role,
  session,
  now,
  name,
  scheduleTo,
  leaveTo,
  emptyAction,
  hasPendingLeave,
  hasAnySession,
}: TodayPanelProps) {
  const isTutor = role === "tutor";
  const noun = isTutor ? "dạy" : "học";
  const today = startOfToday();
  const date = session ? parseIsoDate(session.date) : null;
  const isToday = date !== null && diffDays(today, date) === 0;
  // Buổi đã bắt đầu thì hiện như "Đang học" dù máy chủ chưa đổi trạng thái
  const ongoing = session ? sessionStart(session).getTime() <= now.getTime() : false;
  const status = session ? (ongoing ? SESSION_STATUS.IN_SESSION : SESSION_STATUS[session.status]) : null;

  // Câu nói của chú kiến
  const bubble =
    !session || !date
      ? `Chưa có lịch ${noun} mới, ${name} ạ.`
      : isToday
        ? `Hôm nay có lớp lúc ${session.startTime.slice(0, 5)}, ${name} ơi!`
        : `Buổi kế tiếp là ${dayLabel(date, today).toLowerCase()} ${formatDayMonth(date)}, ${name} nhé!`;

  return (
    <section aria-labelledby="today-panel-title" className="relative rounded-2xl bg-gradient-to-br from-brand-navy to-[#1F63D8] p-1.5 pt-0">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4">
        <div className="min-w-0">
          <h2 id="today-panel-title" className="flex items-center gap-2 text-[17px] font-bold text-white">
            <Icon name="local_fire_department" className="text-[21px] text-brand-orange" />
            {isToday || !session ? `Buổi ${noun} hôm nay` : `Buổi ${noun} kế tiếp`}
          </h2>
          <p className="mt-0.5 text-[13.5px] font-medium text-white/85">{bubble}</p>
        </div>
        <AntMascot className="-mb-2 h-[58px] w-[56px] shrink-0" />
      </div>

      <div className="rounded-xl bg-white p-1.5">
        {session && date && status ? (
          <>
            <div className="flex flex-col gap-3 rounded-lg border border-[#2F7BEA]/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-tint leading-none text-brand-navy"
                >
                  <span className="text-[10.5px] font-semibold">{weekdayName(date, true)}</span>
                  <span className="text-[17px] font-bold">{date.getDate()}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-[16px] font-bold leading-tight text-brand-ink">
                    Lớp #{session.classGroupId}, buổi {session.sessionNumber}
                    {session.originalSessionId !== null && " (học bù)"}
                  </p>
                  <p className="mt-0.5 text-[14px] tabular-nums text-brand-muted">
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
                <Link to={`/classroom/${session.sessionId}`} className={TODAY_PANEL_CTA}>
                  Vào lớp
                  <Icon name="arrow_forward" className="text-[19px]" />
                </Link>
              ) : (
                <Link to={`${scheduleTo}?buoi=${session.sessionId}`} className={TODAY_PANEL_CTA}>
                  Xem chi tiết
                  <Icon name="arrow_forward" className="text-[19px]" />
                </Link>
              )}
            </div>

            {/* Dòng nhắc xin nghỉ: đã xin / còn xin được / đã bắt đầu */}
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
                    {isTutor
                      ? `trước ${LATE_NOTICE_HOURS} giờ để trung tâm kịp xếp người dạy thay.`
                      : `trước ${LATE_NOTICE_HOURS} giờ để được tính có phép.`}
                  </span>
                </>
              ) : (
                <>
                  <Icon name="schedule" className="text-[19px] text-slate-400" />
                  {isTutor
                    ? "Buổi dạy đã bắt đầu. Nhớ điểm danh học viên trong Lịch dạy."
                    : "Buổi học đã bắt đầu nên không xin nghỉ được nữa."}
                </>
              )}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed border-brand-sandLine p-5 sm:flex-row sm:items-center sm:justify-between">
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

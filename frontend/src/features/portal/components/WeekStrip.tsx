import { Link } from "react-router-dom";
import { TONE_CHIP, SESSION_STATUS } from "@/features/portal/data/labels";
import { weekDays } from "@/features/portal/data/sessions";
import { PORTAL_CARD } from "@/features/portal/data/ui";
import type { SessionResponse } from "@/types/api";
import { formatDayMonth, toIsoDate, weekdayName } from "@/utils/date";

interface WeekStripProps {
  sessions: SessionResponse[];
  today: Date;
  /** Trang lịch của khu (học viên: Lịch học, gia sư: Lịch dạy) */
  scheduleTo: string;
}

/** Bảy ngày của tuần này, mỗi ngày ghi giờ bắt đầu các buổi; bấm vào giờ để mở buổi đó ở trang lịch của khu. */
export function WeekStrip({ sessions, today, scheduleTo }: WeekStripProps) {
  const days = weekDays(today);
  const todayIso = toIsoDate(today);

  return (
    <section className={`p-5 ${PORTAL_CARD}`} aria-labelledby="week-strip-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="week-strip-title" className="text-[17px] font-bold text-brand-navy">
          Tuần này
        </h2>
        <p className="text-[13.5px] text-brand-muted">
          {formatDayMonth(days[0])} – {formatDayMonth(days[6])}
        </p>
      </div>

      <ol className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const iso = toIsoDate(day);
          const isToday = iso === todayIso;
          const daySessions = sessions.filter((session) => session.date === iso).sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <li key={iso} className={`flex min-h-[104px] flex-col items-center rounded-xl px-0.5 py-2 ${isToday ? "bg-brand-tint" : ""}`}>
              <span className="text-[12px] font-medium text-brand-muted">{weekdayName(day, true)}</span>
              <span
                className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-bold ${
                  isToday ? "bg-brand-navy text-white" : "text-brand-ink"
                }`}
                aria-label={isToday ? `Hôm nay, ngày ${day.getDate()}` : undefined}
              >
                {day.getDate()}
              </span>
              <span className="mt-1.5 flex flex-col items-center gap-1">
                {daySessions.map((session) => (
                  <Link
                    key={session.sessionId}
                    to={`${scheduleTo}?buoi=${session.sessionId}`}
                    aria-label={`Buổi ${session.startTime.slice(0, 5)} ${weekdayName(day)}, ${SESSION_STATUS[session.status].label}`}
                    className={`rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy sm:px-2 sm:text-[12.5px] ${
                      TONE_CHIP[SESSION_STATUS[session.status].tone]
                    } ${session.status === "CANCELLED" ? "line-through" : ""}`}
                  >
                    {session.startTime.slice(0, 5)}
                  </Link>
                ))}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

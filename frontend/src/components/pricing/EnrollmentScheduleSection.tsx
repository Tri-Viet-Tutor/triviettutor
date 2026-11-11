import { useMemo } from "react";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CONTAINER } from "@/constants/classNames";
import { ENROLLMENT_DEADLINE_DAYS } from "@/constants/classOptions";
import { ENROLLMENT_WINDOWS } from "@/constants/pricing";
import { useInView } from "@/hooks/useInView";
import type { EnrollmentStatus } from "@/interfaces/pricing";
import { diffDays, formatDate, formatDayMonth, startOfToday } from "@/utils/date";
import { enrollmentStatus, enrollmentStatusLabel } from "@/utils/pricing";

// Hai cột dùng chung cho hàng trục ngày và từng hàng khóa học (từ màn hình lớn)
const ROW_GRID = "lg:grid lg:grid-cols-[minmax(0,300px)_1fr] lg:items-center lg:gap-10";

// Màu nhãn trạng thái theo đợt đăng ký
const STATUS_CHIP: Record<EnrollmentStatus, string> = {
  UPCOMING: "border border-brand-navy/30 text-brand-navy",
  OPEN: "bg-brand-orange text-brand-navyDeep",
  CLOSED: "bg-brand-navy/10 text-brand-muted",
  STARTED: "bg-brand-navy/10 text-brand-muted",
};

// Màu thanh thời gian theo đợt đăng ký
const STATUS_BAR: Record<EnrollmentStatus, string> = {
  UPCOMING: "bg-brand-navy/35",
  OPEN: "bg-gradient-to-r from-brand-marker to-brand-orange",
  CLOSED: "bg-brand-navy/20",
  STARTED: "bg-brand-navy/20",
};

// Lịch mở đăng ký: mỗi khóa một thanh trên trục ngày — thanh màu là thời gian nhận đăng ký
// (từ ngày mở tới hạn chốt), lá cờ là ngày khai giảng, vạch dọc là hôm nay.
export function EnrollmentScheduleSection() {
  const today = useMemo(() => startOfToday(), []);
  // Thanh thời gian chỉ chạy dài ra khi danh sách vào màn hình
  const [listRef, listShown] = useInView<HTMLDivElement>();

  // Trục ngày chạy từ ngày mở sớm nhất tới ngày khai giảng muộn nhất
  const axisStart = ENROLLMENT_WINDOWS.reduce((min, item) => (item.opens < min ? item.opens : min), ENROLLMENT_WINDOWS[0].opens);
  const axisEnd = ENROLLMENT_WINDOWS.reduce((max, item) => (item.starts > max ? item.starts : max), ENROLLMENT_WINDOWS[0].starts);
  const axisDays = Math.max(diffDays(axisStart, axisEnd), 1);
  // Vị trí (%) của một ngày trên trục
  const position = (date: Date) => Math.min(Math.max((diffDays(axisStart, date) / axisDays) * 100, 0), 100);
  const todayPosition = today >= axisStart && today <= axisEnd ? position(today) : null;

  return (
    <section id="enrollment-schedule" className="paper-grid bg-[#E8E2D5] py-14 lg:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          title="Lịch Mở Đăng Ký"
          description={`Mỗi lớp chốt đăng ký trước ngày khai giảng ${ENROLLMENT_DEADLINE_DAYS} ngày.`}
        />

        <div ref={listRef}>
          {
            // Trục ngày: ngày đầu, ngày cuối và nhãn "Hôm nay"
          }
          <div aria-hidden="true" className={ROW_GRID}>
            <span />
            <div className="relative mx-4 h-8 text-[12.5px] font-bold text-brand-muted">
              <span className="absolute left-0 top-0 hidden -translate-x-1/2 sm:block">{formatDayMonth(axisStart)}</span>
              <span className="absolute right-0 top-0 hidden translate-x-1/2 sm:block">{formatDayMonth(axisEnd)}</span>
              {todayPosition !== null && (
                <span
                  className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-navy px-2.5 py-0.5 text-[11.5px] text-white"
                  style={{ left: `${todayPosition}%` }}
                >
                  Hôm nay
                </span>
              )}
            </div>
          </div>

          <ul>
            {ENROLLMENT_WINDOWS.map((item, index) => {
              const status = enrollmentStatus(item, today);
              const barLeft = position(item.opens);
              const barWidth = position(item.deadline) - barLeft;
              return (
                <Reveal
                  as="li"
                  key={item.course.id}
                  delay={index * 70}
                  className={`border-t border-dashed border-brand-navy/25 py-6 ${ROW_GRID}`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-navy">
                      <Icon name={item.course.icon} className="text-[23px] text-brand-marker" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[17px] font-extrabold leading-tight text-brand-navy">{item.course.name}</span>
                      <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[12.5px] font-bold ${STATUS_CHIP[status]}`}>
                        {enrollmentStatusLabel(item, today)}
                      </span>
                    </span>
                  </div>

                  <div className="mt-5 lg:mt-0">
                    {
                      // Thanh thời gian
                    }
                    <div aria-hidden="true" className="relative mx-4 h-3 rounded-full bg-brand-navy/10">
                      <span
                        className={`absolute inset-y-0 rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none ${STATUS_BAR[status]}`}
                        style={{ left: `${barLeft}%`, width: listShown ? `${barWidth}%` : "0%", transitionDelay: `${index * 90}ms` }}
                      />
                      {todayPosition !== null && (
                        <span
                          className="absolute -bottom-3 -top-3 w-0.5 -translate-x-1/2 rounded-full bg-brand-navy"
                          style={{ left: `${todayPosition}%` }}
                        />
                      )}
                      <span
                        className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-[#E8E2D5] bg-brand-navy text-white"
                        style={{ left: `${position(item.starts)}%` }}
                      >
                        <Icon name="flag" className="text-[16px]" />
                      </span>
                    </div>

                    <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-1.5 px-1 text-[14px]">
                      <div className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-orange" />
                        <dt className="text-brand-muted">Mở đăng ký</dt>
                        <dd className="font-bold text-brand-ink">{formatDate(item.opens)}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-orangeHover" />
                        <dt className="text-brand-muted">Chốt đăng ký</dt>
                        <dd className="font-bold text-brand-ink">{formatDate(item.deadline)}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Icon name="flag" className="text-[16px] text-brand-navy" />
                        <dt className="text-brand-muted">Khai giảng</dt>
                        <dd className="font-bold text-brand-ink">{formatDate(item.starts)}</dd>
                      </div>
                    </dl>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

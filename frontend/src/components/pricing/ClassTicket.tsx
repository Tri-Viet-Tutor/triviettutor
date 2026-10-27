import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { DELIVERY_MODE_OPTIONS, GRADE_OPTIONS, SCHEDULE_PATTERN_OPTIONS } from "@/constants/classOptions";
import type { ClassTicketProps } from "@/interfaces/pricing";
import { formatVnd } from "@/utils/currency";
import { formatDayMonth, parseIsoDate } from "@/utils/date";

/** Màu cuống vé, xoay vòng theo vị trí lớp trong danh sách */
const STUB_TONES = [
  "bg-brand-navy text-white",
  "bg-[#FFE2A6] text-brand-navyDeep",
  "bg-[#CFE0F8] text-brand-navyDeep",
  "bg-[#FCDFC9] text-brand-navyDeep",
  "bg-[#E4DFF6] text-brand-navyDeep",
];

/** Lỗ khuyết hình bán nguyệt ở hai đầu đường xé, tô cùng màu nền của phần danh sách */
const NOTCH = "absolute h-5 w-5 rounded-full border border-slate-200";

/**
 * Một lớp đang mở đăng ký (dữ liệu thật từ GET /catalog/classes — các lớp admin mở bán),
 * trình bày như tấm vé: cuống vé là môn, thân vé là thông tin lớp, phần xé là học phí và nút đăng ký.
 */
export function ClassTicket({ item, index, canBuy, onBuy, surfaceClassName = "bg-[#F5F1E9]" }: ClassTicketProps) {
  const tone = STUB_TONES[index % STUB_TONES.length];
  const grade = GRADE_OPTIONS.find((option) => option.value === item.gradeLevel)?.label;
  const mode = DELIVERY_MODE_OPTIONS.find((option) => option.value === item.deliveryMode)?.label;
  const days = SCHEDULE_PATTERN_OPTIONS.find((option) => option.value === item.schedulePattern)?.label;
  const discounted = item.discountRate > 0 && item.estimatedFee < item.basePrice1on1;
  const soldOut = item.spotsLeft < 1;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_44px_-36px_rgba(8,42,102,0.5)] md:flex-row">
      <div className={`shrink-0 px-5 py-3 md:w-[128px] md:py-5 ${tone}`}>
        <p className="text-[12.5px] font-bold uppercase tracking-[0.14em]">{item.subject}</p>
      </div>

      <div className="min-w-0 flex-1 px-5 py-5 sm:px-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13.5px] text-brand-muted">
          {grade}
          <span aria-hidden="true">/</span>
          Khai giảng {formatDayMonth(parseIsoDate(item.startDate))}
          {item.enrollmentDeadline && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-semibold text-emerald-800">
              Chốt đăng ký {formatDayMonth(parseIsoDate(item.enrollmentDeadline))}
            </span>
          )}
        </p>
        <h3 className="mt-1.5 text-[20px] font-bold leading-tight text-brand-navy">{item.courseName}</h3>
        <p className="mt-1 text-[13.5px] text-brand-muted">Mã lớp {item.classCode}</p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13.5px] text-brand-ink">
          <li className="flex items-center gap-1.5">
            <Icon name="calendar_month" className="text-[17px] text-brand-navy" />
            <strong className="font-semibold">{days ?? item.schedulePattern}</strong>
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="schedule" className="text-[17px] text-brand-navy" />
            <strong className="font-semibold">{item.timeSlotLabel}</strong>
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="event_repeat" className="text-[17px] text-brand-navy" />
            {item.totalSessions} buổi
          </li>
          {mode && (
            <li className="flex items-center gap-1.5">
              <Icon name={item.deliveryMode === "ONLINE" ? "videocam" : "location_on"} className="text-[17px] text-brand-navy" />
              {mode}
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <Icon name="groups" className="text-[17px] text-brand-navy" />
            {item.classType === "ONE_ON_ONE" ? "Học 1 kèm 1" : `${item.currentStudents}/${item.maxStudents} học viên`}
            {" · "}
            <strong className={`font-semibold ${item.spotsLeft <= 2 ? "text-brand-orange" : ""}`}>
              {soldOut ? "Hết chỗ" : `còn ${item.spotsLeft} chỗ`}
            </strong>
          </li>
        </ul>
      </div>

      <div className="relative flex shrink-0 flex-col justify-center gap-3 border-t-2 border-dashed border-slate-300 px-5 py-5 md:w-[232px] md:border-l-2 md:border-t-0">
        <span aria-hidden="true" className={`${NOTCH} ${surfaceClassName} -left-2.5 -top-2.5`} />
        <span
          aria-hidden="true"
          className={`${NOTCH} ${surfaceClassName} -right-2.5 -top-2.5 md:-bottom-2.5 md:-left-2.5 md:right-auto md:top-auto`}
        />
        <p className="md:text-right">
          {discounted && <span className="block text-[13px] text-brand-muted line-through">{formatVnd(item.basePrice1on1)}</span>}
          <span className="whitespace-nowrap text-[23px] font-bold leading-tight tracking-tight text-brand-navy">
            {formatVnd(item.estimatedFee)}
          </span>
          <span className="ml-1.5 text-[13px] text-brand-muted md:ml-0 md:block">
            {discounted ? `giảm ${Math.round(item.discountRate * 100)}% · cả khóa` : "cả khóa"}
          </span>
        </p>
        <button
          type="button"
          onClick={onBuy}
          disabled={!canBuy || soldOut}
          aria-label={`Đăng ký lớp ${item.classCode}`}
          className={`inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-brand-navy px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-navyDeep disabled:cursor-not-allowed disabled:bg-slate-300 ${FOCUS_RING}`}
        >
          {soldOut ? "Hết chỗ" : "Đăng ký ngay"}
          {!soldOut && <Icon name="arrow_forward" className="text-[17px]" />}
        </button>
      </div>
    </article>
  );
}

import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/ui/StarRating";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { FOCUS_RING } from "@/constants/classNames";
import { DELIVERY_MODE_OPTIONS, GRADE_OPTIONS, SCHEDULE_PATTERN_OPTIONS } from "@/constants/classOptions";
import type { ClassTicketProps } from "@/interfaces/pricing";
import { formatVnd } from "@/utils/currency";
import { formatDate, parseIsoDate } from "@/utils/date";
import { discountForSize, estimatedEndDate } from "@/utils/classes";

// Màu cuống vé, xoay vòng theo vị trí lớp trong danh sách
const STUB_TONES = [
  "bg-brand-navy text-white",
  "bg-[#FFE2A6] text-brand-navyDeep",
  "bg-[#CFE0F8] text-brand-navyDeep",
  "bg-[#FCDFC9] text-brand-navyDeep",
  "bg-[#E4DFF6] text-brand-navyDeep",
];

// Lỗ khuyết hình bán nguyệt ở hai đầu đường xé, tô cùng màu nền của phần danh sách
const NOTCH = "absolute h-5 w-5 rounded-full border border-slate-200";

// Một lớp đang mở đăng ký (dữ liệu thật từ GET /catalog/classes — các lớp admin mở bán),
// trình bày như tấm vé: cuống vé là môn, thân vé là thông tin lớp, phần xé là học phí và nút đăng ký.
export function ClassTicket({
  item,
  index,
  canBuy,
  onBuy,
  onAddToCart,
  inCart = false,
  adding = false,
  surfaceClassName = "bg-[#F5F1E9]",
}: ClassTicketProps) {
  const tone = STUB_TONES[index % STUB_TONES.length];
  const grade = GRADE_OPTIONS.find((option) => option.value === item.gradeLevel)?.label;
  const mode = DELIVERY_MODE_OPTIONS.find((option) => option.value === item.deliveryMode)?.label;
  const days = SCHEDULE_PATTERN_OPTIONS.find((option) => option.value === item.schedulePattern)?.label;
  // Đăng ký trả đủ học phí; lớp nhóm được hoàn phần giảm theo sĩ số vào ví khi lớp chốt
  const isGroup = item.classType !== "ONE_ON_ONE";
  const refundNow = isGroup ? discountForSize(item.classType, item.currentStudents + 1) : 0;
  const soldOut = item.spotsLeft < 1;
  // Buổi cuối theo lịch, chưa tính buổi bù nếu lớp phải nghỉ giữa chừng
  const endDate = estimatedEndDate(item.startDate, item.schedulePattern, item.totalSessions);

  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_44px_-36px_rgba(8,42,102,0.5)] md:flex-row">
      <div className={`shrink-0 px-5 py-3 md:w-[128px] md:py-5 ${tone}`}>
        <p className="text-[12.5px] font-bold uppercase tracking-[0.14em]">{item.subject}</p>
      </div>

      <div className="min-w-0 flex-1 px-5 py-5 sm:px-6">
        <p className="text-[13.5px] text-brand-muted">{grade}</p>
        <h3 className="mt-1.5 text-[20px] font-bold leading-tight text-brand-navy">{item.courseName}</h3>
        <p className="mt-1 text-[13.5px] text-brand-muted">Mã lớp {item.classCode}</p>
        {item.tutorName && (
          <p className="mt-2 flex items-center gap-2 whitespace-nowrap text-[14px] text-brand-ink">
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <UserAvatar userId={item.tutorId} name={item.tutorName} size={26} />
              Gia sư <strong className="font-semibold">{item.tutorName}</strong>
            </span>
            {item.tutorRating != null && (item.tutorRatingCount ?? 0) > 0 ? (
              <span className="flex shrink-0 items-center gap-1.5 text-[13px]">
                <StarRating value={item.tutorRating} />
                <strong className="font-semibold text-brand-ink">
                  {item.tutorRating.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </strong>
                <span className="text-brand-muted">({item.tutorRatingCount} đánh giá)</span>
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1.5 text-[13px] text-brand-muted">
                <StarRating value={null} />
              </span>
            )}
          </p>
        )}

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
          <li className="flex items-center gap-1.5">
            <Icon name="flag" className="text-[17px] text-brand-navy" />
            Khai giảng <strong className="font-semibold">{formatDate(parseIsoDate(item.startDate))}</strong>
          </li>
          {endDate && (
            <li className="flex items-center gap-1.5" title="Tính theo lịch học, chưa gồm buổi bù nếu lớp nghỉ giữa chừng">
              <Icon name="sports_score" className="text-[17px] text-brand-navy" />
              Dự kiến hết <strong className="font-semibold">{formatDate(parseIsoDate(endDate))}</strong>
            </li>
          )}
          {item.enrollmentDeadline && (
            <li>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[12.5px] font-semibold text-emerald-800">
                <Icon name="event_available" className="text-[15px]" />
                Chốt đăng ký {formatDate(parseIsoDate(item.enrollmentDeadline))}
              </span>
            </li>
          )}
          {mode && (
            <li className="flex items-center gap-1.5">
              <Icon name={item.deliveryMode === "ONLINE" ? "videocam" : "location_on"} className="text-[17px] text-brand-navy" />
              {mode}
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <Icon name="groups" className="text-[17px] text-brand-navy" />
            {item.classType === "ONE_ON_ONE" ? "Học 1 kèm 1" : `${item.currentStudents}/${item.maxStudents} học viên`}
            {" - "}
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
          <span className="whitespace-nowrap text-[23px] font-bold leading-tight tracking-tight text-brand-navy">
            {formatVnd(item.estimatedFee)}
          </span>
          <span className="ml-1.5 text-[13px] text-brand-muted md:ml-0 md:block">
            cả khóa
          </span>
          {isGroup && (
            <span
              className="mt-1 block text-[12.5px] font-semibold text-emerald-700"
              title="Học phí đóng đủ khi đăng ký. Khi lớp chốt sĩ số, phần giảm được hoàn vào ví: 2–3 người 20%, 4–5 người 35%, 6–8 người 40%."
            >
              Hoàn {refundNow >= 0.4 ? "40" : `${Math.round(refundNow * 100)}–40`}% khi chốt lớp
            </span>
          )}
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
        {onAddToCart && !soldOut && (
          <button
            type="button"
            onClick={onAddToCart}
            disabled={!canBuy || inCart || adding}
            aria-label={`Thêm môn ${item.subject} vào giỏ hàng`}
            className={`inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-brand-navy px-4 text-[14px] font-semibold text-brand-navy transition-colors hover:bg-brand-tint disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent ${FOCUS_RING}`}
          >
            <Icon name={inCart ? "check" : "add_shopping_cart"} className="text-[17px]" />
            {inCart ? "Đã trong giỏ" : adding ? "Đang thêm…" : "Thêm vào giỏ"}
          </button>
        )}
      </div>
    </article>
  );
}

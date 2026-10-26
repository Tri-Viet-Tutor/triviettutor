import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { CLASS_SIZE, GRADE_RANGE_LABEL } from "@/constants/classOptions";
import { COURSES } from "@/constants/courses";
import { SESSION_LENGTH_LABEL, WEEKLY_SESSIONS_LABEL } from "@/constants/pricing";
import { ROUTES } from "@/constants/routes";
import { formatVnd } from "@/utils/currency";
import { formatDayMonth } from "@/utils/date";
import { courseSchedule, enrollmentStatus, enrollmentStatusLabel, enrollmentWindowOf } from "@/utils/pricing";
import type { CourseTicketProps } from "@/interfaces/pricing";

/** Màu cuống vé, xoay vòng theo thứ tự khóa — lấy từ các màu nền mở đầu của những trang công khai */
const STUB_TONES = [
  "bg-brand-navy text-white",
  "bg-[#FFE2A6] text-brand-navyDeep",
  "bg-[#CFE0F8] text-brand-navyDeep",
  "bg-[#FCDFC9] text-brand-navyDeep",
  "bg-[#E4DFF6] text-brand-navyDeep",
];

/** Lỗ khuyết hình bán nguyệt ở hai đầu đường xé, tô cùng màu nền của phần danh sách (`surfaceClassName`) */
const NOTCH = "absolute h-5 w-5 rounded-full border border-slate-200";

/**
 * Một khóa học trong danh sách, trình bày như tấm vé vào lớp: cuống vé là màu tượng trưng kèm tên môn,
 * thân vé là thông tin khóa (khai giảng, gia sư, học thứ mấy và mấy giờ, lộ trình bấm để mở),
 * phần xé bên phải là học phí và hai nút "Thêm vào giỏ" / "Mua ngay".
 * Gọn theo chiều dọc để danh sách dài vẫn dễ lướt.
 */
export function CourseTicket({
  detailTo,
  course,
  inCart,
  today,
  onToggleCart,
  onBuyNow,
  surfaceClassName = "bg-[#F5F1E9]",
}: CourseTicketProps) {
  // Màu cuống vé theo vị trí khóa trong danh sách gốc (không đổi khi lọc / sắp xếp)
  const tone = STUB_TONES[Math.max(COURSES.indexOf(course), 0) % STUB_TONES.length];
  const enrollment = enrollmentWindowOf(course);
  const status = enrollment ? enrollmentStatus(enrollment, today) : null;
  // Chỉ nêu đợt đăng ký khi còn ý nghĩa với người mua (sắp mở hoặc đang mở)
  const upcoming = enrollment && (status === "OPEN" || status === "UPCOMING") ? enrollment : null;
  const schedule = courseSchedule(course);

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-shadow md:flex-row ${
        inCart
          ? "border-brand-navy shadow-[0_0_0_1px_#0B3A8C,0_22px_44px_-34px_rgba(8,42,102,0.7)]"
          : "border-slate-200 shadow-[0_22px_44px_-36px_rgba(8,42,102,0.5)]"
      }`}
    >
      {/* Cuống vé: chỉ màu tượng trưng và tên môn */}
      <div className={`shrink-0 px-5 py-3 md:w-[128px] md:py-5 ${tone}`}>
        <p className="text-[12.5px] font-bold uppercase tracking-[0.14em]">{course.subjectLabel}</p>
      </div>

      {/* Thân vé: thông tin khóa */}
      <div className="min-w-0 flex-1 px-5 py-5 sm:px-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13.5px] text-brand-muted">
          {GRADE_RANGE_LABEL}
          {upcoming && (
            <>
              <span aria-hidden="true">/</span>
              Khai giảng {formatDayMonth(upcoming.starts)}
              <span
                className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                  status === "OPEN" ? "bg-emerald-50 text-emerald-800" : "bg-brand-orange/20 text-brand-navyDeep"
                }`}
              >
                {enrollmentStatusLabel(upcoming, today)}
              </span>
            </>
          )}
        </p>
        <Link to={detailTo} className={"group mt-1.5 block rounded-md " + FOCUS_RING}>
          <h3 className="text-[20px] font-bold leading-tight text-brand-navy group-hover:underline">{course.name}</h3>
          <p className="mt-1 text-[14.5px] leading-relaxed text-brand-muted">{course.summary}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-navy">
            Xem chi tiết khóa học <Icon name="arrow_forward" className="text-[17px]" />
          </span>
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span className="flex -space-x-2">
            {course.tutors.map((tutor) => (
              <img
                key={tutor.name}
                src={tutor.image}
                alt=""
                loading="lazy"
                className="h-8 w-8 rounded-full border-2 border-white bg-brand-tint object-cover object-top"
              />
            ))}
          </span>
          <span className="text-[14px] font-semibold text-brand-ink">{course.tutors.map((tutor) => tutor.name).join(", ")}</span>
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13.5px] text-brand-ink">
          {/* Có lịch cụ thể thì ghi rõ học thứ mấy, mấy giờ; chưa có thì ghi số buổi mỗi tuần */}
          <li className="flex items-center gap-1.5">
            <Icon name="calendar_month" className="text-[17px] text-brand-navy" />
            {schedule ? <strong className="font-semibold">{schedule.days}</strong> : WEEKLY_SESSIONS_LABEL}
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="schedule" className="text-[17px] text-brand-navy" />
            {schedule ? <strong className="font-semibold">{schedule.time}</strong> : SESSION_LENGTH_LABEL}
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="groups" className="text-[17px] text-brand-navy" />
            {CLASS_SIZE.min} – {CLASS_SIZE.max} học viên
          </li>
        </ul>

        <details className="group mt-3">
          <summary
            className={`inline-flex cursor-pointer list-none items-center gap-1 rounded text-[13.5px] font-semibold text-brand-navy [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
          >
            <Icon name="expand_more" className="text-[19px] transition-transform duration-200 group-open:rotate-180" />
            Lộ trình {course.steps.length} chặng
            {upcoming && ` · chốt đăng ký ${formatDayMonth(upcoming.deadline)}`}
          </summary>
          <ol className="mt-3 space-y-2">
            {course.steps.map((step, index) => (
              <li key={step} className="flex gap-2.5 text-[14px] leading-snug text-brand-ink">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[12px] font-semibold text-brand-navy">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </details>
      </div>

      {/* Phần xé: học phí và nút mua, ngăn với thân vé bằng đường đục lỗ */}
      <div className="relative flex shrink-0 flex-col justify-center gap-3 border-t-2 border-dashed border-slate-300 px-5 py-5 md:w-[232px] md:border-l-2 md:border-t-0">
        <span aria-hidden="true" className={`${NOTCH} ${surfaceClassName} -left-2.5 -top-2.5 md:-left-2.5 md:-top-2.5`} />
        <span
          aria-hidden="true"
          className={`${NOTCH} ${surfaceClassName} -right-2.5 -top-2.5 md:-bottom-2.5 md:-left-2.5 md:right-auto md:top-auto`}
        />

        {course.tuitionFee !== undefined ? (
          <>
            <p className="md:text-right">
              <span className="whitespace-nowrap text-[23px] font-bold leading-tight tracking-tight text-brand-navy">
                {formatVnd(course.tuitionFee)}
              </span>
              <span className="ml-1.5 text-[13px] text-brand-muted md:ml-0 md:block">mỗi khóa</span>
            </p>
            <div className="flex gap-2 md:flex-col">
              <button
                type="button"
                aria-label={`Mua ngay khóa ${course.name}`}
                onClick={onBuyNow}
                className={`inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-brand-navy px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-navyDeep md:flex-none ${FOCUS_RING}`}
              >
                Mua ngay
                <Icon name="arrow_forward" className="text-[17px]" />
              </button>
              <button
                type="button"
                aria-pressed={inCart}
                aria-label={`${inCart ? "Bỏ" : "Thêm"} khóa ${course.name} ${inCart ? "khỏi" : "vào"} giỏ`}
                onClick={onToggleCart}
                className={`inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[14px] font-semibold transition-colors md:flex-none ${FOCUS_RING} ${
                  inCart ? "border-brand-navy bg-brand-tint text-brand-navy" : "border-slate-300 text-brand-navy hover:border-brand-navy"
                }`}
              >
                <Icon name={inCart ? "check" : "add_shopping_cart"} className="text-[17px]" />
                {inCart ? "Đã trong giỏ" : "Thêm vào giỏ"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[14.5px] font-semibold text-brand-muted md:text-right">Học phí báo khi tư vấn</p>
            <Link
              to={ROUTES.contactForm}
              className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-brand-navy px-4 text-[14px] font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white ${FOCUS_RING}`}
            >
              Nhận báo giá
              <Icon name="arrow_forward" className="text-[17px]" />
            </Link>
          </>
        )}
      </div>
    </article>
  );
}

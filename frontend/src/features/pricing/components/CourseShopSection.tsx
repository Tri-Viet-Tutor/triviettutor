import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER, FOCUS_RING } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { cartCourses } from "@/features/checkout/data/checkout";
import { CartBar } from "@/features/pricing/components/CartBar";
import { CourseTicket } from "@/features/pricing/components/CourseTicket";
import { ShopFilterPanel } from "@/features/pricing/components/ShopFilterPanel";
import { PURCHASE_STEPS } from "@/features/pricing/data/pricing";
import {
  DEFAULT_SHOP_FILTERS,
  filterCourses,
  hasActiveFilters,
  SHOP_SORT_OPTIONS,
  sortCourses,
  type ShopFilters,
  type ShopSort,
} from "@/features/pricing/data/shopFilters";
import { PORTAL_SURFACE } from "@/features/portal/data/ui";
import { useCartStore } from "@/stores/cartStore";
import { startOfToday } from "@/utils/date";

/** Số khóa hiện mỗi lần; còn nữa thì có nút "Xem thêm" */
const PAGE_SIZE = 6;

interface CourseShopSectionProps {
  variant?: "public" | "student";
}

/**
 * Danh sách khóa học để mua, làm cho danh sách dài: ô tìm,
 * bộ lọc (môn học, đợt đăng ký, thứ học trong tuần, học phí), sắp xếp, và mỗi khóa là một tấm "vé lớp học" gọn.
 * Giỏ hàng là thanh cố định ở đáy màn hình.
 * `variant="student"`: nhúng trong khu học viên — bỏ tiêu đề và các bước mua (trang đã có tiêu đề riêng,
 * học viên không phải tạo tài khoản), dùng nền và trang thanh toán của khu học viên.
 */
export function CourseShopSection({ variant = "public" }: CourseShopSectionProps) {
  const inStudentArea = variant === "student";
  const checkoutTo = inStudentArea ? ROUTES.studentCheckout : ROUTES.checkout;
  const navigate = useNavigate();
  const subjects = useCartStore((state) => state.subjects);
  const addCourse = useCartStore((state) => state.add);
  const toggleCourse = useCartStore((state) => state.toggle);
  const clearCart = useCartStore((state) => state.clear);
  const today = useMemo(() => startOfToday(), []);

  const [filters, setFilters] = useState<ShopFilters>(DEFAULT_SHOP_FILTERS);
  const [sort, setSort] = useState<ShopSort>("DEFAULT");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /** Đổi bộ lọc thì quay về trang kết quả đầu tiên */
  function updateFilters(patch: Partial<ShopFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setVisibleCount(PAGE_SIZE);
  }

  const results = useMemo(() => sortCourses(filterCourses(filters, today), sort), [filters, sort, today]);

  function buyNow(subject: string) {
    addCourse(subject);
    navigate(checkoutTo);
  }

  return (
    <section id="course-shop" className={inStudentArea ? "" : "scroll-mt-[120px] bg-[#F5F1E9] pb-16 pt-12 lg:pb-20 lg:pt-16"}>
      <div className={inStudentArea ? "" : CONTAINER}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className={inStudentArea ? "hidden" : ""}>
            <h2 className="text-[28px] font-extrabold leading-tight tracking-tight text-brand-navy lg:text-[36px]">Chọn Khóa Học</h2>
            {/* Ba bước mua */}
            <ol className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13.5px] text-brand-muted">
              {PURCHASE_STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  {index > 0 && <Icon name="chevron_right" className="text-[17px]" />}
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy text-[11.5px] font-semibold text-white">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Ô tìm */}
          <label className="flex h-[52px] w-full items-center gap-3 rounded-full border-2 border-brand-navy bg-white pl-5 pr-2 shadow-[0_14px_28px_-20px_rgba(8,42,102,0.7)] focus-within:ring-2 focus-within:ring-brand-orange lg:max-w-[460px]">
            <Icon name="search" className="text-[23px] text-brand-navy" />
            <span className="sr-only">Tìm khóa học</span>
            <input
              type="search"
              value={filters.query}
              onChange={(event) => updateFilters({ query: event.target.value })}
              placeholder="Môn học, khóa học hoặc tên gia sư"
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15.5px] text-brand-ink outline-none placeholder:text-slate-400 focus:ring-0"
            />
            {filters.query && (
              <button
                type="button"
                onClick={() => updateFilters({ query: "" })}
                aria-label="Xóa chữ đang tìm"
                className={`flex h-9 w-9 items-center justify-center rounded-full text-brand-muted hover:bg-slate-100 hover:text-brand-navy ${FOCUS_RING}`}
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            )}
          </label>
        </div>

        <div className={`grid grid-cols-1 items-start gap-6 lg:grid-cols-[264px_1fr] lg:gap-8 ${inStudentArea ? "mt-6" : "mt-8"}`}>
          <aside className={`lg:sticky ${inStudentArea ? "lg:top-24" : "lg:top-[150px]"}`}>
            <ShopFilterPanel
              subject={filters.subject}
              enrollment={filters.enrollment}
              schedule={filters.schedule}
              maxFee={filters.maxFee}
              onSubjectChange={(subject) => updateFilters({ subject })}
              onEnrollmentChange={(enrollment) => updateFilters({ enrollment })}
              onScheduleChange={(schedule) => updateFilters({ schedule })}
              onMaxFeeChange={(maxFee) => updateFilters({ maxFee })}
              canReset={hasActiveFilters(filters)}
              onReset={() => updateFilters(DEFAULT_SHOP_FILTERS)}
            />
          </aside>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p aria-live="polite" className="text-[14.5px] text-brand-muted">
                <strong className="text-[18px] font-bold text-brand-navy">{results.length}</strong> khóa học
              </p>
              <label className="flex items-center gap-2.5 text-[14px] text-brand-muted">
                Sắp xếp
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as ShopSort)}
                  className="h-10 rounded-md border border-slate-300 bg-white pl-3 pr-9 text-[14.5px] font-semibold text-brand-ink outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
                >
                  {SHOP_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {results.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {results.slice(0, visibleCount).map((course) => (
                  <li key={course.id}>
                    <CourseTicket
                      course={course}
                      inCart={subjects.includes(course.subject)}
                      today={today}
                      onToggleCart={() => toggleCourse(course.subject)}
                      onBuyNow={() => buyNow(course.subject)}
                      surfaceClassName={inStudentArea ? PORTAL_SURFACE : undefined}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-brand-navy/30 px-6 py-12 text-center">
                <Icon name="search_off" className="text-[44px] text-brand-navy/40" />
                <p className="mt-2 text-[17px] font-bold text-brand-navy">Không có khóa học phù hợp</p>
                <button
                  type="button"
                  onClick={() => updateFilters(DEFAULT_SHOP_FILTERS)}
                  className={`mt-4 inline-flex h-10 items-center rounded-md bg-brand-navy px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-navyDeep ${FOCUS_RING}`}
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {results.length > visibleCount && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className={`inline-flex h-11 items-center gap-2 rounded-md border border-brand-navy px-6 text-[14.5px] font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white ${FOCUS_RING}`}
                >
                  Xem thêm {Math.min(PAGE_SIZE, results.length - visibleCount)} khóa học
                  <Icon name="expand_more" className="text-[19px]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CartBar courses={cartCourses(subjects)} onClear={clearCart} checkoutTo={checkoutTo} inStudentArea={inStudentArea} />
    </section>
  );
}

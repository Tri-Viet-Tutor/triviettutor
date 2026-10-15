import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER, FOCUS_RING } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { cartTotal } from "@/utils/checkout";
import { formatVnd } from "@/utils/currency";
import type { CartBarProps } from "@/interfaces/pricing";

/**
 * Giỏ hàng dạng thanh cố định ở đáy màn hình, chỉ hiện khi giỏ có khóa:
 * tên các khóa đã chọn, tổng tiền và nút sang trang thanh toán (bỏ từng khóa ở trang đó hoặc ngay trên vé).
 */
export function CartBar({ courses, onClear, checkoutTo = ROUTES.checkout, inStudentArea = false }: CartBarProps) {
  if (courses.length === 0) return null;
  return (
    <div
      className={`fixed inset-x-0 z-30 border-t border-slate-200 bg-white shadow-[0_-14px_32px_-20px_rgba(8,42,102,0.55)] ${
        inStudentArea ? "bottom-[60px] lg:bottom-0 lg:left-[240px]" : "bottom-0"
      }`}
    >
      {/* Trong khu học viên dùng khung nội dung của khu thay cho CONTAINER */}
      <div
        className={`${inStudentArea ? "mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-10" : CONTAINER} flex items-center justify-between gap-4 py-3`}
      >
        <div aria-live="polite" className="flex min-w-0 items-center gap-3.5">
          <span className="relative hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-tint sm:flex">
            <Icon name="shopping_cart" className="text-[23px] text-brand-navy" />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[12px] font-bold text-brand-navyDeep">
              {courses.length}
            </span>
          </span>
          <p className="min-w-0 leading-tight">
            <span className="block truncate text-[13.5px] text-brand-muted">
              <span className="sm:hidden">{courses.length} khóa · </span>
              {courses.map((course) => course.name).join(", ")}
            </span>
            <span className="block text-[20px] font-bold tracking-tight text-brand-navy">{formatVnd(cartTotal(courses))}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={onClear}
            className="hidden rounded text-[14px] font-semibold text-brand-muted underline-offset-4 hover:text-brand-navy hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy sm:block"
          >
            Bỏ hết
          </button>
          <Link
            to={checkoutTo}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-navy px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-navyDeep ${FOCUS_RING}`}
          >
            Thanh toán
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>
      </div>
    </div>
  );
}

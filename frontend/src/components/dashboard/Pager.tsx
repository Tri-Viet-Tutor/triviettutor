import { PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import type { PagerProps } from "@/interfaces/portal";

/** Nút "Trang trước / Trang sau" cho danh sách phân trang; tự ẩn khi chỉ có một trang. */
export function Pager({ page, totalPages, onChange, label }: PagerProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="mt-4 flex items-center justify-between gap-3">
      <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)} className={PORTAL_BTN_SECONDARY}>
        Trang trước
      </button>
      <span className="text-[14px] tabular-nums text-brand-muted">
        Trang {page + 1} / {totalPages}
      </span>
      <button type="button" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)} className={PORTAL_BTN_SECONDARY}>
        Trang sau
      </button>
    </nav>
  );
}

import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD } from "@/constants/classNames";
import type { PortalEmptyProps, PortalErrorProps, PortalLoadingProps } from "@/interfaces/portal";

/** Nút viền xanh "Thử lại" */
const BTN =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-brand-navy px-4 text-[14px] font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Khung giữ chỗ trong lúc tải dữ liệu. */
export function PortalLoading({ label, rows = 3 }: PortalLoadingProps) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-[68px] animate-pulse rounded-2xl border border-brand-sandLine/70 bg-gradient-to-r from-white via-brand-sand/60 to-white motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

/** Báo không tải được dữ liệu, kèm nút thử lại. */
export function PortalError({ message, onRetry }: PortalErrorProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-start gap-3 border-l-4 border-l-red-500 p-5 sm:flex-row sm:items-center sm:justify-between ${PORTAL_CARD}`}
    >
      <p className="flex items-center gap-3 text-[15px] text-brand-ink">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
          <Icon name="cloud_off" className="text-[22px] text-red-600" />
        </span>
        {message}
      </p>
      <button type="button" onClick={onRetry} className={BTN}>
        Thử lại
      </button>
    </div>
  );
}

/** Chỗ chưa có dữ liệu: nói rõ vì sao trống và làm gì tiếp. */
export function PortalEmpty({ icon, title, description, action }: PortalEmptyProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-sandLine bg-white/70 px-6 py-12 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-sand">
        <Icon name={icon} className="text-[34px] text-brand-orange" />
      </span>
      <p className="mt-3 text-[16.5px] font-bold text-brand-navy">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-[14.5px] leading-relaxed text-brand-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

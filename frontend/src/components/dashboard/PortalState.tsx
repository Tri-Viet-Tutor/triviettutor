import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD } from "@/constants/classNames";
import type { PortalEmptyProps, PortalErrorProps, PortalLoadingProps } from "@/interfaces/portal";

/** Nút viền xanh "Thử lại" */
const BTN =
  "inline-flex h-10 items-center justify-center rounded-md border border-brand-navy px-4 text-[14px] font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Khung giữ chỗ trong lúc tải dữ liệu. */
export function PortalLoading({ label, rows = 3 }: PortalLoadingProps) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-[68px] animate-pulse rounded-2xl bg-white/80 motion-reduce:animate-none" />
      ))}
    </div>
  );
}

/** Báo không tải được dữ liệu, kèm nút thử lại. */
export function PortalError({ message, onRetry }: PortalErrorProps) {
  return (
    <div role="alert" className={`flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${PORTAL_CARD}`}>
      <p className="flex items-center gap-2 text-[15px] text-brand-ink">
        <Icon name="cloud_off" className="text-[22px] text-red-600" />
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
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
      <Icon name={icon} className="text-[40px] text-slate-300" />
      <p className="mt-2 text-[16px] font-semibold text-brand-navy">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-[14.5px] leading-relaxed text-brand-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

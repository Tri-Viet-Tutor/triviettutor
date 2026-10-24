import { Icon } from "@/components/ui/Icon";
import type { PortalPageHeaderProps } from "@/interfaces/portal";

/** Tiêu đề của một trang trong các khu sau đăng nhập: biểu tượng, tiêu đề có gạch bút dạ cam, dòng mô tả và nút bên phải. */
export function PortalPageHeader({ title, description, action, icon }: PortalPageHeaderProps) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {icon && (
          <span
            aria-hidden="true"
            className="mt-1 hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-white shadow-[0_10px_22px_-12px_rgba(11,58,140,0.9)] sm:flex"
          >
            <Icon name={icon} className="text-[26px]" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-brand-navy sm:text-[30px]">
            {/* Nét bút dạ vàng dưới chữ, giống tiêu đề các trang công khai */}
            <span className="bg-[linear-gradient(transparent_62%,#FFD98A_62%,#FFD98A_90%,transparent_90%)] [box-decoration-break:clone]">
              {title}
            </span>
          </h1>
          {description && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-brand-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

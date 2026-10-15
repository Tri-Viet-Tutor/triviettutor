import type { PortalPageHeaderProps } from "@/interfaces/portal";

/** Tiêu đề của một trang trong các khu sau đăng nhập. */
export function PortalPageHeader({ title, description, action }: PortalPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-brand-navy sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-brand-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

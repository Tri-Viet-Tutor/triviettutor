import { type ReactNode } from "react";

interface PortalPageHeaderProps {
  title: string;
  /** Dòng phụ dưới tiêu đề */
  description?: string;
  /** Phần nằm bên phải tiêu đề (bộ lọc, nút…) */
  action?: ReactNode;
}

/** Tiêu đề của một trang trong khu học viên. */
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

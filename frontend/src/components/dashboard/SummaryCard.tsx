import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD } from "@/constants/classNames";
import type { SummaryCardProps } from "@/interfaces/portal";

/** Thẻ tổng kết ở cột phải trang Tổng quan: tiêu đề, một khối tuỳ ý và các dòng "nhãn — con số". */
export function SummaryCard({ id, title, linkLabel, linkTo, children, rowsTitle, rows }: SummaryCardProps) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[16px] font-bold text-brand-ink">
          {title}
        </h2>
        {linkLabel && linkTo && (
          <Link
            to={linkTo}
            className="rounded text-[14.5px] font-medium text-brand-ink underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            {linkLabel}
          </Link>
        )}
      </div>

      <div className={`p-4 ${PORTAL_CARD}`}>
        {children}
        {rowsTitle && <h3 className={`text-[16px] font-bold text-brand-ink ${children ? "mt-5" : ""}`}>{rowsTitle}</h3>}
        <dl className={`space-y-2.5 ${rowsTitle ? "mt-2.5" : ""}`}>
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-[14.5px] text-brand-ink">
                <Icon name={row.icon} className={`text-[19px] ${row.iconClassName}`} />
                {row.label}
              </dt>
              <dd className={`text-[16px] font-bold tabular-nums ${row.valueClassName}`}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

import { Icon } from "@/components/ui/Icon";
import { nameInitial } from "@/utils/sessions";
import type { PortalGreetingProps } from "@/interfaces/portal";

/** Lời chào gọn ở đầu trang Tổng quan: chữ cái đại diện, lời chào và ngày hôm nay. */
export function PortalGreeting({ fullName, name, description, stats }: PortalGreetingProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy text-[18px] font-bold text-white"
        >
          {nameInitial(fullName)}
        </span>
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-brand-ink">Xin chào, {name}</h1>
          <p className="flex items-center gap-1 text-[13.5px] text-brand-muted">
            <Icon name="calendar_today" className="text-[15px]" />
            {description}
          </p>
        </div>
      </div>

      {stats && stats.length > 0 && (
        <dl className="flex flex-wrap gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 rounded-lg border border-brand-sandLine bg-white px-3 py-1.5 text-[13px]"
            >
              <Icon name={stat.icon} className="text-[16px] text-brand-orangeHover" />
              <dt className="text-brand-muted">{stat.label}</dt>
              <dd className="font-bold tabular-nums text-brand-ink">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

import type { FilterTabsProps } from "@/interfaces/portal";

/** Dãy thẻ lọc nhỏ: sắp tới / đã qua, trạng thái đơn, vai trò người dùng… */
export function FilterTabs<T extends string>({ label, tabs, value, onChange }: FilterTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex max-w-full self-start overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-brand-sandLine"
    >
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy ${
              active
                ? "bg-brand-navy text-white shadow-[0_6px_14px_-8px_rgba(11,58,140,0.9)]"
                : "text-brand-muted hover:bg-brand-sand hover:text-brand-navy"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[12px] tabular-nums ${active ? "bg-white/20 text-white" : "bg-brand-sand text-brand-muted"}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

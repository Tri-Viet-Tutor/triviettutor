import type { FilterTabsProps } from "@/interfaces/portal";

/** Dãy thẻ lọc nhỏ: sắp tới / đã qua, trạng thái đơn, vai trò người dùng… */
export function FilterTabs<T extends string>({ label, tabs, value, onChange }: FilterTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex max-w-full self-start overflow-x-auto rounded-lg bg-white p-1 ring-1 ring-slate-200"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy ${
            value === tab.value ? "bg-brand-navy text-white" : "text-brand-muted hover:text-brand-navy"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1 tabular-nums opacity-80">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

import { nameInitial } from "@/utils/sessions";
import type { PortalGreetingProps } from "@/interfaces/portal";

/** Lời chào mở đầu trang Tổng quan của mỗi khu. */
export function PortalGreeting({ fullName, name, description }: PortalGreetingProps) {
  return (
    <div className="mb-7 flex items-center gap-4 border-b border-slate-200 pb-6">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-navy text-[24px] font-bold text-white"
      >
        {nameInitial(fullName)}
      </span>
      <div className="min-w-0">
        <h1 className="text-[24px] font-bold leading-tight tracking-tight text-brand-ink sm:text-[26px]">Xin chào, {name}</h1>
        <p className="mt-0.5 text-[15px] text-brand-muted">{description}</p>
      </div>
    </div>
  );
}

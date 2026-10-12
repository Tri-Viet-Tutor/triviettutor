import { Icon } from "@/components/ui/Icon";

interface CheckoutStepsProps {
  steps: string[];
  /** Vị trí bước đang làm (tính từ 0); bằng số bước nghĩa là đã xong hết */
  active: number;
}

/** Dãy bước của trang thanh toán: bước đã xong có dấu tích, bước đang làm tô đậm. */
export function CheckoutSteps({ steps, active }: CheckoutStepsProps) {
  return (
    <ol className="mb-7 flex items-center gap-3 text-[14px]">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-2.5" aria-current={index === active ? "step" : undefined}>
          {index > 0 && <span aria-hidden="true" className="h-px w-5 bg-slate-300 sm:w-8" />}
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold ${
              index <= active ? "bg-brand-navy text-white" : "bg-slate-200 text-brand-muted"
            }`}
          >
            {index < active ? <Icon name="check" className="text-[15px]" /> : index + 1}
          </span>
          {/* Màn hình hẹp chỉ hiện tên bước đang làm */}
          <span className={index === active ? "font-semibold text-brand-navy" : "hidden text-brand-muted sm:inline"}>{step}</span>
        </li>
      ))}
    </ol>
  );
}

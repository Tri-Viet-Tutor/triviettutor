import { type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { TONE_CHIP, type Tone } from "@/features/portal/data/labels";

interface StatusChipProps {
  tone: Tone;
  /** Tên biểu tượng Material Symbols (tuỳ chọn) */
  icon?: string;
  children: ReactNode;
}

/** Nhãn trạng thái nhỏ: buổi học, điểm danh, đơn xin nghỉ. */
export function StatusChip({ tone, icon, children }: StatusChipProps) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${TONE_CHIP[tone]}`}>
      {icon && <Icon name={icon} className="text-[15px]" />}
      {children}
    </span>
  );
}

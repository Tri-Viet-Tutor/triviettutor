import { Icon } from "@/components/ui/Icon";
import { TONE_CHIP } from "@/constants/labels";
import type { StatusChipProps } from "@/interfaces/portal";

// Nhãn trạng thái nhỏ: buổi học, điểm danh, đơn xin nghỉ.
export function StatusChip({ tone, icon, children }: StatusChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2.5 py-1 text-[12.5px] font-semibold ${TONE_CHIP[tone]}`}
    >
      {icon && <Icon name={icon} className="text-[15px]" />}
      {children}
    </span>
  );
}

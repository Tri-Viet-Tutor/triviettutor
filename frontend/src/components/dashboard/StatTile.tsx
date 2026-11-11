import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD } from "@/constants/classNames";
import type { StatTileProps } from "@/interfaces/portal";

// Màu ô biểu tượng theo tông
const TONE: Record<NonNullable<StatTileProps["tone"]>, string> = {
  navy: "bg-brand-tint text-brand-navy",
  orange: "bg-brand-orangeSubtle text-brand-orangeHover",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-600",
};

// Ô số liệu nhỏ: biểu tượng, con số lớn và nhãn.
export function StatTile({ label, value, icon, tone = "navy", hint }: StatTileProps) {
  return (
    <div className={`flex min-w-0 flex-col items-start gap-2 p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${PORTAL_CARD}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${TONE[tone]}`}>
        <Icon name={icon} className="text-[22px] sm:text-[25px]" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-brand-muted">{label}</p>
        {
          // Số tiền dài (16.880.000 VNĐ) dùng cỡ chữ nhỏ hơn để không tràn ô
        }
        <p
          className={`font-extrabold leading-tight tracking-tight text-brand-ink tabular-nums [overflow-wrap:anywhere] ${
            value.length > 9 ? "text-[17px] sm:text-[19px] xl:text-[20px]" : "text-[22px] sm:text-[24px]"
          }`}
        >
          {value}
        </p>
        {hint && <p className="truncate text-[12.5px] text-brand-muted">{hint}</p>}
      </div>
    </div>
  );
}

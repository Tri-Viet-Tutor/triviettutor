import { Icon } from "@/components/ui/Icon";
import type { OptionSelectProps } from "@/interfaces/catalog";

/**
 * Một mục của phiếu chọn lớp ở dạng ô chọn sổ xuống — dùng cho danh sách còn dài thêm
 * (ví dụ môn học): thêm lựa chọn mới không làm phiếu cao lên.
 */
export function OptionSelect<T extends string>({ step, legend, name, options, value, onChange }: OptionSelectProps<T>) {
  // Lựa chọn đang chọn — để hiện biểu tượng của nó trong ô
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div>
      <label htmlFor={name} className="flex items-center gap-2.5 text-[17px] font-bold text-brand-navy">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange text-[14px] font-extrabold text-brand-navyDeep"
        >
          {step}
        </span>
        {legend}
      </label>
      <div className="relative mt-3.5">
        {selected.icon && (
          <Icon
            name={selected.icon}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[22px] text-brand-orangeHover"
          />
        )}
        <select
          id={name}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className={`h-14 w-full cursor-pointer appearance-none rounded-xl border-2 border-brand-navy bg-white bg-none pr-12 text-[16px] font-bold text-brand-navy shadow-[0_10px_18px_-14px_rgba(8,42,102,0.8)] outline-none transition-colors hover:bg-brand-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy ${
            selected.icon ? "pl-12" : "pl-4"
          }`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="expand_more" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[26px] text-brand-navy" />
      </div>
    </div>
  );
}

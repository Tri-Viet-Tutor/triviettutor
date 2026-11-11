import { Icon } from "@/components/ui/Icon";
import type { OptionGroupProps } from "@/interfaces/catalog";

// Một mục của phiếu chọn lớp: nhóm ô đánh dấu, chỉ chọn được một ô.
export function OptionGroup<T extends string>({
  step,
  legend,
  name,
  options,
  value,
  onChange,
  columns = "grid-cols-2 sm:grid-cols-3",
}: OptionGroupProps<T>) {
  return (
    <fieldset>
      <legend className="flex items-center gap-2.5 text-[17px] font-bold text-brand-navy">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange text-[14px] font-extrabold text-brand-navyDeep"
        >
          {step}
        </span>
        {legend}
      </legend>
      <div className={`mt-3.5 grid gap-3 ${columns}`}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={`relative flex cursor-pointer items-start gap-2.5 rounded-xl border-2 px-3.5 py-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-navy ${
                checked
                  ? "border-brand-navy bg-brand-navy text-white shadow-[0_10px_18px_-12px_rgba(8,42,102,0.8)]"
                  : "border-brand-navy/15 bg-white text-brand-ink hover:border-brand-navy/45"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {
                // Ô đánh dấu vẽ tay
              }
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 ${
                  checked ? "border-brand-orange bg-brand-orange text-brand-navyDeep" : "border-brand-navy/35"
                }`}
              >
                {checked && <Icon name="check" className="text-[15px] font-bold" />}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="flex items-center gap-1.5 text-[15px] font-bold">
                  {option.icon && (
                    <Icon name={option.icon} className={`text-[18px] ${checked ? "text-brand-orange" : "text-brand-navy"}`} />
                  )}
                  {option.label}
                </span>
                <span className={`mt-1 block text-[12.5px] ${checked ? "text-white/80" : "text-brand-muted"}`}>{option.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

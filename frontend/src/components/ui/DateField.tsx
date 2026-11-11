import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { usePopover } from "@/components/ui/usePopoverPosition";
import { addDays, parseIsoDate, startOfToday, toIsoDate } from "@/utils/date";
import type { DateFieldProps } from "@/interfaces/ui";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const PANEL_WIDTH = 296;
const PANEL_HEIGHT = 352;

// "2026-10-30" → "T6, 30/10/2026"
function display(iso: string): string {
  const date = parseIsoDate(iso);
  const weekday = WEEKDAYS[(date.getDay() + 6) % 7];
  return `${weekday}, ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

// Ô chọn ngày thay cho <input type="date"> của trình duyệt: lịch tháng tiếng Việt (tuần bắt đầu Thứ Hai),
// ngày đang chọn tô navy, hôm nay viền cam, ngày ngoài min/max bị khóa; có nút "Hôm nay" và "Xóa".
export function DateField({
  id,
  value,
  onChange,
  min,
  max,
  disabledDate,
  className = "",
  placeholder = "Chọn ngày",
  required,
  disabled,
  ...rest
}: DateFieldProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { open, setOpen, style } = usePopover(triggerRef, panelRef, PANEL_WIDTH, PANEL_HEIGHT);
  const today = startOfToday();
  const todayIso = toIsoDate(today);
  const base = value ? parseIsoDate(value) : min && min > todayIso ? parseIsoDate(min) : today;
  const [month, setMonth] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));

  // Ngày nằm ngoài khoảng cho phép hoặc bị khóa
  const outOfRange = (iso: string) => (min !== undefined && iso < min) || (max !== undefined && iso > max) || Boolean(disabledDate?.(iso));
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = addDays(first, -((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  // Mở / đóng lịch chọn ngày, mở ra ở đúng tháng đang chọn
  function toggle() {
    if (disabled) return;
    if (!open) {
      const anchor = value ? parseIsoDate(value) : base;
      setMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    }
    setOpen(!open);
  }
  // Chọn một ngày, đóng lịch và trả focus về ô
  function pick(iso: string) {
    onChange(iso);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-required={required}
        aria-label={rest["aria-label"]}
        onClick={toggle}
        className={`${className} flex items-center justify-between gap-2 text-left ${open ? "border-brand-navy ring-1 ring-brand-navy" : ""}`}
      >
        <span className={`truncate ${value ? "" : "text-slate-400"}`}>{value ? display(value) : placeholder}</span>
        <Icon name="calendar_month" className="shrink-0 text-[19px] text-brand-navy/70" />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Chọn ngày"
          style={{ position: "fixed", top: style.top, left: style.left, width: PANEL_WIDTH, zIndex: 80 }}
          className="rounded-2xl border border-brand-sandLine bg-white p-3 text-brand-ink shadow-[0_24px_48px_-20px_rgba(8,42,102,0.45)]"
        >
          <div className="flex items-center justify-between px-1 pb-2">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              aria-label="Tháng trước"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-navy hover:bg-brand-tint"
            >
              <Icon name="chevron_left" className="text-[20px]" />
            </button>
            <p className="text-[14.5px] font-extrabold text-brand-navy">
              Tháng {month.getMonth() + 1}, {month.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              aria-label="Tháng sau"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-navy hover:bg-brand-tint"
            >
              <Icon name="chevron_right" className="text-[20px]" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((label, index) => (
              <span key={label} className={`py-1 text-[11.5px] font-bold ${index >= 5 ? "text-brand-orange" : "text-brand-muted"}`}>
                {label}
              </span>
            ))}
            {cells.map((date) => {
              const iso = toIsoDate(date);
              const inMonth = date.getMonth() === month.getMonth();
              const selected = iso === value;
              const isToday = iso === todayIso;
              const blocked = outOfRange(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={blocked}
                  onClick={() => pick(iso)}
                  aria-pressed={selected}
                  aria-label={display(iso)}
                  className={`flex h-9 items-center justify-center rounded-lg text-[13.5px] tabular-nums transition-colors ${
                    selected
                      ? "bg-brand-navy font-bold text-white shadow-[0_6px_14px_-8px_rgba(11,58,140,0.9)]"
                      : blocked
                        ? "cursor-not-allowed text-slate-300 line-through decoration-slate-200"
                        : `${inMonth ? "font-semibold text-brand-ink" : "text-slate-400"} hover:bg-brand-tint`
                  } ${isToday && !selected ? "ring-2 ring-inset ring-brand-orange" : ""}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-brand-sandLine px-1 pt-2">
            <button
              type="button"
              disabled={outOfRange(todayIso)}
              onClick={() => pick(todayIso)}
              className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-brand-navy hover:bg-brand-tint disabled:opacity-40"
            >
              Hôm nay
            </button>
            {value && !required && (
              <button
                type="button"
                onClick={() => pick("")}
                className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-brand-muted hover:bg-brand-sand hover:text-brand-ink"
              >
                Xóa
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

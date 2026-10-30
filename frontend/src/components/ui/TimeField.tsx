import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { usePopover } from "@/components/ui/usePopoverPosition";

const PANEL_WIDTH = 216;
const PANEL_HEIGHT = 286;

export interface TimeFieldProps {
  id?: string;
  /** "HH:mm" hoặc "" */
  value: string;
  onChange: (value: string) => void;
  /** Bước phút, mặc định 15 */
  step?: number;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Ô chọn giờ thay cho <input type="time"> của trình duyệt: hai cột giờ / phút (bước 15 phút),
 * chọn giờ trước rồi phút; giờ đang chọn tô navy và tự cuộn tới.
 */
export function TimeField({ id, value, onChange, step = 15, className = "", placeholder = "--:--", required, disabled, ...rest }: TimeFieldProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { open, setOpen, style } = usePopover(triggerRef, panelRef, PANEL_WIDTH, PANEL_HEIGHT);
  const [hour, minute] = value ? value.split(":").map(Number) : [NaN, NaN];
  const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, index) => index * step);

  // Mở ra thì cuộn tới giờ / phút đang chọn
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelectorAll<HTMLElement>("[data-selected='true']").forEach((element) => element.scrollIntoView({ block: "center" }));
  }, [open]);

  function setTime(h: number, m: number, close: boolean) {
    onChange(`${pad(h)}:${pad(m)}`);
    if (close) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const cell = (selected: boolean) =>
    `flex h-8 w-full items-center justify-center rounded-lg text-[13.5px] font-semibold tabular-nums transition-colors ${
      selected ? "bg-brand-navy text-white" : "text-brand-ink hover:bg-brand-tint"
    }`;

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
        onClick={() => !disabled && setOpen(!open)}
        className={`${className} flex items-center justify-between gap-2 text-left tabular-nums ${open ? "border-brand-navy ring-1 ring-brand-navy" : ""}`}
      >
        <span className={value ? "" : "text-slate-400"}>{value ? value.slice(0, 5) : placeholder}</span>
        <Icon name="schedule" className="shrink-0 text-[19px] text-brand-navy/70" />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Chọn giờ"
          style={{ position: "fixed", top: style.top, left: style.left, width: PANEL_WIDTH, zIndex: 80 }}
          className="rounded-2xl border border-brand-sandLine bg-white p-2.5 text-brand-ink shadow-[0_24px_48px_-20px_rgba(8,42,102,0.45)]"
        >
          <div className="grid grid-cols-2 gap-2 px-1 pb-1.5 text-center text-[11.5px] font-bold uppercase tracking-wide text-brand-muted">
            <span>Giờ</span>
            <span>Phút</span>
          </div>
          <div className="grid h-[220px] grid-cols-2 gap-2">
            <div className="space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {Array.from({ length: 24 }, (_, h) => (
                <button key={h} type="button" data-selected={h === hour} onClick={() => setTime(h, Number.isNaN(minute) ? 0 : minute, false)} className={cell(h === hour)}>
                  {pad(h)}
                </button>
              ))}
            </div>
            <div className="space-y-0.5 overflow-y-auto border-l border-brand-sandLine pl-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {minutes.map((m) => (
                <button key={m} type="button" data-selected={m === minute} onClick={() => setTime(Number.isNaN(hour) ? 8 : hour, m, true)} className={cell(m === minute)}>
                  {pad(m)}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1.5 border-t border-brand-sandLine pt-1.5 text-center text-[11.5px] text-brand-muted">Chọn giờ, rồi chọn phút</p>
        </div>
      )}
    </>
  );
}

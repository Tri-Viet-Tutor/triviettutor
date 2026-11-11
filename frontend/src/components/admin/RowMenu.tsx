import { useEffect, useRef, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import type { RowMenuItem } from "@/interfaces/ui";

// Nút ⋮ mở menu thao tác của một dòng: Esc / bấm ra ngoài để đóng, phím ↑ ↓ để di chuyển
export function RowMenu({
  label,
  open,
  onOpenChange,
  items,
}: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: RowMenuItem[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not(:disabled)")?.focus();
    // Bấm ra ngoài menu thì đóng menu
    function onPointer(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) onOpenChange(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open, onOpenChange]);

  // Đóng menu và trả focus về nút mở menu
  function close() {
    onOpenChange(false);
    buttonRef.current?.focus();
  }

  // Di chuyển giữa các mục menu bằng phím mũi tên, Home, End, Esc
  function onMenuKey(event: KeyboardEvent) {
    const enabled = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? []);
    const index = enabled.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      enabled[(index + 1) % enabled.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      enabled[(index - 1 + enabled.length) % enabled.length]?.focus();
    } else if (event.key === "Tab") {
      onOpenChange(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative z-10 justify-self-end md:justify-self-center">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Thao tác với ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={`flex h-10 w-10 items-center justify-center rounded-lg text-brand-muted transition-colors hover:bg-brand-sand hover:text-brand-navy ${
          open ? "bg-brand-sand text-brand-navy" : ""
        } ${FOCUS_RING}`}
      >
        <Icon name="more_vert" className="text-[24px]" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Thao tác với ${label}`}
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-brand-sandLine bg-white p-1 shadow-[0_16px_40px_-16px_rgba(8,42,102,0.35)]"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                onOpenChange(false);
                item.onSelect();
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] font-medium outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                item.tone === "danger"
                  ? "text-red-700 hover:bg-red-50 focus-visible:bg-red-50"
                  : "text-brand-ink hover:bg-brand-tint focus-visible:bg-brand-tint"
              }`}
            >
              <Icon name={item.icon} className="text-[19px]" />
              <span className="flex-1">{item.label}</span>
              {item.hint && <span className="text-[11.5px] text-brand-muted">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

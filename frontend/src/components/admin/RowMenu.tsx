import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import type { RowMenuItem } from "@/interfaces/ui";

// Nút ⋮ mở menu thao tác của một dòng: hiển thị dạng portal nổi trên cùng, Esc / bấm ra ngoài để đóng, phím ↑ ↓ để di chuyển
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
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuWidth = menuEl ? menuEl.offsetWidth : 224;
    const menuHeight = menuEl ? menuEl.offsetHeight : 160;
    const margin = 8;

    let left = buttonRect.right - menuWidth;
    if (left < margin) {
      left = margin;
    }
    if (left + menuWidth > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - menuWidth - margin);
    }

    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    let top: number;
    if (spaceBelow < menuHeight + margin && spaceAbove > spaceBelow) {
      top = Math.max(margin, buttonRect.top - menuHeight - margin);
    } else {
      top = buttonRect.bottom + margin;
    }

    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    // Focus vào mục menu đầu tiên khả dụng
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not(:disabled)")?.focus();

    // Bấm ra ngoài nút và menu thì đóng
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    }

    function onScrollOrResize() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      // Nếu nút bị cuộn hoàn toàn ra ngoài màn hình thì đóng menu
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        onOpenChange(false);
      } else {
        updatePosition();
      }
    }

    document.addEventListener("mousedown", onPointer);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, onOpenChange, updatePosition]);

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
    } else if (event.key === "Home") {
      event.preventDefault();
      enabled[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      enabled[enabled.length - 1]?.focus();
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
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Thao tác với ${label}`}
            onKeyDown={onMenuKey}
            style={{
              top: coords ? `${coords.top}px` : undefined,
              left: coords ? `${coords.left}px` : undefined,
              visibility: coords ? "visible" : "hidden",
            }}
            className="fixed z-50 w-56 rounded-xl border border-brand-sandLine bg-white p-1 shadow-[0_16px_40px_-16px_rgba(8,42,102,0.35)]"
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
          </div>,
          document.body
        )}
    </div>
  );
}

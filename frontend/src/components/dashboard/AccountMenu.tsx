import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING as FOCUS } from "@/constants/classNames";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { AccountMenuProps } from "@/interfaces/portal";

/**
 * Nút avatar ở góc phải thanh trên; bấm vào sổ xuống menu tài khoản (Hồ sơ, Đăng xuất).
 * Đóng khi bấm ra ngoài, nhấn Esc hoặc chọn một mục.
 */
export function AccountMenu({ userId, fullName, roleName, email, profileTo, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Bấm ra ngoài hoặc nhấn Esc thì đóng menu
  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const itemClass = `flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[14px] font-semibold transition-colors ${FOCUS}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản của ${fullName}`}
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-2.5 rounded-full border bg-white p-1 shadow-sm transition-colors sm:pr-2.5 ${
          open ? "border-brand-navy/40" : "border-brand-sandLine hover:border-brand-navy/40"
        } ${FOCUS}`}
      >
        <UserAvatar userId={userId} name={fullName} size={32} />
        <span className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
          <span className="max-w-[180px] truncate text-[14px] font-semibold text-brand-ink">{fullName}</span>
          <span className="text-[11.5px] font-medium text-brand-muted">{roleName}</span>
        </span>
        <Icon name="expand_more" className={`text-[20px] text-brand-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tài khoản"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] overflow-hidden rounded-2xl border border-brand-sandLine bg-white p-2 shadow-[0_20px_44px_-18px_rgba(8,42,102,0.45)]"
        >
          {/* Thông tin tài khoản */}
          <div className="mb-1 flex items-center gap-3 rounded-xl bg-brand-sand/70 p-3">
            <UserAvatar userId={userId} name={fullName} size={40} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[14px] font-bold text-brand-ink">{fullName}</span>
              <span className="block truncate text-[12.5px] text-brand-muted">{email || roleName}</span>
            </span>
          </div>

          <Link
            role="menuitem"
            to={profileTo}
            onClick={() => setOpen(false)}
            className={`${itemClass} text-brand-ink hover:bg-brand-tint hover:text-brand-navy`}
          >
            <Icon name="person" className="text-[20px]" />
            Hồ sơ của tôi
          </Link>
          <div className="my-1 h-px bg-brand-sandLine" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className={`${itemClass} text-red-600 hover:bg-red-50`}
          >
            <Icon name="logout" className="text-[20px]" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import type { PortalDialogProps } from "@/interfaces/portal";

/**
 * Hộp thoại dùng thẻ <dialog> gốc của trình duyệt (tự giữ tiêu điểm bàn phím trong hộp, Esc để đóng).
 * Dùng cho các form tạo / sửa trong khu quản trị.
 */
export function PortalDialog({ open, title, description, onClose, children, widthClassName = "max-w-[560px]" }: PortalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // Mở / đóng theo `open`
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Bấm vào nền mờ (chính thẻ dialog) thì đóng
        if (event.target === ref.current) onClose();
      }}
      className={`w-[calc(100%-2rem)] ${widthClassName} rounded-3xl border border-brand-sandLine bg-white p-0 text-brand-ink shadow-[0_30px_80px_-30px_rgba(8,42,102,0.6)] backdrop:bg-brand-navyDeep/40 backdrop:backdrop-blur-[2px]`}
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-brand-sandLine bg-white/95 px-6 pb-4 pt-5 backdrop-blur">
            <div>
              <h2 className="text-[19px] font-extrabold text-brand-navy">{title}</h2>
              {description && <p className="mt-0.5 text-[14px] text-brand-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className={`-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-brand-sand hover:text-brand-navy ${FOCUS_RING}`}
            >
              <Icon name="close" className="text-[21px]" />
            </button>
          </div>
          <div className="px-6 pb-6 pt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

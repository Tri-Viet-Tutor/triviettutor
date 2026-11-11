import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, FOCUS_RING } from "@/constants/classNames";
import { portalErrorMessage } from "@/utils/errors";

const TONES = {
  danger: { badge: "bg-red-50 text-red-600 ring-red-100", button: "bg-red-600 hover:bg-red-700" },
  warning: { badge: "bg-amber-50 text-amber-600 ring-amber-100", button: "bg-brand-navy hover:bg-brand-navyDeep" },
  primary: { badge: "bg-brand-tint text-brand-navy ring-brand-navy/10", button: "bg-brand-navy hover:bg-brand-navyDeep" },
};

// Hộp xác nhận thay cho window.confirm: biểu tượng, tiêu đề, nội dung và hai nút.
// onConfirm có thể là hàm async; lỗi ném ra sẽ hiện ngay trong hộp, hộp chỉ đóng khi thành công.
export function ConfirmDialog({
  open,
  title,
  message,
  icon = "help",
  tone = "primary",
  confirmLabel = "Đồng ý",
  pendingLabel = "Đang xử lý…",
  cancelLabel = "Hủy",
  errorFallback = "Chưa thực hiện được. Vui lòng thử lại.",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  icon?: string;
  tone?: keyof typeof TONES;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  // Câu báo khi lỗi mà backend không trả lời được
  errorFallback?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const style = TONES[tone];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setError(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Chạy thao tác khi bấm đồng ý; lỗi thì giữ hộp và hiện lỗi
  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (failure) {
      setError(portalErrorMessage(failure, errorFallback));
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !pending) onClose();
      }}
      className="w-[calc(100%-2rem)] max-w-[420px] rounded-3xl border border-brand-sandLine bg-white p-0 text-brand-ink shadow-[0_30px_80px_-30px_rgba(8,42,102,0.6)] backdrop:bg-brand-navyDeep/40 backdrop:backdrop-blur-[2px]"
    >
      {open && (
        <div className="px-6 pb-6 pt-7 text-center">
          <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ring-8 ${style.badge}`}>
            <Icon name={icon} className="text-[28px]" />
          </span>
          <h2 className="mt-4 text-[19px] font-extrabold text-brand-navy">{title}</h2>
          <div className="mt-2 text-[14.5px] leading-relaxed text-brand-muted">{message}</div>
          {error && (
            <p role="alert" className={`${AUTH_ERROR} mt-4 flex items-start justify-center gap-1.5 text-left`}>
              <Icon name="error" className="mt-px text-[17px]" />
              {error}
            </p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className={`h-11 rounded-xl border border-brand-sandLine bg-white text-[14.5px] font-semibold text-brand-ink transition-colors hover:bg-brand-sand disabled:opacity-50 ${FOCUS_RING}`}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={pending}
              autoFocus
              className={`h-11 rounded-xl text-[14.5px] font-semibold text-white transition-colors disabled:opacity-60 ${style.button} ${FOCUS_RING}`}
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

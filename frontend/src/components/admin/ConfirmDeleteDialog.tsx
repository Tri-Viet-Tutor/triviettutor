import { useEffect, useState } from "react";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { portalErrorMessage } from "@/utils/errors";

/** Hộp xác nhận xóa hẳn một khóa / lớp; lỗi của backend (đang được dùng…) hiện ngay trong hộp */
export function ConfirmDeleteDialog({
  open,
  title,
  message,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  /** Gọi API xóa; ném lỗi thì hộp giữ nguyên và hiện lỗi */
  onConfirm: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
    } catch (failure) {
      setError(portalErrorMessage(failure, "Chưa xóa được. Vui lòng thử lại."));
    } finally {
      setPending(false);
    }
  }

  return (
    <PortalDialog open={open} onClose={onClose} title={title} widthClassName="max-w-[440px]">
      <div className="space-y-4">
        <p className="text-[14.5px] leading-relaxed text-brand-ink">{message}</p>
        <p className="flex items-start gap-1.5 text-[13px] text-brand-muted">
          <Icon name="info" className="mt-px text-[16px]" />
          Không hoàn tác được.
        </p>
        {error && (
          <p role="alert" className={`${AUTH_ERROR} flex items-start gap-1.5`}>
            <Icon name="error" className="mt-px text-[17px]" />
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-brand-sandLine pt-4">
          <button type="button" onClick={onClose} className={PORTAL_BTN_SECONDARY}>
            Đóng
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={pending}
            className={`${PORTAL_BTN_PRIMARY} !bg-red-600 hover:!bg-red-700`}
          >
            <Icon name="delete" className="text-[18px]" />
            {pending ? "Đang xóa…" : "Xóa"}
          </button>
        </div>
      </div>
    </PortalDialog>
  );
}

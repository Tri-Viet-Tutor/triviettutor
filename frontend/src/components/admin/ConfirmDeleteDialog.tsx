import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";

// Hộp xác nhận xóa hẳn một khóa / lớp / người dùng; lỗi của backend (đang được dùng…) hiện ngay trong hộp
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
  // Gọi API xóa; ném lỗi thì hộp giữ nguyên và hiện lỗi
  onConfirm: () => Promise<void>;
}) {
  return (
    <ConfirmDialog
      open={open}
      tone="danger"
      icon="delete"
      title={title}
      message={
        <>
          {message}
          <span className="mt-2 block text-[13px] font-medium text-red-600">Không hoàn tác được.</span>
        </>
      }
      confirmLabel="Xóa"
      pendingLabel="Đang xóa…"
      cancelLabel="Đóng"
      errorFallback="Chưa xóa được. Vui lòng thử lại."
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

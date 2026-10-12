import { useState, type FormEvent, type ReactNode } from "react";
import { AUTH_INPUT, AUTH_LABEL } from "@/features/auth/components/AuthField";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { portalErrorMessage } from "@/features/portal/data/errors";
import { PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY } from "@/features/portal/data/ui";

interface ReasonFormProps {
  /** Mã riêng để gắn nhãn với ô nhập */
  id: string;
  /** Nhãn của ô lý do */
  label: string;
  submitLabel: string;
  isPending: boolean;
  /** Lỗi của lần gửi gần nhất (nếu có) */
  error: unknown;
  /** Câu báo khi backend không trả mã lỗi quen thuộc */
  errorFallback: string;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
  /** Các ô nhập khác đặt trước ô lý do; `canSubmit` cho biết các ô đó đã hợp lệ chưa */
  children?: ReactNode;
  canSubmit?: boolean;
  /** Nút gửi màu đỏ cho thao tác khó hoàn lại (hủy buổi, từ chối) */
  danger?: boolean;
}

/** Form nhỏ hỏi lý do trước một thao tác của quản trị (backend lưu lý do vào nhật ký thay đổi, tối đa 1000 ký tự). */
export function ReasonForm({
  id,
  label,
  submitLabel,
  isPending,
  error,
  errorFallback,
  onSubmit,
  onCancel,
  children,
  canSubmit = true,
  danger = false,
}: ReasonFormProps) {
  const [reason, setReason] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim() && canSubmit) onSubmit(reason.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5">
      {children}
      <div>
        <label htmlFor={id} className={`mb-1.5 ${AUTH_LABEL}`}>
          {label}
        </label>
        <textarea
          id={id}
          required
          rows={2}
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={`${AUTH_INPUT} h-auto resize-y py-2 leading-relaxed`}
        />
      </div>
      {Boolean(error) && <AuthNotice tone="error">{portalErrorMessage(error, errorFallback)}</AuthNotice>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending || !reason.trim() || !canSubmit}
          className={danger ? `${PORTAL_BTN_PRIMARY} !bg-red-600 hover:!bg-red-700` : PORTAL_BTN_PRIMARY}
        >
          {isPending ? "Đang gửi…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={isPending} className={PORTAL_BTN_SECONDARY}>
          Thôi
        </button>
      </div>
    </form>
  );
}

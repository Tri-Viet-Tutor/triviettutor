import { type FormEvent, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AUTH_INPUT, AUTH_LABEL, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { portalErrorMessage } from "@/utils/errors";
import type { ReasonFormProps } from "@/interfaces/admin";

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

  /** Chỉ gửi khi lý do không trống và các ô phía trên đã hợp lệ */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim() && canSubmit) onSubmit(reason.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-brand-sandLine bg-white p-3.5">
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

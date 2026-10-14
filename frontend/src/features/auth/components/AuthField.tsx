import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export const AUTH_INPUT =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 text-[15px] text-brand-ink outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500 disabled:bg-slate-100 disabled:text-brand-muted autofill:shadow-[inset_0_0_0_1000px_#fff]";
export const AUTH_LABEL = "block text-[13.5px] font-medium text-brand-ink";
export const AUTH_ERROR = "mt-1.5 text-[13px] font-medium text-red-700";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** Câu báo lỗi của ô (nếu có) */
  error?: string;
  /** Phần nằm bên phải nhãn, ví dụ liên kết "Quên mật khẩu?" */
  labelAction?: ReactNode;
}

/**
 * Một ô nhập của trang xác thực: nhãn, ô nhập, câu báo lỗi.
 * Ô mật khẩu (type="password") có thêm nút hiện / ẩn mật khẩu.
 * Dùng forwardRef để gắn thẳng `register(...)` của react-hook-form.
 */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { id, label, error, labelAction, type = "text", className = "", ...inputProps },
  ref,
) {
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className={AUTH_LABEL}>
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${AUTH_INPUT} ${isPassword ? "pr-11" : ""} ${className}`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={revealed}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
          >
            <Icon name={revealed ? "visibility_off" : "visibility"} className="text-[19px]" />
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className={AUTH_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
});

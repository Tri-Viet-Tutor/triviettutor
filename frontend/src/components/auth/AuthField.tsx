import { forwardRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, AUTH_INPUT, AUTH_LABEL } from "@/constants/classNames";
import type { AuthFieldProps } from "@/interfaces/auth";

// Một ô nhập của trang xác thực: nhãn, ô nhập, câu báo lỗi.
// Ô mật khẩu (type="password") có thêm nút hiện / ẩn mật khẩu.
// Dùng forwardRef để gắn thẳng 'register(...)' của react-hook-form.
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { id, label, error, labelAction, type = "text", className = "", ...inputProps },
  ref,
) {
  const isPassword = type === "password";
  // Đang hiện mật khẩu dạng chữ thường?
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

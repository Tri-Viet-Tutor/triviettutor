import { type ClipboardEvent, type KeyboardEvent, useRef } from "react";
import type { OtpInputProps } from "@/interfaces/auth";

// Dãy ô nhập mã OTP, mỗi ô một số, tự chuyển ô và cho dán cả mã
export function OtpInput({ value, onChange, length, invalid = false, disabled = false }: OtpInputProps) {
  // Tham chiếu tới từng ô để chuyển focus
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => (/\d/.test(value[index] ?? "") ? value[index] : ""));

  // Ghép các ô thành chuỗi (ô trống giữ chỗ bằng dấu cách) rồi báo lên trên
  function commit(next: string[]) {
    onChange(
      next
        .map((digit) => digit || " ")
        .join("")
        .trimEnd(),
    );
  }

  // Chuyển focus sang ô `index` (giới hạn trong khoảng hợp lệ)
  function focusBox(index: number) {
    inputs.current[Math.min(Math.max(index, 0), length - 1)]?.focus();
  }

  // Điền một chuỗi chữ số bắt đầu từ ô `start` (gõ, dán hoặc tự điền)
  function fillFrom(start: number, text: string) {
    const next = digits.slice();
    const incoming = text.replace(/\D/g, "").slice(0, length - start);
    incoming.split("").forEach((digit, offset) => {
      next[start + offset] = digit;
    });
    commit(next);
    focusBox(start + incoming.length);
  }

  // Nội dung ô thay đổi (gõ trên điện thoại, tự điền, xóa)
  function handleChange(index: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) {
      const next = digits.slice();
      next[index] = "";
      commit(next);
      return;
    }
    // Ô đang có số mà gõ thêm một số (bàn phím điện thoại): chữ số mới là chữ số khác với số cũ
    const previous = digits[index];
    const fresh = typed.length === 2 && previous && typed.includes(previous) ? (typed[0] === previous ? typed[1] : typed[0]) : typed;
    fillFrom(index, fresh);
  }

  // Xử lý phím: chữ số, Backspace ở ô trống, mũi tên trái / phải
  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    // Gõ một chữ số: ghi thẳng vào ô rồi sang ô kế — kể cả khi trùng với số đang có trong ô
    if (/^\d$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      fillFrom(index, event.key);
      return;
    }
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = digits.slice();
      next[index - 1] = "";
      commit(next);
      focusBox(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  }

  // Dán cả mã: luôn điền từ ô đầu tiên
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    fillFrom(0, event.clipboardData.getData("text"));
  }

  return (
    <div role="group" aria-label={`Mã xác thực ${length} chữ số`} className="flex gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Chữ số thứ ${index + 1}`}
          aria-invalid={invalid}
          disabled={disabled}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          className={`h-12 min-w-0 flex-1 rounded-md border bg-white text-center text-[20px] font-semibold text-brand-navy outline-none transition-[border-color,box-shadow] focus:border-brand-navy focus:ring-1 focus:ring-brand-navy disabled:opacity-60 ${
            invalid ? "border-red-500" : digit ? "border-brand-navy" : "border-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

interface OtpInputProps {
  /** Các chữ số đã nhập; vị trí còn trống ở giữa được giữ bằng dấu cách */
  value: string;
  onChange: (value: string) => void;
  length: number;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * Ô nhập mã OTP: mỗi chữ số một ô, tự nhảy sang ô kế, lùi bằng Backspace,
 * dán cả mã một lần, và nhận mã tự điền từ tin nhắn / email (autocomplete="one-time-code").
 */
export function OtpInput({ value, onChange, length, invalid = false, disabled = false }: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => (/\d/.test(value[index] ?? "") ? value[index] : ""));

  function commit(next: string[]) {
    onChange(
      next
        .map((digit) => digit || " ")
        .join("")
        .trimEnd(),
    );
  }

  function focusBox(index: number) {
    inputs.current[Math.min(Math.max(index, 0), length - 1)]?.focus();
  }

  /** Điền một chuỗi chữ số bắt đầu từ ô `start` (gõ, dán hoặc tự điền) */
  function fillFrom(start: number, text: string) {
    const next = digits.slice();
    const incoming = text.replace(/\D/g, "").slice(0, length - start);
    incoming.split("").forEach((digit, offset) => {
      next[start + offset] = digit;
    });
    commit(next);
    focusBox(start + incoming.length);
  }

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

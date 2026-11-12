import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  id?: string;
  /** Giá trị hiện tại — có thể khớp với value của một option, hoặc là chuỗi tự gõ không có trong danh sách */
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Lớp của ô (thường là PORTAL_INPUT) */
  className?: string;
  "aria-label"?: string;
}

/**
 * Ô nhập kết hợp sổ xuống: gõ để lọc gợi ý hoặc bấm chọn trong danh sách, vẫn cho phép gõ giá
 * trị mới không có sẵn (vd. backend tự tạo môn học mới khi gõ tên chưa từng có).
 * Thay cho <input list="…"> + <datalist> của trình duyệt — datalist không style được, hiển thị
 * thành ô gợi ý màu đen mặc định của hệ điều hành, không đồng bộ với giao diện trang.
 */
export function Combobox({ id, value, options, onChange, placeholder, className = "", ...rest }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => options.find((option) => option.value === value)?.label ?? value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(options.find((option) => option.value === value)?.label ?? value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đồng bộ lại khi value đổi từ bên ngoài (vd. bấm nút chọn nhanh)
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer, true);
    return () => document.removeEventListener("pointerdown", onPointer, true);
  }, [open]);

  const query = text.trim().toLowerCase();
  const filtered = query ? options.filter((option) => option.label.toLowerCase().includes(query)) : options;

  function commit(raw: string) {
    const match = options.find(
      (option) => option.label.toLowerCase() === raw.trim().toLowerCase() || option.value.toLowerCase() === raw.trim().toLowerCase(),
    );
    onChange(match ? match.value : raw);
  }

  function pick(option: ComboboxOption) {
    setText(option.label);
    onChange(option.value);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          commit(event.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => commit(text)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={rest["aria-label"]}
        className={`${className} pr-9`}
      />
      <Icon
        name={open ? "expand_less" : "expand_more"}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[19px] text-brand-muted"
      />
      {open && filtered.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-56 overflow-y-auto rounded-xl border border-brand-sandLine bg-white p-1.5 shadow-[0_24px_48px_-20px_rgba(8,42,102,0.45)]"
        >
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(option)}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-[14.5px] transition-colors ${
                option.value === value ? "bg-brand-tint font-semibold text-brand-navy" : "text-brand-ink hover:bg-brand-sand"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

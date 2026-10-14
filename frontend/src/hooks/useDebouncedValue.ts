import { useEffect, useState } from "react";

/** Trả về `value` sau khi nó đứng yên `delayMs` mili giây — dùng cho ô tìm kiếm để không gọi API theo từng phím. */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

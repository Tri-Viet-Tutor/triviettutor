import { type RefObject, useEffect, useLayoutEffect, useState } from "react";

// Vị trí (position: fixed) cho ô bật lên dưới một nút: tự lật lên trên khi phía dưới không đủ chỗ,
// không tràn mép phải; đóng khi bấm ra ngoài hoặc nhấn Esc. Không dùng portal để vẫn nằm trong <dialog> đang mở.
export function usePopover(triggerRef: RefObject<HTMLElement | null>, panelRef: RefObject<HTMLElement | null>, width: number, height: number) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    // Đặt bảng chọn ngay dưới ô, không đủ chỗ thì lật lên trên
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom;
      const top = below >= height + 8 || rect.top < height + 8 ? rect.bottom + 6 : rect.top - height - 6;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      setStyle({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, triggerRef, width, height]);

  useEffect(() => {
    if (!open) return;
    // Bấm ra ngoài ô và bảng chọn thì đóng lại
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    // Nhấn Esc thì đóng bảng chọn
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Esc chỉ đóng ô chọn, không đóng hộp thoại chứa nó
        event.stopPropagation();
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, panelRef, triggerRef]);

  return { open, setOpen, style };
}

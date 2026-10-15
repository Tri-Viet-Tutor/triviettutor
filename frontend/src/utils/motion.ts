import type { CSSProperties } from "react";

/** true khi người dùng bật "giảm chuyển động" trong hệ điều hành — khi đó tắt các hiệu ứng động. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Style đặt độ trễ (ms) cho hiệu ứng nổi lên `.hero-rise` ở phần mở đầu các trang */
export function riseDelay(delay: number): CSSProperties {
  return { "--rise-delay": `${delay}ms` } as CSSProperties;
}

/**
 * Cuộn tới phần tử có `id` (căn mép trên); cuộn mượt trừ khi người dùng bật "giảm chuyển động".
 * Không tìm thấy phần tử thì không làm gì.
 */
export function scrollToId(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

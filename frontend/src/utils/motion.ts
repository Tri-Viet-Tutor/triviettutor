/** Người dùng có bật "giảm chuyển động" trên thiết bị hay không. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

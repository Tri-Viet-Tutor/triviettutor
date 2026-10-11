import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Theo dõi một phần tử đã cuộn vào màn hình hay chưa (chỉ bật một lần, sau đó ngừng theo dõi).
 * Gắn `ref` vào phần tử cần theo dõi; `inView` chuyển thành true khi phần tử xuất hiện.
 */
export function useInView<T extends Element = HTMLElement>(
  options: IntersectionObserverInit = { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  // Tuỳ chọn chỉ đọc một lần lúc gắn vào trang
  const optionsRef = useRef(options);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, optionsRef.current);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

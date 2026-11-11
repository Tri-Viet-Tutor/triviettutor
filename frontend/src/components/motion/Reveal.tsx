import type { CSSProperties } from "react";
import { useInView } from "@/hooks/useInView";
import type { RevealProps } from "@/interfaces/motion";

// Hiện dần + trượt nhẹ khi phần tử cuộn vào màn hình (chỉ chạy một lần).
export function Reveal({ as = "div", from = "up", delay = 0, className = "", children }: RevealProps) {
  const Tag = as;
  const [ref, shown] = useInView<HTMLElement>();

  return (
    <Tag
      ref={ref}
      className={`reveal reveal-${from} ${shown ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

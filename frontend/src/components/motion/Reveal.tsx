import { type CSSProperties, type ElementType, type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface RevealProps {
  as?: ElementType;
  from?: "up" | "left" | "right";
  delay?: number;
  className?: string;
  children: ReactNode;
}

/** Hiện dần + trượt nhẹ khi phần tử cuộn vào màn hình (chỉ chạy một lần). */
export function Reveal({
  as = "div",
  from = "up",
  delay = 0,
  className = "",
  children,
}: RevealProps) {
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

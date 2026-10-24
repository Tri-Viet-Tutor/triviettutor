import type { CSSProperties } from "react";
import type { SparkleProps } from "@/interfaces/motion";

/**
 * Ngôi sao bốn cánh nhấp nháy (hiệu ứng .twinkle trong styles/index.css),
 * đặt tuyệt đối trong khung chứa. Chỉ để trang trí — khung chứa nên có aria-hidden.
 */
export function Sparkle({ left, top, size, delay, className = "fill-brand-orange" }: SparkleProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`twinkle absolute ${className}`}
      style={{ left: `${left}%`, top: `${top}%`, width: size, "--twinkle-delay": `${delay}s` } as CSSProperties}
    >
      <path d="M12 1c1 7 4 10 11 11-7 1-10 4-11 11-1-7-4-10-11-11 7-1 10-4 11-11z" />
    </svg>
  );
}

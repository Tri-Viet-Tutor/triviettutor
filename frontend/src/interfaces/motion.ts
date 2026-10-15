import type { ElementType, ReactNode } from "react";
import type { SparkleSpot } from "@/interfaces/ui";

// ── components/motion ──
/** Props của ClickSpark */
export interface ClickSparkProps {
  /** Màu tia sáng */
  color?: string;
}

export interface FireworkRocket {
  x: number;
  y: number;
  /** Độ cao sẽ nổ */
  targetY: number;
  /** Tốc độ bay lên (px / khung hình) */
  speed: number;
  color: string;
}

export interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 1 → 0, mờ dần */
  life: number;
  /** Lượng `life` giảm sau mỗi khung hình */
  decay: number;
  color: string;
}

/** Props của Fireworks */
export interface FireworksProps {
  /** Bắn trong bao lâu (ms); sau đó các tia còn lại tắt dần rồi hiệu ứng tự gỡ */
  durationMs?: number;
}

/** Props của Reveal */
export interface RevealProps {
  /** Thẻ HTML / component dùng làm vỏ (mặc định div) */
  as?: ElementType;
  /** Hướng trượt vào */
  from?: "up" | "left" | "right";
  /** Độ trễ trước khi hiện (ms) — dùng để các phần tử hiện lần lượt */
  delay?: number;
  className?: string;
  children: ReactNode;
}

/** Props của ScrollToTop */
export interface ScrollToTopProps {
  /** Nhích nút lên để không đè lên thanh cố định ở đáy màn hình (ví dụ thanh giỏ hàng) */
  raised?: boolean;
}

/** Props của Sparkle */
export interface SparkleProps extends SparkleSpot {
  /** Màu tô (lớp Tailwind fill-*) */
  className?: string;
}

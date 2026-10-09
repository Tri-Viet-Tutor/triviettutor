import { type CSSProperties, type ReactNode } from "react";

interface Doodle {
  id: string;
  /** Vị trí góc trên trái, tính theo % của vùng chữ bên trái phần mở đầu */
  left: number;
  top: number;
  /** Góc nghiêng (độ) */
  tilt: number;
  /** Lệch pha trôi lên xuống (giây) */
  delay: number;
  /** Bề rộng (px) */
  width: number;
  content: ReactNode;
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/* Nét vẽ tay quanh chủ đề học phí: biên lai, lịch, máy tính, heo đất, tờ tiền, mũ tốt nghiệp */
const DOODLES: Doodle[] = [
  {
    id: "receipt",
    left: 3,
    top: 10,
    tilt: -9,
    delay: 0,
    width: 50,
    content: (
      <svg viewBox="0 0 48 60" {...STROKE}>
        <path d="M8 4h32v50l-5.3-4-5.3 4-5.4-4-5.3 4-5.4-4L8 54z" />
        <path d="M15 16h18M15 25h18" />
        <path d="M15 34h10" stroke="#F5A00F" />
      </svg>
    ),
  },
  {
    id: "calendar",
    left: 37,
    top: 9,
    tilt: 6,
    delay: -1.3,
    width: 54,
    content: (
      <svg viewBox="0 0 56 56" {...STROKE}>
        <rect x="6" y="10" width="44" height="40" rx="6" />
        <path d="M6 22h44M18 4v10M38 4v10" />
        <path d="M19 36l6 6 12-12" stroke="#F5A00F" strokeWidth={2.8} />
      </svg>
    ),
  },
  {
    id: "calculator",
    left: 80,
    top: 13,
    tilt: 9,
    delay: -2.4,
    width: 52,
    content: (
      <svg viewBox="0 0 48 60" {...STROKE}>
        <rect x="6" y="4" width="36" height="52" rx="6" />
        <rect x="12" y="10" width="24" height="12" rx="2" />
        <g fill="currentColor" stroke="none">
          <circle cx="15" cy="31" r="2" />
          <circle cx="24" cy="31" r="2" />
          <circle cx="33" cy="31" r="2" />
          <circle cx="15" cy="40" r="2" />
          <circle cx="24" cy="40" r="2" />
          <circle cx="33" cy="40" r="2" />
          <circle cx="15" cy="49" r="2" />
          <circle cx="24" cy="49" r="2" />
        </g>
        <circle cx="33" cy="49" r="2.6" fill="#F5A00F" stroke="none" />
      </svg>
    ),
  },
  {
    id: "piggy",
    left: 80,
    top: 64,
    tilt: -6,
    delay: -3.4,
    width: 78,
    content: (
      <svg viewBox="0 0 72 62" {...STROKE}>
        <ellipse cx="34" cy="34" rx="24" ry="18" />
        <path d="M56 28c6 0 8 3 8 7s-2 7-8 7M24 18l-3-8 10 4M22 50v7M44 50v7M10 32c-5-2-6-7-2-9M28 18h12" />
        <circle cx="48" cy="29" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="34" cy="6" r="4.5" fill="#F5A00F" stroke="none" />
      </svg>
    ),
  },
  {
    id: "banknote",
    left: 46,
    top: 86,
    tilt: -5,
    delay: -0.7,
    width: 80,
    content: (
      <svg viewBox="0 0 76 44" {...STROKE}>
        <rect x="4" y="6" width="68" height="32" rx="5" />
        <circle cx="38" cy="22" r="8" stroke="#F5A00F" />
        <circle cx="14" cy="22" r="2" fill="currentColor" stroke="none" />
        <circle cx="62" cy="22" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "cap",
    left: 2,
    top: 87,
    tilt: -8,
    delay: -4.2,
    width: 62,
    content: (
      <svg viewBox="0 0 64 48" {...STROKE}>
        <path d="M4 18L32 6l28 12-28 12z" />
        <path d="M16 24v12c8 7 24 7 32 0V24" />
        <path d="M60 18v14" stroke="#F5A00F" />
      </svg>
    ),
  },
];

/* Hàng đồng xu lớn dần, như đang bay từ phần chữ sang thẻ giá */
const COIN_TRAIL = [
  { left: 79, top: 45, size: 16, delay: 0 },
  { left: 86, top: 41, size: 22, delay: -1.2 },
  { left: 94, top: 38, size: 28, delay: -2.4 },
];

const SPARKLES = [
  { left: 21, top: 19, size: 18, delay: 0 },
  { left: 64, top: 17, size: 14, delay: 0.9 },
  { left: 74, top: 90, size: 16, delay: 1.6 },
  { left: 26, top: 96, size: 12, delay: 0.5 },
  { left: 97, top: 12, size: 12, delay: 2.1 },
];

/**
 * Nét vẽ tay và đồng xu trôi nhẹ quanh phần chữ mở đầu trang "Bảng học phí", lấp khoảng trống ở nửa trái.
 * Chỉ để trang trí nên ẩn với trình đọc màn hình, và chỉ hiện từ màn hình lớn (lg).
 */
export function PricingDoodles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden w-[63%] select-none lg:block">
      {DOODLES.map((doodle) => (
        <div
          key={doodle.id}
          className="float-soft absolute text-brand-navy/50"
          style={{
            left: `${doodle.left}%`,
            top: `${doodle.top}%`,
            width: doodle.width,
            rotate: `${doodle.tilt}deg`,
            animationDelay: `${doodle.delay}s`,
          }}
        >
          {doodle.content}
        </div>
      ))}

      {COIN_TRAIL.map((coin) => (
        <span
          key={coin.left}
          className="float-soft absolute flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_32%_28%,#FFE2A6,#F5A00F_75%)] font-extrabold text-brand-navyDeep shadow-[0_8px_14px_-8px_rgba(222,139,0,0.95)]"
          style={{
            left: `${coin.left}%`,
            top: `${coin.top}%`,
            width: coin.size,
            height: coin.size,
            fontSize: coin.size * 0.5,
            animationDelay: `${coin.delay}s`,
          }}
        >
          ₫
        </span>
      ))}

      {SPARKLES.map((sparkle) => (
        <svg
          key={`${sparkle.left}-${sparkle.top}`}
          viewBox="0 0 24 24"
          className="twinkle absolute fill-brand-orange"
          style={
            {
              left: `${sparkle.left}%`,
              top: `${sparkle.top}%`,
              width: sparkle.size,
              "--twinkle-delay": `${sparkle.delay}s`,
            } as CSSProperties
          }
        >
          <path d="M12 1c1 7 4 10 11 11-7 1-10 4-11 11-1-7-4-10-11-11 7-1 10-4 11-11z" />
        </svg>
      ))}
    </div>
  );
}

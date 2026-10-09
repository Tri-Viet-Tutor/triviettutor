import { type CSSProperties, type ReactNode } from "react";

interface Doodle {
  id: string;
  /** Vị trí góc trên trái, tính theo % của nửa trái phần mở đầu */
  left: number;
  top: number;
  /** Góc nghiêng (độ) */
  tilt: number;
  /** Lệch pha trôi lên xuống (giây) */
  delay: number;
  className: string;
  content: ReactNode;
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/* Mỗi nét vẽ gợi một môn đang dạy: Toán, Hóa, Tiếng Anh, Tin học, Ngữ Văn */
const DOODLES: Doodle[] = [
  {
    id: "formula",
    left: 5,
    top: 11,
    tilt: -7,
    delay: 0,
    className: "font-serif text-[26px] italic text-brand-navy/45 xl:text-[30px]",
    content: (
      <>
        x<sup>2</sup> + y<sup>2</sup> = r<sup>2</sup>
      </>
    ),
  },
  {
    id: "atom",
    left: 50,
    top: 5,
    tilt: 0,
    delay: -1.4,
    className: "w-[68px] text-brand-navy/40",
    content: (
      <svg viewBox="0 0 64 64" {...STROKE}>
        <ellipse cx="32" cy="32" rx="27" ry="10" />
        <ellipse cx="32" cy="32" rx="27" ry="10" transform="rotate(60 32 32)" />
        <ellipse cx="32" cy="32" rx="27" ry="10" transform="rotate(120 32 32)" />
        <circle cx="32" cy="32" r="4" fill="#F5A00F" stroke="none" />
      </svg>
    ),
  },
  {
    id: "pencil",
    left: 82,
    top: 15,
    tilt: 8,
    delay: -2.6,
    className: "w-[58px] text-brand-navy/40",
    content: (
      <svg viewBox="0 0 64 64" {...STROKE}>
        <path d="M13 51l4-13L43 12a4.5 4.5 0 0 1 6.4 0l2.6 2.6a4.5 4.5 0 0 1 0 6.4L26 47z" />
        <path d="M17 38l9 9M39 16l9 9" />
        <path d="M13 51l5.5-1.8-3.7-3.7z" fill="#F5A00F" stroke="#F5A00F" />
      </svg>
    ),
  },
  {
    id: "speech",
    left: 66,
    top: 35,
    tilt: 6,
    delay: -0.8,
    className: "w-[84px] text-brand-navy/45",
    content: (
      <svg viewBox="0 0 72 62" {...STROKE}>
        <path d="M9 4h54a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H32L21 54V42H9a6 6 0 0 1-6-6V10a6 6 0 0 1 6-6z" />
        <text x="36" y="30" textAnchor="middle" fontSize="19" fontWeight="800" fill="currentColor" stroke="none">
          Abc
        </text>
      </svg>
    ),
  },
  {
    id: "flask",
    left: 3,
    top: 77,
    tilt: -10,
    delay: -3.2,
    className: "w-[60px] text-brand-navy/40",
    content: (
      <svg viewBox="0 0 64 64" {...STROKE}>
        <path d="M25 7h14M27 7v19L13 50a4.5 4.5 0 0 0 4 6.5h30a4.5 4.5 0 0 0 4-6.5L37 26V7" />
        <path d="M20 41h24" />
        <circle cx="27" cy="48" r="2" fill="#F5A00F" stroke="none" />
        <circle cx="36" cy="50" r="2.6" fill="#F5A00F" stroke="none" />
        <circle cx="33" cy="33" r="1.6" fill="#F5A00F" stroke="none" />
      </svg>
    ),
  },
  {
    id: "book",
    left: 62,
    top: 86,
    tilt: -6,
    delay: -1.9,
    className: "w-[72px] text-brand-navy/40",
    content: (
      <svg viewBox="0 0 64 54" {...STROKE}>
        <path d="M32 12C26 7 16 6 5 8v36c11-2 21-1 27 4 6-5 16-6 27-4V8C48 6 38 7 32 12z" />
        <path d="M32 12v36" />
        <path d="M12 18c5-.6 9 0 13 1.8M12 26c5-.6 9 0 13 1.8M39 19.8c4-1.8 8-2.4 13-1.8" strokeWidth={1.8} />
      </svg>
    ),
  },
  {
    id: "code",
    left: 86,
    top: 73,
    tilt: 9,
    delay: -4.1,
    className: "font-mono text-[28px] font-bold text-brand-navy/45 xl:text-[32px]",
    content: "</>",
  },
];

interface Sparkle {
  left: number;
  top: number;
  size: number;
  delay: number;
}

/* Sao bốn cánh nhấp nháy xen giữa các nét vẽ */
const SPARKLES: Sparkle[] = [
  { left: 33, top: 22, size: 18, delay: 0 },
  { left: 94, top: 39, size: 14, delay: 0.9 },
  { left: 58, top: 55, size: 12, delay: 1.7 },
  { left: 24, top: 91, size: 16, delay: 0.5 },
  { left: 72, top: 10, size: 12, delay: 2.1 },
];

/**
 * Nét vẽ tay trôi nhẹ quanh phần chữ mở đầu trang "Khối lớp / Môn học",
 * lấp khoảng trống ở nửa trái. Chỉ để trang trí nên ẩn với trình đọc màn hình,
 * và chỉ hiện từ màn hình lớn (lg) — nơi phần chữ mới có khoảng trống chung quanh.
 */
export function HeroDoodles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/2 select-none lg:block">
      {DOODLES.map((doodle) => (
        <div
          key={doodle.id}
          className={`float-soft absolute leading-none ${doodle.className}`}
          style={{
            left: `${doodle.left}%`,
            top: `${doodle.top}%`,
            rotate: `${doodle.tilt}deg`,
            animationDelay: `${doodle.delay}s`,
          }}
        >
          {doodle.content}
        </div>
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

      {/* Mũi tên nét đứt cong từ dòng mô tả sang các bong bóng môn học */}
      <svg
        viewBox="0 0 240 96"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute left-[20%] top-[73%] w-[38%] stroke-brand-orange"
      >
        <path d="M6 12C40 82 130 94 222 34" strokeWidth="2.6" strokeDasharray="7 8" />
        <path d="M205 35.5L222 34l-8 14.5" strokeWidth="2.6" />
      </svg>
    </div>
  );
}

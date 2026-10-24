import { Sparkle } from "@/components/motion/Sparkle";
import { DOODLE_STROKE } from "@/constants/doodle";
import type { Doodle } from "@/interfaces/ui";

/** Nét vẽ tay quanh chủ đề liên lạc: phong bì, máy bay giấy, a còng, bong bóng trò chuyện, điện thoại, ghim bản đồ */
const DOODLES: Doodle[] = [
  {
    id: "envelope",
    left: 4,
    top: 8,
    tilt: -8,
    delay: 0,
    width: 62,
    content: (
      <svg viewBox="0 0 64 48" {...DOODLE_STROKE}>
        <rect x="4" y="6" width="56" height="36" rx="5" />
        <path d="M5 9l27 20L59 9" />
        <circle cx="50" cy="33" r="3.5" fill="#F5A00F" stroke="none" />
      </svg>
    ),
  },
  {
    id: "plane",
    left: 52,
    top: 5,
    tilt: 6,
    delay: -1.4,
    width: 96,
    content: (
      <svg viewBox="0 0 96 56" {...DOODLE_STROKE}>
        <path d="M4 46c14 4 26-2 34-12" strokeDasharray="5 6" stroke="#F5A00F" />
        <path d="M92 6L48 26l14 6 6 16z" />
        <path d="M92 6L62 32" />
      </svg>
    ),
  },
  {
    id: "at",
    left: 88,
    top: 30,
    tilt: 10,
    delay: -2.5,
    width: 46,
    content: (
      <svg viewBox="0 0 48 48" {...DOODLE_STROKE}>
        <circle cx="24" cy="24" r="8" />
        <path d="M32 16v10a5 5 0 0 0 10 0v-2a18 18 0 1 0-7 14" />
      </svg>
    ),
  },
  {
    id: "chat",
    left: 84,
    top: 86,
    tilt: -7,
    delay: -3.3,
    width: 64,
    content: (
      <svg viewBox="0 0 64 54" {...DOODLE_STROKE}>
        <path d="M10 4h44a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H30L19 49V38h-9a6 6 0 0 1-6-6V10a6 6 0 0 1 6-6z" />
        <g fill="#F5A00F" stroke="none">
          <circle cx="21" cy="21" r="3" />
          <circle cx="32" cy="21" r="3" />
          <circle cx="43" cy="21" r="3" />
        </g>
      </svg>
    ),
  },
  {
    id: "phone",
    left: 46,
    top: 91,
    tilt: 8,
    delay: -0.9,
    width: 48,
    content: (
      <svg viewBox="0 0 48 48" {...DOODLE_STROKE}>
        <path d="M12 5h7l4 10-5 3a22 22 0 0 0 12 12l3-5 10 4v7a4 4 0 0 1-4 4C21 40 8 27 8 9a4 4 0 0 1 4-4z" />
        <path d="M30 6a12 12 0 0 1 12 12" stroke="#F5A00F" />
      </svg>
    ),
  },
  {
    id: "pin",
    left: 4,
    top: 90,
    tilt: -6,
    delay: -4,
    width: 42,
    content: (
      <svg viewBox="0 0 40 52" {...DOODLE_STROKE}>
        <path d="M20 48S5 32 5 20a15 15 0 0 1 30 0c0 12-15 28-15 28z" />
        <circle cx="20" cy="20" r="5.5" stroke="#F5A00F" />
      </svg>
    ),
  },
];

/** Sao nhấp nháy xen giữa các nét vẽ */
const SPARKLES = [
  { left: 26, top: 14, size: 18, delay: 0 },
  { left: 78, top: 16, size: 13, delay: 1.1 },
  { left: 96, top: 58, size: 16, delay: 0.6 },
  { left: 34, top: 95, size: 13, delay: 1.8 },
];

/**
 * Nét vẽ tay trôi nhẹ quanh phần chữ của trang "Liên hệ", lấp khoảng trống ở nửa trái.
 * Chỉ để trang trí nên ẩn với trình đọc màn hình, và chỉ hiện từ màn hình lớn (lg).
 */
export function ContactDoodles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden w-[41%] select-none lg:block">
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
      {SPARKLES.map((sparkle) => (
        <Sparkle key={`${sparkle.left}-${sparkle.top}`} {...sparkle} />
      ))}
    </div>
  );
}

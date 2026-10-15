import type { CSSProperties } from "react";
import type { PaperPlaneProps } from "@/interfaces/home";

/** Kích thước khung vẽ (đơn vị SVG) */
const WIDTH = 480;

const HEIGHT = 190;

/** Ngôi sao bốn cánh, tâm ở gốc toạ độ */
const STAR_SHAPE = "M0 -10C1.4 -3.2 3.2 -1.4 10 0C3.2 1.4 1.4 3.2 0 10C-1.4 3.2 -3.2 1.4 -10 0C-3.2 -1.4 -1.4 -3.2 0 -10Z";

/** Các ngôi sao quanh đường bay: vị trí, cỡ, màu và độ trễ nhấp nháy (giây) */
const STARS = [
  { x: 130, y: 95, size: 1.96, color: "fill-brand-orange", delay: 0 },
  { x: 350, y: 95, size: 1.59, color: "fill-brand-navy/55", delay: 0.9 },
  { x: 240, y: 20, size: 1.45, color: "fill-brand-orange", delay: 1.6 },
  { x: 240, y: 174, size: 1.01, color: "fill-brand-navy/55", delay: 0.4 },
  { x: 22, y: 18, size: 1.09, color: "fill-brand-navy/55", delay: 1.2 },
  { x: 462, y: 176, size: 1.3, color: "fill-brand-orange", delay: 2 },
  { x: 466, y: 14, size: 0.87, color: "fill-brand-orange", delay: 0.6 },
  { x: 14, y: 172, size: 0.8, color: "fill-brand-orange", delay: 1.8 },
  { x: 180, y: 150, size: 0.65, color: "fill-brand-navy/55", delay: 2.3 },
  { x: 305, y: 42, size: 0.65, color: "fill-brand-navy/55", delay: 1.4 },
];

/** Đường bay hình số 8 nằm ngang, khép kín nên máy bay lượn mãi không giật */
function figureEightPath(points = 96) {
  const commands = Array.from({ length: points }, (_, i) => {
    const t = (2 * Math.PI * i) / points;
    const x = WIDTH / 2 + (WIDTH / 2 - 34) * Math.sin(t);
    const y = HEIGHT / 2 + (HEIGHT / 2 - 34) * Math.sin(2 * t);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `${commands.join(" ")} Z`;
}

/** Đường bay tính sẵn một lần */
const FLIGHT_PATH = figureEightPath();

/**
 * Máy bay giấy lượn theo hình số 8, để lại vệt chấm mờ, xung quanh có vài ngôi sao nhấp nháy.
 * Chuyển động nằm ở lớp .paper-plane và .twinkle trong styles/index.css (đứng yên khi thiết bị bật "giảm chuyển động").
 */
export function PaperPlane({ className = "" }: PaperPlaneProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`block h-auto w-full overflow-visible ${className}`}
    >
      {/* Vệt đường bay */}
      <path d={FLIGHT_PATH} className="stroke-brand-navy/25" strokeWidth="2.5" strokeDasharray="1 11" />
      {STARS.map((star) => (
        <g key={`${star.x}-${star.y}`} transform={`translate(${star.x} ${star.y}) scale(${star.size})`}>
          <path d={STAR_SHAPE} className={`twinkle ${star.color}`} style={{ "--twinkle-delay": `${-star.delay}s` } as CSSProperties} />
        </g>
      ))}
      {/* Máy bay bám theo đường bay, mũi hướng theo chiều bay */}
      <g className="paper-plane" style={{ offsetPath: `path("${FLIGHT_PATH}")` }}>
        <g transform="scale(1.45)" strokeWidth="1.3" className="stroke-brand-navy drop-shadow-[0_4px_3px_rgba(8,42,102,0.28)]">
          <path d="M24 0 L-22 -15 L-11 1 Z" className="fill-white" />
          <path d="M24 0 L-11 1 L-16 15 Z" className="fill-[#DCE6F5]" />
          <path d="M-11 1 L-16 15 L-5 5 Z" className="fill-brand-orange" />
        </g>
      </g>
    </svg>
  );
}

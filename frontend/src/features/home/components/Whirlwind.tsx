import { forwardRef, type CSSProperties } from "react";

/* Các vòng của phễu lốc xoáy, từ miệng phễu (rộng) xuống đuôi (hẹp) */
const RINGS = [
  { y: 16, rx: 50 },
  { y: 36, rx: 43 },
  { y: 55, rx: 36 },
  { y: 72, rx: 29 },
  { y: 88, rx: 23 },
  { y: 102, rx: 17 },
  { y: 115, rx: 12 },
  { y: 126, rx: 8 },
  { y: 136, rx: 4.5 },
];

/* Hạt bụi phấn bay vòng quanh phễu */
const DUST = [
  { y: 30, rx: 56, duration: 0.7 },
  { y: 70, rx: 44, duration: 0.55 },
  { y: 108, rx: 30, duration: 0.62 },
];

/** Lốc xoáy vẽ bằng nét phấn: các vòng elip xoay liên tục và lắc lư lệch pha nhau. */
export const Whirlwind = forwardRef<HTMLDivElement>(function Whirlwind(_props, ref) {
  return (
    <div ref={ref} aria-hidden="true" className="whirlwind pointer-events-none absolute left-0 top-0 z-10 w-[120px] sm:w-[150px]">
      <svg viewBox="-6 0 132 150" fill="none" strokeLinecap="round" className="block w-full overflow-visible">
        {RINGS.map((ring, index) => (
          <g key={ring.y} className="whirlwind-ring" style={{ "--ring-delay": `${index * -95}ms` } as CSSProperties}>
            <ellipse
              cx="60"
              cy={ring.y}
              rx={ring.rx}
              ry={ring.rx * 0.26}
              pathLength={100}
              strokeDasharray="64 36"
              strokeWidth={index % 3 === 1 ? 2.5 : 3.2}
              className={`whirlwind-spin ${index % 3 === 1 ? "stroke-brand-orange" : "stroke-white"}`}
              style={{ opacity: 0.95 - index * 0.04 }}
            />
          </g>
        ))}
        {DUST.map((dust) => (
          <ellipse
            key={dust.y}
            cx="60"
            cy={dust.y}
            rx={dust.rx}
            ry={dust.rx * 0.3}
            pathLength={100}
            strokeDasharray="1.5 98.5"
            strokeWidth="5"
            className="whirlwind-spin stroke-brand-marker"
            style={{ animationDuration: `${dust.duration}s` }}
          />
        ))}
      </svg>
    </div>
  );
});

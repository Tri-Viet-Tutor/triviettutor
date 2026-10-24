import { Link } from "react-router-dom";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER, FOCUS_RING } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { Sparkle } from "@/components/motion/Sparkle";
import type { ConsultCtaSectionProps } from "@/interfaces/ui";

/* Sao bốn cánh nhấp nháy hai bên câu hỏi — vị trí tính theo % của cả dải */
const SPARKLES = [
  { left: 14, top: 30, size: 22, delay: 0 },
  { left: 24, top: 66, size: 14, delay: 1.1 },
  { left: 78, top: 24, size: 16, delay: 0.6 },
  { left: 88, top: 58, size: 24, delay: 1.7 },
];

export function ConsultCtaSection({ title, highlight, description }: ConsultCtaSectionProps) {
  return (
    <section className="relative overflow-hidden bg-[#E8E2D5]">
      {/* Mép trên hoà vào phần phía trên, quầng cam mờ ở giữa */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#F5F1E9] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_44%_72%_at_50%_58%,rgba(245,160,15,0.34),transparent_72%)]"
      />

      {/* Sao nhấp nháy và hai mũi tên nét đứt chỉ vào nút (chỉ hiện từ máy tính bảng) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
        {SPARKLES.map((sparkle) => (
          <Sparkle key={sparkle.left} {...sparkle} />
        ))}
        <svg
          viewBox="0 0 200 110"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute bottom-[19%] right-1/2 mr-[150px] w-[150px] stroke-brand-navy/45 lg:w-[190px]"
        >
          <path d="M6 10c20 62 96 92 180 66" strokeWidth="2.4" strokeDasharray="7 8" />
          <path d="M170 66l17 10-13 14" strokeWidth="2.4" />
        </svg>
        <svg
          viewBox="0 0 200 110"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute bottom-[19%] left-1/2 ml-[150px] w-[150px] -scale-x-100 stroke-brand-navy/45 lg:w-[190px]"
        >
          <path d="M6 10c20 62 96 92 180 66" strokeWidth="2.4" strokeDasharray="7 8" />
          <path d="M170 66l17 10-13 14" strokeWidth="2.4" />
        </svg>
      </div>

      <Reveal className={`${CONTAINER} relative flex flex-col items-center py-16 text-center lg:py-24`}>
        <h2 className="text-balance text-[30px] font-extrabold leading-tight tracking-tight text-brand-navy sm:text-[38px] lg:text-[46px]">
          {title}{" "}
          <span className="relative inline-block whitespace-nowrap">
            {highlight}
            {/* Nét gạch chân vẽ tay */}
            <svg
              aria-hidden="true"
              viewBox="0 0 240 14"
              preserveAspectRatio="none"
              fill="none"
              className="absolute -bottom-2 left-0 h-3 w-full stroke-brand-orange lg:-bottom-3 lg:h-3.5"
            >
              <path d="M3 9C42 2 78 12 120 6s82-4 117 2" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
          </span>
        </h2>
        <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-brand-muted lg:text-[18px]">{description}</p>
        <Link
          to={ROUTES.contactForm}
          className={`group mt-8 inline-flex h-14 items-center gap-5 rounded-full bg-brand-orange pl-8 pr-2.5 text-[16px] font-bold text-brand-navyDeep shadow-[0_18px_30px_-16px_rgba(222,139,0,0.95)] transition-colors hover:bg-[#FFB534] ${FOCUS_RING}`}
        >
          Đăng ký tư vấn
          <Icon
            name="arrow_forward"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navyDeep text-[20px] text-white transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </Reveal>
    </section>
  );
}

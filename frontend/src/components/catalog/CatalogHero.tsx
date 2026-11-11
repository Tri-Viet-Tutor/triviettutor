import type { CSSProperties } from "react";
import { HeroDoodles } from "@/components/catalog/HeroDoodles";
import { SubjectOrbit } from "@/components/catalog/SubjectOrbit";
import { CATALOG_TITLE_LINES } from "@/constants/catalog";
import { CONTAINER } from "@/constants/classNames";
import { riseDelay } from "@/utils/motion";
import type { CatalogHeroProps } from "@/interfaces/catalog";

// Phần mở đầu trang "Khối lớp / Môn học": chữ bên trái, bên phải là ảnh học sinh
// với các bong bóng môn học chung quanh (khác hẳn khung ảnh của trang chủ).
// Quanh phần chữ có vài nét vẽ tay về các môn học cho đỡ trống.
// Nền xanh nhạt chấm bi, nhạt dần về màu giấy ở mép dưới.
export function CatalogHero({ activeSubject, onPickSubject }: CatalogHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#CFE0F8_0%,#E3ECFA_48%,#F1EEE8_100%)]">
      {
        // Chấm bi mờ, đậm ở góc trên trái và tan dần
      }
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(11,58,140,0.2)_1.3px,transparent_1.3px)] bg-[length:22px_22px] [mask-image:linear-gradient(120deg,black,transparent_70%)]"
      />
      {
        // Hai vòng tròn nét mảnh
      }
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        className="pointer-events-none absolute inset-0 h-full w-full text-brand-navy/15"
      >
        <circle cx="110" cy="70" r="210" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 8" />
        <circle cx="1090" cy="560" r="280" stroke="currentColor" strokeWidth="2" />
      </svg>
      {
        // Quầng cam nhạt sau banner
      }
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_55%_at_72%_52%,rgba(245,160,15,0.2),transparent_72%)]"
      />
      {
        // Mép dưới hoà vào nền giấy của phần kế tiếp
      }
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F5F1E9]"
      />

      <div className={`${CONTAINER} relative grid grid-cols-1 items-center gap-10 py-14 lg:grid-cols-12 lg:gap-12 lg:py-20`}>
        <HeroDoodles />
        <div className="relative lg:col-span-6">
          <p
            className="hero-rise inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-brand-navy"
            style={riseDelay(0)}
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
            Khóa học lớp 10 – 12
          </p>
          <h1
            aria-label={CATALOG_TITLE_LINES.join(" ")}
            className="mt-5 text-[30px] font-extrabold leading-[1.14] sm:text-[46px] lg:text-[54px] lg:tracking-tight xl:text-[60px]"
          >
            {CATALOG_TITLE_LINES.map((line, index) => (
              <span
                key={line}
                aria-hidden="true"
                data-text={line}
                className="stroke-wipe"
                style={{ "--wipe-delay": `${250 + index * 400}ms` } as CSSProperties}
              >
                {line}
              </span>
            ))}
          </h1>
          <p className="hero-rise mt-6 max-w-xl text-[17px] leading-relaxed text-brand-muted lg:text-[18px]" style={riseDelay(700)}>
            Bấm vào một môn để bắt đầu. Phiếu bên dưới ghi lại đúng lớp bạn cần.
          </p>
        </div>

        <div className="hero-rise lg:col-span-6" style={riseDelay(400)}>
          <SubjectOrbit activeSubject={activeSubject} onPickSubject={onPickSubject} />
        </div>
      </div>
    </section>
  );
}

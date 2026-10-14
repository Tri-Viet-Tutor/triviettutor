import { type ReactNode, useEffect, useState } from "react";
import { prefersReducedMotion } from "@/utils/motion";

export interface Slide {
  src: string;
  alt: string;
}

interface FramedSlideshowProps {
  slides: Slide[];
  /** Thời gian hiển thị mỗi ảnh (mili giây) */
  intervalMs?: number;
  /** Nội dung nổi đặt chồng lên khung, ví dụ một nhãn ở góc */
  children?: ReactNode;
}

/**
 * Khung ảnh tự chuyển ở phần mở đầu trang chủ: ảnh mờ dần và thu phóng chậm,
 * khung bo góc lớn viền trắng, khối xanh đặt lệch phía sau, vòng cam và mảng chấm bi.
 */
export function FramedSlideshow({ slides, intervalMs = 5000, children }: FramedSlideshowProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Dừng khi rê chuột vào ảnh, hoặc khi thiết bị bật "giảm chuyển động"
    if (paused || slides.length < 2 || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [paused, active, slides.length, intervalMs]);

  return (
    <div className="relative mx-auto max-w-md lg:max-w-none">
      {/* Khối xanh đặt lệch phía sau ảnh */}
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-4 translate-y-4 rotate-2 rounded-[36px] rounded-tr-[120px] bg-brand-navy"
      />
      {/* Vòng cam nằm trong góc bo lớn */}
      <div
        aria-hidden="true"
        className="absolute -right-3 -top-4 h-[84px] w-[84px] rounded-full border-[13px] border-brand-orange"
      />
      {/* Mảng chấm bi */}
      <div
        aria-hidden="true"
        className="absolute -bottom-8 -left-8 h-28 w-28 bg-[radial-gradient(theme(colors.brand.navy)_1.6px,transparent_1.6px)] bg-[length:14px_14px] opacity-30"
      />

      <div
        className="relative aspect-[4/3] overflow-hidden rounded-[36px] rounded-tr-[120px] border-[6px] border-white bg-brand-tint shadow-soft lg:aspect-[5/4]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.map((slide, index) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            aria-hidden={index !== active}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1200ms,6000ms] ease-out ${
              index === active ? "opacity-100 scale-100" : "opacity-0 scale-110"
            }`}
          />
        ))}
        {/* Chấm chuyển ảnh */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 right-4 flex items-center">
            {slides.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                aria-label={`Xem ảnh ${index + 1}`}
                aria-current={index === active}
                onClick={() => setActive(index)}
                className="group p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <span
                  className={`block h-2 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-all duration-300 ${
                    index === active ? "w-6 bg-white" : "w-2 bg-white/65 group-hover:bg-white"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}

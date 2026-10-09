import { useEffect, useState } from "react";
import { HERO_SLIDE_MS, HERO_SLIDES } from "@/features/home/data/hero";
import { prefersReducedMotion } from "@/utils/motion";

/** Khung ảnh mở đầu: ba ảnh tự chuyển lần lượt, mờ dần và thu phóng chậm */
export function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Dừng khi rê chuột vào ảnh, hoặc khi thiết bị bật "giảm chuyển động"
    if (paused || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % HERO_SLIDES.length), HERO_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [paused, active]);

  return (
    <div
      className="relative aspect-[4/3] overflow-hidden rounded-[36px] rounded-tr-[120px] border-[6px] border-white bg-brand-tint shadow-soft lg:aspect-[5/4]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {HERO_SLIDES.map((slide, index) => (
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
      <div className="absolute bottom-3 right-4 flex items-center">
        {HERO_SLIDES.map((slide, index) => (
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
    </div>
  );
}

import type { CSSProperties } from "react";
import { LanyardTag } from "@/components/home/LanyardTag";
import { FramedSlideshow } from "@/components/ui/FramedSlideshow";
import { ASSETS } from "@/constants/assets";
import { CONTAINER, FOCUS_RING } from "@/constants/classNames";
import { HERO_SLIDE_MS, HERO_SLIDES, HERO_TITLE_LINES } from "@/constants/home";
import { riseDelay } from "@/utils/motion";

/** Phần mở đầu: tiêu đề, khung ảnh tự chuyển và thẻ đeo "Tìm kiếm gia sư". */
export function HeroSection() {
  return (
    <section className="paper-grid relative bg-[#E8E2D5]">
      {/* Thẻ đeo "Tìm kiếm gia sư" thả từ mép trên xuống — chỉ hiện trên màn hình rộng */}
      <div className={`${CONTAINER} relative z-10 hidden xl:block`}>
        <LanyardTag className="absolute left-[53.5%] top-0 -translate-x-1/2" />
      </div>
      <div className={`${CONTAINER} grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center py-14 lg:py-24`}>
        <div className="lg:col-span-7">
          <p
            className="hero-rise inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-brand-navy"
            style={riseDelay(0)}
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
            Gia sư THPT lớp 10 – 12, luyện thi Đại học
          </p>
          <h1
            aria-label={HERO_TITLE_LINES.join(" ")}
            className="mt-5 text-[30px] sm:text-[46px] lg:text-[60px] leading-[1.14] font-extrabold lg:tracking-tight"
          >
            {HERO_TITLE_LINES.map((line, index) => (
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
          <p className="hero-rise mt-6 max-w-xl text-[17px] lg:text-[18px] leading-relaxed text-brand-muted" style={riseDelay(700)}>
            Khóa học theo từng môn cho học sinh lớp 10 – 12, ôn thi Tốt nghiệp THPT và ĐGNL.
          </p>
        </div>
        <div className="hero-rise lg:col-span-5" style={riseDelay(400)}>
          <FramedSlideshow slides={HERO_SLIDES} intervalMs={HERO_SLIDE_MS}>
            {/* Nhãn nổi: bấm để cuộn tới phần đội ngũ gia sư */}
            <a
              href="#tutors-showcase"
              onClick={(event) => {
                event.preventDefault();
                document.getElementById("tutors-showcase")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`float-soft absolute -left-3 bottom-8 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/85 py-2.5 pl-3 pr-4 shadow-soft backdrop-blur-md sm:-left-6 ${FOCUS_RING}`}
            >
              <span aria-hidden="true" className="flex -space-x-2.5">
                {[ASSETS.public.tutors.trangAnh, ASSETS.public.tutors.hoDucThuan, ASSETS.public.tutors.nguyenCongChinh].map((src) => (
                  <img key={src} src={src} alt="" className="h-9 w-9 rounded-full object-cover object-top ring-2 ring-white" />
                ))}
              </span>
              <span className="leading-tight">
                <span className="block text-[14px] font-bold text-brand-navy">Đội ngũ gia sư</span>
                <span className="block text-[12px] text-brand-muted">Toán, Văn, Anh, Hóa, Tin</span>
              </span>
            </a>
          </FramedSlideshow>
        </div>
      </div>
    </section>
  );
}

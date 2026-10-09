import { type CSSProperties } from "react";
import { ASSETS } from "@/constants/assets";
import { HeroSlideshow } from "@/features/home/components/HeroSlideshow";
import { LanyardTag } from "@/features/home/components/LanyardTag";
import { HERO_TITLE_LINES } from "@/features/home/data/hero";
import { CONTAINER, FOCUS_RING } from "@/features/home/styles";

/** Độ trễ (ms) cho hiệu ứng nổi lên ở phần mở đầu */
function rise(delay: number) {
  return { "--rise-delay": `${delay}ms` } as CSSProperties;
}

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
            style={rise(0)}
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
          <p
            className="hero-rise mt-6 max-w-xl text-[17px] lg:text-[18px] leading-relaxed text-brand-muted"
            style={rise(700)}
          >
            Khóa học theo từng môn cho học sinh lớp 10 – 12, ôn thi Tốt nghiệp THPT và ĐGNL.
          </p>
        </div>
        <div className="hero-rise lg:col-span-5" style={rise(400)}>
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
            <HeroSlideshow />
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
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover object-top ring-2 ring-white"
                  />
                ))}
              </span>
              <span className="leading-tight">
                <span className="block text-[14px] font-bold text-brand-navy">Đội ngũ gia sư</span>
                <span className="block text-[12px] text-brand-muted">Toán, Văn, Anh, Hóa, Tin</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

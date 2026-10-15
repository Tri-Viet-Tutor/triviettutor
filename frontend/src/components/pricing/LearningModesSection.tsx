import { Link } from "react-router-dom";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER, FOCUS_RING } from "@/constants/classNames";
import { LEARNING_PHOTOS } from "@/constants/pricing";
import { ROUTES } from "@/constants/routes";

/** Ảnh giữa thấp hơn hai ảnh bên để ba khung vòm so le nhau */
const STAGGER = ["", "translate-y-8 sm:translate-y-12", ""];

/**
 * "Học tại trung tâm hoặc trực tuyến": chữ bên trái, ba ảnh khung vòm so le bên phải
 * (lớp tại trung tâm, học sinh THPT, lớp trực tuyến), mỗi ảnh một nhãn ở chân.
 */
export function LearningModesSection() {
  return (
    <section id="learning-modes" className="bg-[#F5F1E9] pb-20 lg:pb-28">
      <div className={`${CONTAINER} grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10`}>
        <Reveal className="lg:col-span-4">
          <h2 className="text-balance text-[28px] font-extrabold leading-tight tracking-tight text-brand-navy lg:text-[36px]">
            Học Tại Trung Tâm Hoặc Trực Tuyến
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-brand-muted lg:text-[17px]">
            Mỗi khóa đều có lớp tại trung tâm và lớp trực tuyến.
          </p>
          <Link
            to={ROUTES.subjects}
            className={`group mt-7 inline-flex h-12 items-center gap-4 rounded-full bg-brand-orange pl-6 pr-2 text-[15px] font-bold text-brand-navyDeep transition-colors hover:bg-[#FFB534] ${FOCUS_RING}`}
          >
            Chọn lớp
            <Icon
              name="arrow_forward"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navyDeep text-[19px] text-white transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </Reveal>

        <div className="relative lg:col-span-8">
          {/* Vầng tròn cam mờ và cung nét đứt phía sau ba ảnh */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 aspect-square w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-orange/20"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            fill="none"
            className="absolute left-1/2 top-1/2 aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2"
          >
            <circle cx="50" cy="50" r="49" className="orbit-dash stroke-brand-navy/25" strokeWidth="0.35" strokeDasharray="1.4 1.8" />
          </svg>

          <ul className="relative grid grid-cols-3 gap-3 pb-16 sm:gap-6 sm:pb-20">
            {LEARNING_PHOTOS.map((photo, index) => (
              <Reveal as="li" key={photo.label} delay={index * 110}>
                {/* So le đặt ở figure vì Reveal đã dùng transform của thẻ li */}
                <figure className={`group relative ${STAGGER[index % STAGGER.length]}`}>
                  <div className="overflow-hidden rounded-t-[999px] rounded-b-[26px] border-[5px] border-white bg-brand-tint shadow-[0_24px_38px_-22px_rgba(8,42,102,0.7)] sm:border-[6px]">
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      loading="lazy"
                      className={`aspect-[3/4.4] w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none ${photo.focus}`}
                    />
                  </div>
                  <figcaption className="absolute left-1/2 top-full -mt-4 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-brand-navy shadow-[0_8px_16px_-8px_rgba(8,42,102,0.6)] sm:px-4 sm:py-2 sm:text-[14px]">
                    <Icon name={photo.icon} className="text-[16px] text-brand-orangeHover sm:text-[18px]" />
                    {photo.label}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

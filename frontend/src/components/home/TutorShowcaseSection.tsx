import { Link } from "react-router-dom";
import { TutorCard } from "@/components/home/TutorCard";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER, FOCUS_RING } from "@/constants/classNames";
import { TUTOR_PROMO_POINTS, TUTORS } from "@/constants/home";
import { ROUTES } from "@/constants/routes";

/** Toạ độ các đỉnh của hình ngôi sao nhiều cánh (nhãn dán nổi bật) */
function starburstPoints(spikes: number, outer: number, inner: number) {
  return Array.from({ length: spikes * 2 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(50 + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

/** Ngôi sao 16 cánh tính sẵn cho nhãn "Lớp tối đa 8 học sinh" */
const STARBURST = starburstPoints(16, 50, 42);

/** Đội ngũ gia sư: mục quảng cáo khóa học trải hết chiều ngang, nền là quầng sáng cam trong suốt hoà vào nền giấy. */
export function TutorShowcaseSection() {
  return (
    <section id="tutors-showcase" className="relative overflow-hidden bg-[#E8E2D5] py-16 lg:py-24">
      {/* Quầng sáng cam – vàng trong suốt, đậm sau cụm ảnh và nhạt dần ra mép */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_64%_82%_at_74%_46%,rgba(245,160,15,0.5),transparent_72%),radial-gradient(ellipse_42%_55%_at_6%_92%,rgba(255,194,77,0.38),transparent_70%)]"
      />
      {/* Tia nắng rất nhạt toả sau cụm ảnh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[repeating-conic-gradient(from_0deg_at_74%_46%,rgba(255,255,255,0.3)_0deg_6deg,transparent_6deg_12deg)] [mask-image:radial-gradient(ellipse_56%_74%_at_74%_46%,black,transparent_72%)]"
      />

      <div className={`${CONTAINER} relative`}>
        <Reveal className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8 xl:gap-14">
          <div className="lg:col-span-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-navyDeep px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-white">
              <Icon name="campaign" className="text-[17px] text-brand-orange" />
              Khóa học lớp 10 – 12
            </p>
            <h2 className="mt-5 text-[30px] font-extrabold leading-[1.24] tracking-tight text-brand-navy sm:text-[38px] lg:text-[34px] xl:text-[44px]">
              <span className="block">Đội ngũ gia sư</span>
              <span className="block">
                <em className="inline-block -rotate-1 bg-brand-navyDeep px-2.5 not-italic text-white">tâm huyết</em>, giàu
              </span>
              <span className="block">
                <em className="inline-block rotate-1 bg-brand-orange px-2.5 not-italic text-brand-navyDeep">kinh nghiệm</em>
              </span>
              <span className="block">luyện thi thực chiến</span>
            </h2>
            <ul className="mt-6 space-y-2.5 text-brand-ink">
              {TUTOR_PROMO_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-[15.5px] font-medium leading-snug">
                  <Icon name="check_circle" className="mt-px text-[20px] text-brand-orangeHover" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                to={ROUTES.contactForm}
                className={`group inline-flex h-12 items-center gap-3 whitespace-nowrap rounded-full bg-brand-navyDeep pl-6 pr-1.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-navy ${FOCUS_RING}`}
              >
                Đăng ký khóa học
                <Icon
                  name="arrow_forward"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange text-[19px] text-brand-navyDeep transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                to={ROUTES.tutorSearch}
                className={`group inline-flex items-center gap-1 text-[15px] font-semibold text-brand-navy ${FOCUS_RING}`}
              >
                <span className="underline decoration-brand-orange decoration-2 underline-offset-[6px] group-hover:decoration-brand-navy">
                  Xem tất cả gia sư
                </span>
                <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
            </div>
          </div>

          <div className="relative lg:col-span-7">
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 sm:pb-6">
              {TUTORS.map((tutor, index) => (
                <TutorCard key={tutor.name} tutor={tutor} index={index} />
              ))}
            </ul>
            {/* Nhãn dán hình ngôi sao ở góc cụm ảnh */}
            <div className="absolute -right-2 -top-9 h-[96px] w-[96px] rotate-12 drop-shadow-[0_6px_8px_rgba(8,42,102,0.3)] sm:-right-5 sm:-top-11 sm:h-[116px] sm:w-[116px]">
              <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                <polygon points={STARBURST} className="fill-brand-navyDeep" />
              </svg>
              <p className="relative flex h-full flex-col items-center justify-center text-center font-extrabold uppercase leading-none text-white">
                <span className="text-[9.5px] tracking-[0.06em] sm:text-[10.5px]">Lớp tối đa</span>
                <span className="text-[28px] text-brand-orange sm:text-[34px]">8</span>
                <span className="text-[9.5px] tracking-[0.06em] sm:text-[10.5px]">học sinh</span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

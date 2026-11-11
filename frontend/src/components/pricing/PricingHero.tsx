import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { PriceTag } from "@/components/pricing/PriceTag";
import { PricingDoodles } from "@/components/pricing/PricingDoodles";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER, FOCUS_RING, TEXT_LINK } from "@/constants/classNames";
import { PRICING_HERO_BACKDROP, PRICING_TITLE_LINES } from "@/constants/pricing";
import { ROUTES } from "@/constants/routes";
import { riseDelay } from "@/utils/motion";
import type { PricingHeroProps } from "@/interfaces/pricing";

// Phần mở đầu trang "Mua khóa học": chữ bên trái (có nét vẽ tay chung quanh cho đỡ trống),
// thẻ giá treo dây bên phải, nền hồng đào nhạt có một tấm ảnh mờ phía sau.
export function PricingHero({ onViewFees }: PricingHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(155deg,#FCDFC9_0%,#FBEBDA_46%,#F5F1E9_100%)]">
      {
        // Ảnh nền mờ: nữ sinh mỉm cười làm bài, hoà vào nền hồng đào và tan dần ở hai mép trên dưới.
        // Trên màn hình lớn ảnh rộng hơn khung và neo mép phải để nụ cười nằm giữa phần chữ và thẻ giá.
      }
      <img
        src={PRICING_HERO_BACKDROP}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 h-full w-full max-w-none object-cover object-[center_26%] opacity-[0.28] mix-blend-multiply lg:w-[114%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_22%,black_70%,transparent_100%)]"
      />
      {
        // Lớp sáng bên trái giữ cho chữ dễ đọc trên ảnh
      }
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(252,231,214,0.78)_0%,rgba(252,231,214,0.35)_48%,transparent_78%)]"
      />
      {
        // Chấm bi mờ ở góc phải và mép dưới hoà vào nền giấy
      }
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(11,58,140,0.16)_1.3px,transparent_1.3px)] bg-[length:22px_22px] [mask-image:linear-gradient(240deg,black,transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F5F1E9]"
      />

      <div className={`${CONTAINER} relative grid grid-cols-1 items-center gap-10 pb-14 pt-14 lg:grid-cols-12 lg:gap-12 lg:pb-20 lg:pt-16`}>
        <PricingDoodles />
        <div className="relative lg:col-span-7">
          <h1
            aria-label={PRICING_TITLE_LINES.join(" ")}
            className="text-[34px] font-extrabold leading-[1.14] sm:text-[48px] lg:text-[56px] lg:tracking-tight xl:text-[62px]"
          >
            {PRICING_TITLE_LINES.map((line, index) => (
              <span
                key={line}
                aria-hidden="true"
                data-text={line}
                className="stroke-wipe"
                style={{ "--wipe-delay": `${150 + index * 400}ms` } as CSSProperties}
              >
                {line}
              </span>
            ))}
          </h1>
          <p className="hero-rise mt-5 max-w-lg text-[17px] leading-relaxed text-brand-muted lg:text-[18px]" style={riseDelay(500)}>
            Chọn khóa, thanh toán và nhận tài khoản học viên để vào học.
          </p>
          <div className="hero-rise mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={riseDelay(700)}>
            <button
              type="button"
              onClick={onViewFees}
              className={`group inline-flex h-12 items-center gap-4 rounded-full bg-brand-orange pl-6 pr-2 text-[15px] font-bold text-brand-navyDeep shadow-[0_16px_26px_-16px_rgba(222,139,0,0.95)] transition-colors hover:bg-[#FFB534] ${FOCUS_RING}`}
            >
              Chọn khóa học
              <Icon
                name="arrow_downward"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navyDeep text-[19px] text-white transition-transform duration-200 group-hover:translate-y-0.5"
              />
            </button>
            <Link to={ROUTES.contactForm} className={TEXT_LINK}>
              Đăng ký tư vấn
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>
        </div>

        <div className="hero-rise lg:col-span-5" style={riseDelay(300)}>
          <PriceTag />
        </div>
      </div>
    </section>
  );
}

import { type CSSProperties } from "react";
import { CONTAINER } from "@/constants/classNames";
import { ConsultLetterForm } from "@/features/contact/components/ConsultLetterForm";
import { ContactChannels } from "@/features/contact/components/ContactChannels";
import { ContactDoodles } from "@/features/contact/components/ContactDoodles";
import { CONTACT_TITLE_LINES } from "@/features/contact/data/contact";

/** Độ trễ (ms) cho hiệu ứng nổi lên */
function rise(delay: number) {
  return { "--rise-delay": `${delay}ms` } as CSSProperties;
}

/**
 * Toàn bộ trang "Liên hệ" trong một phần: bên trái là tiêu đề và các cách liên hệ,
 * bên phải là lá thư đăng ký tư vấn. Nền tím nhạt, nhạt dần về màu giấy.
 */
export function ContactSection() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(150deg,#E4DFF6_0%,#EFEAF5_42%,#F5F1E9_100%)]">
      {/* Chấm bi mờ ở góc trái và mép dưới hoà vào nền giấy */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(11,58,140,0.16)_1.3px,transparent_1.3px)] bg-[length:22px_22px] [mask-image:linear-gradient(120deg,black,transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F5F1E9]"
      />

      <div className={`${CONTAINER} relative grid grid-cols-1 items-center gap-12 pb-16 pt-14 lg:grid-cols-12 lg:gap-12 lg:pb-24 lg:pt-16`}>
        <ContactDoodles />

        <div className="relative lg:col-span-5">
          <h1
            aria-label={CONTACT_TITLE_LINES.join(" ")}
            className="text-[34px] font-extrabold leading-[1.14] sm:text-[48px] lg:text-[52px] lg:tracking-tight xl:text-[58px]"
          >
            {CONTACT_TITLE_LINES.map((line, index) => (
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
          <p className="hero-rise mt-5 max-w-md text-[17px] leading-relaxed text-brand-muted lg:text-[18px]" style={rise(500)}>
            Viết thư đăng ký tư vấn, hoặc liên hệ thẳng với trung tâm.
          </p>
          <div className="hero-rise mt-6 max-w-md" style={rise(700)}>
            <ContactChannels />
          </div>
        </div>

        <div className="hero-rise lg:col-span-7 xl:col-span-6 xl:col-start-7" style={rise(300)}>
          <ConsultLetterForm />
        </div>
      </div>
    </section>
  );
}

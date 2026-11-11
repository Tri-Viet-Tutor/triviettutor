import { Link } from "react-router-dom";
import { ClassSizeSeats } from "@/components/catalog/ClassSizeSeats";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER } from "@/constants/classNames";
import { CLASS_PERKS } from "@/constants/classOptions";
import { ROUTES } from "@/constants/routes";

// Sĩ số và tiện ích lớp học: dải nền vàng kem tràn ngang trang, hai mép hoà vào nền giấy. Bên trái là sĩ số một lớp,
// bên phải là những việc học viên làm được trên hệ thống, mỗi việc một thẻ trong suốt.
export function ClassPerksSection() {
  return (
    <section
      id="class-perks"
      className="relative overflow-hidden bg-[linear-gradient(135deg,#FFF6E0_0%,#FFE9BE_50%,#FFDDA0_100%)] py-16 text-brand-navy lg:py-24"
    >
      {
        // Quầng sáng trắng sau sĩ số, quầng cam ở góc trên phải, chấm bi mờ
      }
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_58%_at_16%_66%,rgba(255,255,255,0.75),transparent_70%),radial-gradient(ellipse_45%_60%_at_92%_8%,rgba(245,160,15,0.38),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(11,58,140,0.14)_1.2px,transparent_1.2px)] bg-[length:24px_24px] [mask-image:linear-gradient(200deg,black,transparent_60%)]"
      />

      {
        // Hai mép hoà vào nền giấy của phần trên và dưới
      }
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#F5F1E9] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F5F1E9] to-transparent"
      />

      <div className={`${CONTAINER} relative`}>
        <Reveal className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-balance text-[28px] font-extrabold leading-tight tracking-tight lg:text-[36px]">
              Sĩ Số Và Tiện Ích Lớp Học
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-brand-ink/75 lg:text-[17px]">
              Lịch học, điểm danh và xin nghỉ đều theo dõi được trên tài khoản học viên.
            </p>
          </div>
          <Link
            to={ROUTES.pricing}
            className="inline-flex shrink-0 items-center gap-1 text-[15px] font-semibold text-brand-navy hover:text-brand-navyDeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            Mua khóa học
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <Reveal from="left" className="lg:col-span-5">
            <ClassSizeSeats />
          </Reveal>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
            {CLASS_PERKS.map((perk, index) => (
              <Reveal
                as="li"
                key={perk.icon}
                delay={index * 90}
                className="rounded-2xl border border-white/80 bg-white/55 p-5 shadow-[0_18px_36px_-24px_rgba(8,42,102,0.45)] backdrop-blur-sm transition-colors duration-300 hover:bg-white/85 lg:p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy">
                  <Icon name={perk.icon} className="text-[24px] text-brand-marker" />
                </span>
                <h3 className="mt-4 text-[18px] font-bold leading-tight">{perk.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-brand-ink/75">{perk.description}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CONTAINER } from "@/constants/classNames";
import { ENROLLMENT_STEPS } from "@/constants/classOptions";

/** Từ đăng ký đến khai giảng: năm bước nối nhau bằng nét đứt. */
export function EnrollmentStepsSection() {
  return (
    <section id="enrollment-steps" className="bg-[#F5F1E9] py-14 lg:py-20">
      <div className={CONTAINER}>
        <SectionHeading title="Từ Đăng Ký Đến Khai Giảng" />
        <ol className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {/* Nét đứt nối các bước trên màn hình rộng */}
          <li
            aria-hidden="true"
            className="pointer-events-none absolute left-[7%] right-[7%] top-7 hidden border-t-[3px] border-dashed border-brand-navy/25 lg:block"
          />
          {ENROLLMENT_STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 90} className="relative">
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-navy bg-white text-brand-navy shadow-soft">
                <Icon name={step.icon} className="text-[26px]" />
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange text-[12px] font-extrabold text-brand-navyDeep"
                >
                  {index + 1}
                </span>
              </span>
              <h3 className="mt-4 text-[18px] font-bold leading-snug text-brand-navy">{step.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-brand-muted">{step.description}</p>
            </Reveal>
          ))}
        </ol>
        <Reveal className="mt-10 max-w-3xl rounded-xl border-l-4 border-brand-orange bg-white px-5 py-4 text-[15px] leading-relaxed text-brand-ink">
          Lớp chỉ có 1 học viên khi chốt đăng ký: trung tâm dời ngày khai giảng hoặc hoàn 100% học phí.
        </Reveal>
      </div>
    </section>
  );
}

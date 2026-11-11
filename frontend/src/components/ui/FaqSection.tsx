import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER } from "@/constants/classNames";
import type { FaqSectionProps } from "@/interfaces/ui";

// Câu hỏi thường gặp: tiêu đề bên trái, các câu hỏi bấm để mở bên phải (câu đầu mở sẵn).
export function FaqSection({ title, description, faqs }: FaqSectionProps) {
  return (
    <section id="faq" className="scroll-mt-[120px] bg-[#F5F1E9] pb-16 pt-4 lg:pb-24 lg:pt-6">
      <div className={`${CONTAINER} grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12`}>
        <Reveal className="lg:col-span-4">
          <h2 className="text-balance text-[28px] font-extrabold leading-tight tracking-tight text-brand-navy lg:text-[36px]">{title}</h2>
          {description && <p className="mt-3 text-[16px] leading-relaxed text-brand-muted lg:text-[17px]">{description}</p>}
        </Reveal>

        <div className="lg:col-span-8">
          {faqs.map((faq, index) => (
            <Reveal key={faq.question} delay={index * 70}>
              <details className="group border-b border-dashed border-brand-navy/25" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-bold text-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy lg:text-[18px] [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange text-brand-navyDeep transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none">
                    <Icon name="add" className="text-[22px]" />
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 text-[16px] leading-relaxed text-brand-ink/85">{faq.answer}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

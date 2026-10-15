import { Whirlwind } from "@/components/home/Whirlwind";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER } from "@/constants/classNames";
import { CLASS_PRACTICES } from "@/constants/home";
import { useWhirlwindReveal } from "@/hooks/useWhirlwindReveal";

/**
 * Cách Trí Việt tổ chức lớp học: bảng phấn — khối tối duy nhất của trang.
 * Cứ 5 giây một lốc xoáy bay vào bảng xoáy một lần, mỗi lần làm hiện một mục.
 */
export function ClassPracticesSection() {
  // Lốc xoáy lần lượt làm hiện từng mục trên bảng
  const { listRef, whirlwindRef, revealedCount, showWhirlwind } = useWhirlwindReveal<HTMLUListElement>(CLASS_PRACTICES.length);

  return (
    <section id="why-choose-us" className="bg-[#F5F1E9] py-16 lg:py-24">
      <div className={CONTAINER}>
        {/* Khung gỗ */}
        <Reveal className="rounded-[26px] bg-[linear-gradient(135deg,#E3B467,#B9782A)] p-3 shadow-soft sm:p-4">
          {/* Mặt bảng */}
          <div className="relative overflow-hidden rounded-[14px] bg-brand-navyDeep px-6 py-10 text-white shadow-[inset_0_0_0_2px_rgba(0,0,0,0.25),inset_0_10px_30px_rgba(0,0,0,0.25)] sm:px-10 lg:px-14 lg:py-14">
            {/* Vệt bụi phấn */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_25%,rgba(255,255,255,0.07),transparent_45%),radial-gradient(ellipse_at_82%_78%,rgba(255,255,255,0.06),transparent_42%)]"
            />
            <div className="relative">
              <h2 className="text-[28px] lg:text-[36px] leading-tight font-extrabold tracking-tight text-balance">
                <span className="underline decoration-white/45 decoration-wavy decoration-2 underline-offset-[10px]">
                  Cách Trí Việt Tổ Chức Lớp Học
                </span>
              </h2>
              <ul ref={listRef} className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {CLASS_PRACTICES.map((practice, index) => (
                  <li
                    key={practice.title}
                    className={`vortex-item rounded-2xl border-2 border-dashed border-white/30 p-5 ${
                      index < revealedCount ? "is-revealed" : ""
                    }`}
                  >
                    <Icon name={practice.icon} className="text-[30px] text-brand-orange" />
                    <h3 className="mt-3 text-[19px] font-bold leading-snug">{practice.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-white/80">{practice.description}</p>
                  </li>
                ))}
              </ul>
              {showWhirlwind && <Whirlwind ref={whirlwindRef} />}
            </div>
          </div>
          {/* Máng phấn: hai viên phấn và giẻ lau bảng */}
          <div aria-hidden="true" className="mt-3 flex h-4 items-end justify-end gap-2 px-6 sm:mt-4 sm:px-10">
            <span className="h-[7px] w-9 rounded-[2px] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />
            <span className="h-[7px] w-6 rounded-[2px] bg-brand-marker shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />
            <span className="ml-2 h-[14px] w-14 rounded-[3px] bg-[#3B424D] shadow-[0_1px_1px_rgba(0,0,0,0.3)] after:mt-[9px] after:block after:h-[5px] after:rounded-b-[3px] after:bg-[#D9D2C3]" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

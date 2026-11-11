import { Reveal } from "@/components/motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ASSETS } from "@/constants/assets";
import { CONTAINER, TAPE } from "@/constants/classNames";

// Không gian học tập: trang dán ảnh và giấy ghi chú.
export function StudyMomentsSection() {
  return (
    <section id="study-moments" className="bg-[#F5F1E9] pb-16 lg:pb-24">
      <div className={CONTAINER}>
        <SectionHeading title="Không Gian Học Tập" />
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {
            // Ảnh lớn dán băng dính hai góc
          }
          <Reveal as="figure" from="left" className="relative lg:col-span-7">
            <div className="-rotate-1 bg-white p-3 pb-4 shadow-[0_18px_34px_-18px_rgba(8,42,102,0.55)] sm:p-4">
              <span aria-hidden="true" className={`${TAPE} -left-5 -top-2 w-24 -rotate-[32deg]`} />
              <span aria-hidden="true" className={`${TAPE} -right-5 -top-2 w-24 rotate-[32deg]`} />
              <img
                src={ASSETS.public.students.highSchool}
                alt="Nhóm học sinh THPT cùng làm bài trong một lớp học tại trung tâm"
                loading="lazy"
                className="aspect-[16/10] w-full bg-brand-tint object-cover"
              />
              <figcaption className="pt-3 text-center text-[15px] font-semibold italic text-brand-muted">
                Lớp tại trung tâm, tối đa 8 học sinh
              </figcaption>
            </div>
          </Reveal>

          <Reveal from="right" delay={120} className="flex flex-col gap-10 lg:col-span-5">
            {
              // Ảnh nhỏ
            }
            <figure className="relative ml-auto w-[88%] rotate-2 bg-white p-3 pb-4 shadow-[0_16px_30px_-16px_rgba(8,42,102,0.55)]">
              <span aria-hidden="true" className={`${TAPE} -top-3 left-1/2 w-20 -translate-x-1/2 -rotate-2`} />
              <img
                src={ASSETS.public.tutoring.online}
                alt="Học sinh đeo tai nghe học lớp trực tuyến qua máy tính"
                loading="lazy"
                className="aspect-[4/3] w-full bg-brand-tint object-cover"
              />
              <figcaption className="pt-3 text-center text-[15px] font-semibold italic text-brand-muted">Lớp trực tuyến</figcaption>
            </figure>
            {
              // Giấy ghi chú ghim đinh
            }
            <div className="relative w-[90%] -rotate-2 bg-[#FFE9A8] p-6 pt-8 shadow-[0_14px_24px_-14px_rgba(138,90,20,0.6)] sm:p-7 sm:pt-9">
              <span
                aria-hidden="true"
                className="absolute -top-2.5 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#FFC55C,#DE8B00_60%,#9A5F00)] shadow-[0_3px_4px_rgba(0,0,0,0.3)]"
              />
              <h3 className="text-[20px] font-bold leading-snug text-brand-navy">Không giải hộ</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-brand-ink">
                Học sinh tự giải thích lại bài toán cho thầy cô nghe để nắm chắc bản chất.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

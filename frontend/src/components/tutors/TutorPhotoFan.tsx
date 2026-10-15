import type { TutorPhotoFanProps } from "@/interfaces/tutor";

/** Vị trí và độ nghiêng của từng tấm ảnh trong xấp ảnh xòe quạt */
const FAN_SLOTS = ["left-0 top-[24%] z-10 -rotate-[9deg]", "left-1/2 top-0 z-20 -translate-x-1/2", "right-0 top-[24%] z-10 rotate-[9deg]"];

/**
 * Xấp ba ảnh gia sư xòe như quạt trên một vầng tròn cam — ảnh mở đầu trang "Tìm gia sư".
 * Bấm một ảnh để mở hồ sơ gia sư đó ở phần bên dưới.
 */
export function TutorPhotoFan({ tutors, onPickTutor }: TutorPhotoFanProps) {
  return (
    <div className="relative mx-auto aspect-[10/9] w-full max-w-[520px]">
      {/* Vầng tròn cam và vòng nét đứt phía sau */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[56%] aspect-square w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_32%_28%,#FFE2A6,#F5A00F_78%)] shadow-[0_30px_60px_-30px_rgba(222,139,0,0.9)]"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        fill="none"
        className="absolute left-1/2 top-[56%] aspect-square w-[98%] -translate-x-1/2 -translate-y-1/2"
      >
        <circle cx="50" cy="50" r="48.5" className="orbit-dash stroke-brand-navy/30" strokeWidth="0.4" strokeDasharray="1.4 1.8" />
      </svg>

      {tutors.slice(0, FAN_SLOTS.length).map((tutor, index) => (
        <div key={tutor.id} className={`absolute w-[37%] ${FAN_SLOTS[index]}`}>
          <button
            type="button"
            aria-label={`Xem hồ sơ ${tutor.name}, môn ${tutor.course.subjectLabel}`}
            onClick={() => onPickTutor(tutor.id)}
            className="float-soft group block w-full focus-visible:outline-none"
            style={{ animationDelay: `${index * -1.6}s` }}
          >
            <span className="relative block overflow-hidden rounded-[22px] border-[6px] border-white bg-white shadow-[0_22px_34px_-18px_rgba(8,42,102,0.75)] transition-transform duration-300 group-hover:-translate-y-2 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-brand-navy motion-reduce:transition-none">
              <img src={tutor.image} alt="" className="aspect-[4/5] w-full bg-brand-tint object-cover object-top" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-navyDeep via-brand-navyDeep/85 to-transparent px-3 pb-2.5 pt-9 text-left text-white">
                <span className="block text-[12px] font-bold leading-snug sm:text-[14px]">{tutor.name}</span>
                <span className="block text-[11px] font-semibold text-brand-orange sm:text-[12.5px]">{tutor.course.subjectLabel}</span>
              </span>
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

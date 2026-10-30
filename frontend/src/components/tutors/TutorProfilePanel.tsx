import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, TAPE, TEXT_LINK } from "@/constants/classNames";
import { CLASS_SIZE, DELIVERY_MODE_OPTIONS, GRADE_LIST_LABEL } from "@/constants/classOptions";
import { ROUTES } from "@/constants/routes";
import { TUTOR_ASSURANCES, TUTOR_PROFILES } from "@/constants/tutors";
import type { TutorProfilePanelProps } from "@/interfaces/tutor";

/**
 * Hồ sơ gia sư đang chọn: ảnh, giới thiệu, chuyên môn, hình thức học, ba điều trung tâm bảo đảm,
 * lộ trình khóa đang dạy và đường dẫn sang phiếu chọn lớp của đúng môn đó.
 */
export function TutorProfilePanel({ tutor, onSelect }: TutorProfilePanelProps) {
  const { course } = tutor;
  // Gia sư khác cùng dạy khóa này
  const coTutors = TUTOR_PROFILES.filter((other) => other.course.id === course.id && other.id !== tutor.id);
  // Ba dòng thông tin nhanh
  const facts = [
    { icon: "school", label: "Phụ trách", value: GRADE_LIST_LABEL },
    { icon: "devices", label: "Hình thức", value: DELIVERY_MODE_OPTIONS.map((mode) => mode.label).join(" - ") },
    { icon: "groups", label: "Sĩ số", value: `${CLASS_SIZE.min} – ${CLASS_SIZE.max} học viên mỗi lớp` },
  ];

  return (
    // key đổi theo gia sư để cả hồ sơ nháy nhẹ một lần khi chọn người khác
    <article key={tutor.id} className="diary-flip">
      <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[minmax(0,250px)_1fr] sm:gap-10 xl:grid-cols-[minmax(0,290px)_1fr]">
        <div className="relative mx-auto w-full max-w-[230px] sm:max-w-[290px]">
          {/* Mảng màu cam mềm sau ảnh */}
          <span aria-hidden="true" className="absolute -inset-5 rounded-[42%_58%_55%_45%/52%_44%_56%_48%] bg-brand-orange/25" />
          <figure className="relative -rotate-2 rounded-[26px] border-[6px] border-white bg-white shadow-[0_26px_40px_-22px_rgba(8,42,102,0.7)]">
            <span aria-hidden="true" className={`${TAPE} -top-3 left-1/2 w-24 -translate-x-1/2 rotate-2`} />
            <img
              src={tutor.image}
              alt={`${tutor.name} – ${course.subjectLabel}`}
              className="aspect-[4/5] w-full rounded-[20px] bg-brand-tint object-cover object-top"
            />
          </figure>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy px-3.5 py-1.5 text-[13px] font-bold text-white">
              <Icon name={course.icon} className="text-[17px] text-brand-orange" />
              Gia sư {course.subjectLabel}
            </p>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/20 px-3.5 py-1.5 text-[13px] font-bold text-brand-navyDeep">
              <Icon name="verified" className="text-[17px] text-brand-orangeHover" />
              Gia sư chính thức của Trí Việt
            </p>
          </div>
          <h2 className="mt-4 text-[30px] font-extrabold leading-tight tracking-tight text-brand-navy lg:text-[38px]">{tutor.name}</h2>
          <p className="mt-3 max-w-xl text-[16.5px] leading-relaxed text-brand-ink/85">{tutor.bio}</p>

          {/* Chuyên môn */}
          <ul aria-label="Chuyên môn" className="mt-4 flex flex-wrap gap-2">
            {tutor.specialties.map((specialty) => (
              <li
                key={specialty}
                className="rounded-full border border-brand-navy/20 bg-white/70 px-3.5 py-1.5 text-[13.5px] font-semibold text-brand-navy"
              >
                {specialty}
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-2.5">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-center gap-3 text-[15px]">
                <Icon name={fact.icon} className="text-[21px] text-brand-orangeHover" />
                <dt className="w-[78px] shrink-0 font-medium text-brand-muted">{fact.label}</dt>
                <dd className="font-bold text-brand-navy">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              to={`${ROUTES.subjects}?mon=${course.subject}`}
              className={`group inline-flex h-12 items-center gap-4 rounded-full bg-brand-orange pl-6 pr-2 text-[15px] font-bold text-brand-navyDeep transition-colors hover:bg-[#FFB534] ${FOCUS_RING}`}
            >
              Chọn lớp {course.subjectLabel}
              <Icon
                name="arrow_forward"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navyDeep text-[19px] text-white transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
            <Link to={ROUTES.contactForm} className={TEXT_LINK}>
              Đăng ký tư vấn
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bằng cấp, kinh nghiệm, thành tích — chỉ hiện khi gia sư đã cung cấp */}
      {tutor.credentials.length > 0 && (
        <div className="mt-10">
          <h3 className="text-[19px] font-extrabold text-brand-navy">Hồ sơ</h3>
          <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {tutor.credentials.map((credential) => (
              <li key={credential} className="flex gap-2.5 text-[15px] font-semibold leading-snug text-brand-ink">
                <Icon name="workspace_premium" className="mt-px shrink-0 text-[20px] text-brand-orangeHover" />
                {credential}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ba điều trung tâm bảo đảm cho mọi gia sư */}
      <ul className="mt-10 grid grid-cols-1 gap-y-5 sm:grid-cols-3 sm:divide-x sm:divide-brand-navy/15">
        {TUTOR_ASSURANCES.map((assurance) => (
          <li key={assurance.title} className="flex gap-3.5 sm:px-6 sm:first:pl-0 sm:last:pr-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy">
              <Icon name={assurance.icon} className="text-[23px] text-brand-marker" />
            </span>
            <span>
              <span className="block text-[15.5px] font-bold leading-tight text-brand-navy">{assurance.title}</span>
              <span className="mt-1 block text-[13.5px] leading-snug text-brand-muted">{assurance.description}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 border-t-2 border-dashed border-brand-navy/20 pt-8">
        <h3 className="text-[19px] font-extrabold text-brand-navy">Lộ trình khóa {course.name}</h3>
        <ol className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          {course.steps.map((step, index) => (
            <li key={step} className="flex gap-3 xl:block">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[15px] font-extrabold text-brand-navyDeep"
              >
                {index + 1}
              </span>
              <span className="text-[15px] font-semibold leading-snug text-brand-ink xl:mt-3 xl:block">{step}</span>
            </li>
          ))}
        </ol>

        {coTutors.length > 0 && (
          <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14.5px] font-medium text-brand-muted">
            Cùng dạy khóa này:
            {coTutors.map((other) => (
              <button
                key={other.id}
                type="button"
                onClick={() => onSelect(other.id)}
                className={`inline-flex items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-3.5 text-[14.5px] font-bold text-brand-navy transition-colors hover:bg-white ${FOCUS_RING}`}
              >
                <img src={other.image} alt="" className="h-8 w-8 rounded-full bg-brand-tint object-cover object-top" />
                {other.name}
              </button>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}

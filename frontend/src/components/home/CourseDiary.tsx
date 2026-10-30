import { useState } from "react";
import { Link } from "react-router-dom";
import { FOCUS_RING, TAPE } from "@/constants/classNames";
import { COURSES } from "@/constants/courses";
import { ROUTES } from "@/constants/routes";

/** Trang nhật ký lộ trình: bấm nhãn mục lục (môn học) để lật sang khóa học tương ứng */
export function CourseDiary() {
  // Khóa đang mở (theo nhãn mục lục)
  const [activeId, setActiveId] = useState(COURSES[0].id);
  const course = COURSES.find((item) => item.id === activeId) ?? COURSES[0];
  // Chặng cuối được tô cam
  const lastStep = course.steps.length - 1;

  return (
    <div className="diary-page relative rounded-[20px] border border-brand-navy/10 py-7 pl-[60px] pr-5 shadow-soft sm:py-9 sm:pl-[92px] sm:pr-10">
      {/* Nhãn mục lục theo môn: hàng ngang trên màn hình nhỏ, thò ra mép phải trên màn hình rộng */}
      <div
        role="tablist"
        aria-label="Chọn khóa học theo môn"
        className="mb-6 flex flex-wrap gap-2 lg:absolute lg:left-full lg:top-9 lg:mb-0 lg:-ml-px lg:flex-col lg:flex-nowrap lg:gap-1.5"
      >
        {COURSES.map((item) => {
          const isActive = item.id === course.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`course-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls="course-diary-panel"
              onClick={() => setActiveId(item.id)}
              className={`h-10 rounded-full px-4 text-[14px] font-bold transition-[background-color,color,width] duration-200 lg:h-11 lg:rounded-l-none lg:rounded-r-xl lg:px-0 lg:text-left lg:shadow-[3px_3px_8px_-2px_rgba(8,42,102,0.35)] ${FOCUS_RING} ${
                isActive
                  ? "bg-brand-orange text-brand-navyDeep lg:w-[68px] lg:pl-4"
                  : "bg-brand-navy text-white hover:bg-brand-navyDeep lg:w-[56px] lg:pl-3"
              }`}
            >
              {item.tab}
            </button>
          );
        })}
      </div>

      {/* key đổi theo khóa học để nội dung "lật trang" mỗi lần chọn môn khác */}
      <div
        key={course.id}
        id="course-diary-panel"
        role="tabpanel"
        aria-labelledby={`course-tab-${course.id}`}
        className="diary-flip lg:min-h-[390px]"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="text-[13px] font-semibold italic text-brand-muted">Nhật ký lộ trình - Khóa {course.name}</p>
          {/* Hai con dấu hình thức học */}
          <p className="flex flex-wrap gap-2 text-[12px] font-bold uppercase tracking-[0.04em]">
            <span className="-rotate-2 rounded-md border-2 border-brand-navy/70 px-2 py-0.5 text-brand-navy">Tại trung tâm</span>
            <span className="rotate-1 rounded-md border-2 border-brand-orangeHover px-2 py-0.5 text-[#9A5F00]">Trực tuyến</span>
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-8 sm:grid-cols-[210px,1fr] sm:gap-9 lg:grid-cols-[176px,1fr] lg:gap-6 xl:grid-cols-[210px,1fr] xl:gap-9">
          {/* Ảnh giáo viên kiểu polaroid dán băng dính (khóa có hai giáo viên thì hai ảnh nhỏ xếp so le) */}
          <div className="flex items-start justify-center sm:justify-start">
            {course.tutors.map((tutor, index) => (
              <figure
                key={tutor.name}
                className={`relative shrink-0 bg-white p-2 shadow-[0_12px_24px_-12px_rgba(8,42,102,0.5)] ${
                  course.tutors.length > 1 ? "w-[120px] lg:w-[100px] xl:w-[120px]" : "w-[168px] lg:w-[150px] xl:w-[168px]"
                } ${index === 0 ? "-rotate-2" : "-ml-5 mt-8 rotate-3"}`}
              >
                <span aria-hidden="true" className={`${TAPE} -top-3 left-1/2 w-16 -translate-x-1/2 -rotate-3`} />
                <img src={tutor.image} alt={tutor.name} className="aspect-[4/5] w-full bg-brand-tint object-cover object-top" />
                <figcaption className="pt-2 text-center text-[12px] font-semibold italic leading-tight text-brand-muted">
                  {tutor.name}
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Nội dung khóa học */}
          <div>
            <h3 className="text-[23px] font-bold leading-snug text-brand-navy">Khóa {course.name}</h3>
            <p className="mt-2 text-[16px] leading-relaxed text-brand-muted">{course.summary}</p>

            <ol className="mt-5">
              {course.steps.map((step, index) => (
                <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < lastStep && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-[13px] top-7 border-l-2 border-dashed border-brand-navy/30"
                    />
                  )}
                  <span
                    className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-extrabold ${
                      index === lastStep
                        ? "border-brand-orange bg-brand-orange text-brand-navyDeep"
                        : "border-brand-navy bg-white text-brand-navy"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="pt-[3px] text-[15.5px] leading-snug text-brand-ink">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                to={ROUTES.contactForm}
                className={`group inline-flex h-11 items-center gap-3 whitespace-nowrap rounded-full bg-brand-orange pl-5 pr-1.5 text-[14px] font-bold text-brand-navyDeep transition-colors hover:bg-[#FFB534] ${FOCUS_RING}`}
              >
                Đăng ký khóa học
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined flex h-8 w-8 items-center justify-center rounded-full bg-brand-navyDeep text-[18px] text-white transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  arrow_forward
                </span>
              </Link>
              <Link
                to={ROUTES.pricing}
                className={`group inline-flex items-center gap-1 text-[15px] font-semibold text-brand-navy ${FOCUS_RING}`}
              >
                <span className="underline decoration-brand-orange decoration-wavy decoration-2 underline-offset-[7px] group-hover:decoration-brand-navy">
                  Mua khóa học
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { CSSProperties, FormEvent } from "react";
import { TutorPhotoFan } from "@/components/tutors/TutorPhotoFan";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER } from "@/constants/classNames";
import { COURSES } from "@/constants/courses";
import { TUTOR_SEARCH_TITLE_LINES } from "@/constants/tutors";
import type { TutorSearchHeroProps } from "@/interfaces/tutor";
import { riseDelay } from "@/utils/motion";

// Phần mở đầu trang "Tìm gia sư": tiêu đề và thanh tìm (tên gia sư + môn học) bên trái,
// xấp ảnh gia sư xòe quạt bên phải. Kết quả hiện ngay ở phần bên dưới khi gõ hoặc đổi môn.
export function TutorSearchHero({
  query,
  subject,
  onQueryChange,
  onSubjectChange,
  onSubmit,
  featuredTutors,
  onPickTutor,
}: TutorSearchHeroProps) {
  // Chặn tải lại trang khi gửi form
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <section className="paper-grid relative overflow-hidden bg-[#FBF6EC]">
      {
        // Mép dưới hoà vào nền giấy của phần kế tiếp
      }
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#F5F1E9]"
      />

      <div className={`${CONTAINER} relative grid grid-cols-1 items-center gap-12 py-14 lg:grid-cols-12 lg:gap-10 lg:py-20`}>
        <div className="lg:col-span-7">
          <h1
            aria-label={TUTOR_SEARCH_TITLE_LINES.join(" ")}
            className="text-[34px] font-extrabold leading-[1.14] sm:text-[48px] lg:text-[56px] lg:tracking-tight xl:text-[62px]"
          >
            {TUTOR_SEARCH_TITLE_LINES.map((line, index) => (
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
            Chọn môn để xem gia sư đứng lớp và lộ trình khóa học.
          </p>

          <form
            role="search"
            aria-label="Tìm gia sư"
            onSubmit={handleSubmit}
            className="hero-rise mt-8 flex max-w-2xl flex-col gap-2 rounded-[28px] bg-white p-2 shadow-[0_24px_44px_-24px_rgba(8,42,102,0.55)] sm:flex-row sm:items-center sm:rounded-full"
            style={riseDelay(700)}
          >
            <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full px-4 focus-within:bg-brand-tint">
              <Icon name="search" className="text-[22px] text-brand-navy" />
              <span className="sr-only">Tên gia sư</span>
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Tên gia sư"
                className="h-full w-full min-w-0 border-0 bg-transparent p-0 text-[16px] font-semibold text-brand-ink outline-none placeholder:font-normal placeholder:text-slate-400 focus:ring-0"
              />
            </label>

            <span aria-hidden="true" className="hidden h-7 w-px bg-brand-navy/15 sm:block" />

            <label className="relative flex h-12 items-center rounded-full focus-within:bg-brand-tint sm:w-[210px]">
              <Icon name="menu_book" className="pointer-events-none absolute left-4 text-[21px] text-brand-orangeHover" />
              <span className="sr-only">Môn học</span>
              <select
                value={subject}
                onChange={(event) => onSubjectChange(event.target.value)}
                className="h-full w-full cursor-pointer appearance-none rounded-full border-0 bg-transparent bg-none pl-12 pr-10 text-[16px] font-bold text-brand-navy outline-none focus:ring-0"
              >
                <option value="">Tất cả môn</option>
                {COURSES.map((course) => (
                  <option key={course.id} value={course.subject}>
                    {course.subjectLabel}
                  </option>
                ))}
              </select>
              <Icon name="expand_more" className="pointer-events-none absolute right-3 text-[24px] text-brand-navy" />
            </label>

            <button
              type="submit"
              className="group flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-orange px-6 text-[15px] font-bold text-brand-navyDeep transition-colors hover:bg-[#FFB534] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
            >
              Tìm
              <Icon name="arrow_downward" className="text-[19px] transition-transform duration-200 group-hover:translate-y-0.5" />
            </button>
          </form>
        </div>

        <div className="hero-rise lg:col-span-5" style={riseDelay(300)}>
          <TutorPhotoFan tutors={featuredTutors} onPickTutor={onPickTutor} />
        </div>
      </div>
    </section>
  );
}

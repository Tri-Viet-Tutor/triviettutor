import { Link } from "react-router-dom";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CONTAINER, FOCUS_RING } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { COURSES } from "@/features/catalog/data/courses";
import { SESSION_LENGTH_LABEL, WEEKLY_SESSIONS_LABEL } from "@/features/pricing/data/pricing";
import { formatVnd } from "@/utils/currency";

/* Chia cột dùng chung cho hàng tiêu đề và từng hàng khóa học (từ màn hình lớn) */
const ROW_GRID = "lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-6";

/**
 * Bảng học phí theo khóa: mỗi khóa một hàng — gia sư đứng lớp, lịch học, học phí của khóa.
 * Khóa chưa có mức phí thì ghi "Báo khi tư vấn" và dẫn sang đăng ký tư vấn.
 */
export function FeeTableSection() {
  return (
    <section id="fee-table" className="scroll-mt-[120px] bg-[#F5F1E9] pb-16 pt-12 lg:pb-24 lg:pt-16">
      <div className={CONTAINER}>
        <SectionHeading title="Học Phí Theo Khóa" description="Mỗi khóa dạy một môn cho lớp 10 – 12, học tại trung tâm hoặc trực tuyến." />

        <div role="table" aria-label="Học phí theo khóa">
          <div
            role="row"
            className={`hidden border-b-2 border-brand-navy/25 pb-3 text-[13px] font-bold uppercase tracking-[0.06em] text-brand-muted ${ROW_GRID}`}
          >
            <span role="columnheader">Khóa học</span>
            <span role="columnheader">Gia sư</span>
            <span role="columnheader">Lịch học</span>
            <span role="columnheader">Học phí</span>
            <span role="columnheader" className="w-[168px] text-right">
              <span className="sr-only">Thao tác</span>
            </span>
          </div>

          {COURSES.map((course, index) => {
            const hasFee = course.tuitionFee !== undefined;
            return (
              <Reveal
                key={course.id}
                delay={index * 70}
                className={`group border-b border-dashed border-brand-navy/20 py-6 transition-colors hover:bg-white/50 lg:px-3 lg:py-5 ${ROW_GRID}`}
              >
                <div role="row" className="contents">
                  <div role="cell" className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-navy transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none">
                      <Icon name={course.icon} className="text-[25px] text-brand-marker" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[18px] font-extrabold leading-tight text-brand-navy">{course.name}</span>
                      <span className="mt-1 block text-[14px] leading-snug text-brand-muted">{course.summary}</span>
                    </span>
                  </div>

                  <div role="cell" className="mt-4 flex items-center lg:mt-0">
                    <span className="mr-3 w-[92px] shrink-0 text-[13px] font-semibold text-brand-muted lg:hidden">Gia sư</span>
                    <span className="flex -space-x-2.5">
                      {course.tutors.map((tutor) => (
                        <img
                          key={tutor.name}
                          src={tutor.image}
                          alt={tutor.name}
                          title={tutor.name}
                          loading="lazy"
                          className="h-10 w-10 rounded-full border-[3px] border-[#F5F1E9] bg-brand-tint object-cover object-top"
                        />
                      ))}
                    </span>
                  </div>

                  <div role="cell" className="mt-3 flex items-center lg:mt-0 lg:block">
                    <span className="mr-3 w-[92px] shrink-0 text-[13px] font-semibold text-brand-muted lg:hidden">Lịch học</span>
                    <span className="text-[14.5px] leading-snug">
                      <span className="block font-bold text-brand-ink">{WEEKLY_SESSIONS_LABEL}</span>
                      <span className="block text-brand-muted">{SESSION_LENGTH_LABEL}</span>
                    </span>
                  </div>

                  <div role="cell" className="mt-3 flex items-center lg:mt-0 lg:block">
                    <span className="mr-3 w-[92px] shrink-0 text-[13px] font-semibold text-brand-muted lg:hidden">Học phí</span>
                    {course.tuitionFee !== undefined ? (
                      <span className="whitespace-nowrap">
                        <span className="text-[22px] font-extrabold tracking-tight text-brand-navy">{formatVnd(course.tuitionFee)}</span>
                        <span className="ml-1 text-[13.5px] font-medium text-brand-muted">/ khóa</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/20 px-3.5 py-1.5 text-[14px] font-bold text-brand-navyDeep">
                        <Icon name="support_agent" className="text-[18px] text-brand-orangeHover" />
                        Báo khi tư vấn
                      </span>
                    )}
                  </div>

                  <div role="cell" className="mt-5 lg:mt-0 lg:w-[168px] lg:text-right">
                    <Link
                      to={hasFee ? `${ROUTES.subjects}?mon=${course.subject}` : ROUTES.contactForm}
                      aria-label={`${hasFee ? "Chọn lớp" : "Nhận báo giá"} khóa ${course.name}`}
                      className={`inline-flex h-11 items-center gap-2 rounded-full border-2 border-brand-navy px-5 text-[14.5px] font-bold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white ${FOCUS_RING}`}
                    >
                      {hasFee ? "Chọn lớp" : "Nhận báo giá"}
                      <Icon name="arrow_forward" className="text-[18px]" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
import { CourseDiary } from "@/components/home/CourseDiary";
import { GraduationCap } from "@/components/home/GraduationCap";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER, TEXT_LINK } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";

// Lộ trình học theo từng môn: nón tốt nghiệp bên trái, trang nhật ký khóa học bên phải.
export function CourseRoadmapSection() {
  return (
    <section className="bg-[#F5F1E9] py-16 lg:py-24">
      <div className={`${CONTAINER} grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12`}>
        {
          // Cột trái: nón tốt nghiệp lớn + tiêu đề
        }
        <Reveal className="lg:col-span-4">
          <GraduationCap className="-ml-2 h-32 w-32 -rotate-12 drop-shadow-[0_16px_12px_rgba(13,15,18,0.28)] sm:h-40 sm:w-40 lg:h-56 lg:w-56" />
          <h2 className="mt-5 text-[28px] lg:text-[36px] leading-tight font-extrabold tracking-tight text-brand-navy text-balance">
            Lộ Trình Học Theo Từng Môn
          </h2>
          <p className="mt-3 text-[16px] lg:text-[17px] leading-relaxed text-brand-muted">
            Mỗi môn là một khóa học riêng, học tại trung tâm hoặc trực tuyến.
          </p>
          <Link to={ROUTES.subjects} className={`${TEXT_LINK} mt-5`}>
            Xem tất cả môn học
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </Reveal>

        {
          // Cột phải: trang nhật ký giấy ô ly, mỗi môn là một trang
        }
        <Reveal delay={120} className="lg:col-span-8 lg:pr-16">
          <CourseDiary />
        </Reveal>
      </div>
    </section>
  );
}

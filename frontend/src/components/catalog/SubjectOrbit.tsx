import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { CATALOG_HERO_PHOTO, SUBJECT_ORBIT_ANGLES } from "@/constants/catalog";
import { GRADE_LIST_LABEL } from "@/constants/classOptions";
import { COURSES } from "@/constants/courses";
import type { SubjectOrbitProps } from "@/interfaces/catalog";

// Bán kính quỹ đạo, tính theo % cạnh khung vuông
const ORBIT_RADIUS = 37;

// Ảnh mở đầu trang "Khối lớp / Môn học": ảnh học sinh hình tròn ở giữa (khối lớp),
// năm bong bóng môn học xếp trên một quỹ đạo nét đứt chung quanh. Bấm bong bóng để chọn môn.
export function SubjectOrbit({ activeSubject, onPickSubject }: SubjectOrbitProps) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[580px]">
      {
        // Quỹ đạo nét đứt và một cung cam
      }
      <svg aria-hidden="true" viewBox="0 0 100 100" fill="none" className="absolute inset-0 h-full w-full">
        <circle cx="50" cy="50" r={ORBIT_RADIUS} className="orbit-dash stroke-brand-navy/30" strokeWidth="0.45" strokeDasharray="1.4 1.8" />
        <circle
          cx="50"
          cy="50"
          r={ORBIT_RADIUS}
          pathLength={100}
          strokeDasharray="13 87"
          strokeDashoffset="-58"
          strokeLinecap="round"
          strokeWidth="1.5"
          className="stroke-brand-orange"
        />
      </svg>

      {
        // Ảnh giữa
      }
      <div className="absolute inset-[18%] overflow-hidden rounded-full border-[6px] border-white bg-brand-tint shadow-[0_24px_40px_-18px_rgba(8,42,102,0.55)]">
        <img src={CATALOG_HERO_PHOTO.src} alt={CATALOG_HERO_PHOTO.alt} className="h-full w-full object-cover" />
      </div>

      {
        // Nhãn khối lớp vắt ngang đáy ảnh
      }
      <p className="absolute left-1/2 top-[82%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-navyDeep px-3 py-1.5 text-[12px] font-bold text-white shadow-soft sm:gap-2 sm:px-4 sm:py-2 sm:text-[15px]">
        <Icon name="school" className="text-[15px] text-brand-orange sm:text-[18px]" />
        {GRADE_LIST_LABEL}
      </p>

      {
        // Bong bóng môn học
      }
      {COURSES.map((course, index) => {
        // Đổi góc (độ) sang toạ độ % trên quỹ đạo tròn
        const angle = (SUBJECT_ORBIT_ANGLES[index % SUBJECT_ORBIT_ANGLES.length] * Math.PI) / 180;
        const isActive = course.subject === activeSubject;
        const position: CSSProperties = {
          left: `${50 + ORBIT_RADIUS * Math.cos(angle)}%`,
          top: `${50 + ORBIT_RADIUS * Math.sin(angle)}%`,
        };
        return (
          <div key={course.id} className="absolute w-[21%] -translate-x-1/2 -translate-y-1/2" style={position}>
            <button
              type="button"
              aria-label={`Chọn môn ${course.subjectLabel}`}
              aria-pressed={isActive}
              onClick={() => onPickSubject(course.subject)}
              className="float-soft group relative block w-full focus-visible:outline-none"
              style={{ animationDelay: `${index * -1.1}s` }}
            >
              <span
                className={`block aspect-square overflow-hidden rounded-full border-4 bg-brand-tint shadow-[0_12px_22px_-12px_rgba(8,42,102,0.7)] transition-transform duration-300 group-hover:scale-105 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-brand-navy ${
                  isActive ? "border-brand-orange" : "border-white"
                }`}
              >
                <img src={course.tutors[0].image} alt="" className="h-full w-full object-cover object-top" />
              </span>
              <span
                className={`absolute left-1/2 top-full -mt-3 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold shadow-[0_6px_12px_-6px_rgba(8,42,102,0.6)] sm:text-[13px] ${
                  isActive ? "bg-brand-orange text-brand-navyDeep" : "bg-white text-brand-navy"
                }`}
              >
                <Icon name={course.icon} className="text-[15px]" />
                {course.subjectLabel}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

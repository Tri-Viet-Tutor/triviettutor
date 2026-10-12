import { type Course } from "@/features/catalog/data/courses";

interface CourseOutlineProps {
  course: Course;
}

/** Lộ trình của khóa đang chọn, viết trên trang vở giống nhật ký ở trang chủ. */
export function CourseOutline({ course }: CourseOutlineProps) {
  return (
    <div className="diary-page rounded-[20px] border border-brand-navy/10 py-7 pl-[60px] pr-5 shadow-soft sm:py-8 sm:pl-[92px] sm:pr-9">
      <div key={course.id} className="diary-flip">
        <p className="text-[13px] font-semibold italic text-brand-muted">Lộ trình · Khóa {course.name}</p>
        <p className="mt-2 text-[16px] leading-relaxed text-brand-ink">{course.summary}</p>
        <ol className="mt-5 space-y-3">
          {course.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-brand-navy text-[13px] font-bold text-brand-navy"
              >
                {index + 1}
              </span>
              <span className="pt-[3px] text-[15.5px] leading-snug text-brand-ink">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

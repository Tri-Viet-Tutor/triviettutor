import { useParams, Link } from "react-router-dom";
import { COURSES } from "@/constants/courses";
import { ROUTES } from "@/constants/routes";
import { CONTAINER, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { CourseDetails } from "@/components/course-detail/CourseDetails";

// Trang chi tiết khóa học theo đường dẫn, dùng cho khu công khai và khu học viên
export function CourseDetailPage({ variant = "public" }: { variant?: "public" | "student" }) {
  const { courseSlug } = useParams();
  const course = COURSES.find((item) => item.id === courseSlug);
  const student = variant === "student";
  const backTo = student ? ROUTES.studentCatalog : ROUTES.pricing;
  const content = course ? (
    <CourseDetails key={course.id} course={course} backTo={backTo} />
  ) : (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-2xl font-bold text-brand-navy">Không tìm thấy khóa học.</h1>
      <p className="my-4 text-brand-muted">Khóa học này không có trong danh mục. Bạn hãy chọn một khóa khác.</p>
      <Link to={backTo} className={PORTAL_BTN_SECONDARY}>
        Về danh sách khóa học
      </Link>
    </section>
  );
  return student ? (
    content
  ) : (
    <main className="min-h-[70vh] bg-[#F5F1E9] text-brand-ink">
      <div className={CONTAINER + " py-10 lg:py-14"}>{content}</div>
    </main>
  );
}

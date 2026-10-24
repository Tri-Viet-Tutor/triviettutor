import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClickSpark, ReadingProgress, ScrollToTop } from "@/components/motion";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { ClassBuilderSection } from "@/components/catalog/ClassBuilderSection";
import { EnrollmentStepsSection } from "@/components/catalog/EnrollmentStepsSection";
import { ClassPerksSection } from "@/components/catalog/ClassPerksSection";
import { COURSES } from "@/constants/courses";
import { scrollToId } from "@/utils/motion";

/**
 * Trang "Khối lớp / Môn học".
 * Nội dung dựng từ đúng các thuộc tính backend dùng để mô tả một khóa và một lớp
 * (xem constants/classOptions.ts và phần "Danh mục" trong interfaces/api.ts).
 */
export function SubjectsPage() {
  // Môn mở sẵn lấy từ đường dẫn (/cap-hoc-mon-hoc?mon=MATH), ví dụ khi đi từ hồ sơ gia sư sang
  const [searchParams] = useSearchParams();
  const [subjectFromUrl] = useState(() => COURSES.find((course) => course.subject === searchParams.get("mon"))?.subject);

  // Môn đang chọn dùng chung cho bong bóng ở phần mở đầu và phiếu chọn lớp
  const [subject, setSubject] = useState(subjectFromUrl ?? COURSES[0].subject);

  useEffect(() => {
    // Có môn mở sẵn thì đưa thẳng tới phiếu chọn lớp, không thì về đầu trang
    if (subjectFromUrl) {
      document.getElementById("class-builder")?.scrollIntoView({ block: "start" });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [subjectFromUrl]);

  /** Bấm bong bóng môn ở phần mở đầu: chọn môn rồi cuộn xuống phiếu */
  function pickSubjectFromHero(nextSubject: string) {
    setSubject(nextSubject);
    scrollToId("class-builder");
  }

  return (
    <main className="w-full flex-1 overflow-x-clip bg-[#F5F1E9] text-brand-ink">
      <ReadingProgress />
      <ClickSpark />
      <ScrollToTop />
      <CatalogHero activeSubject={subject} onPickSubject={pickSubjectFromHero} />
      <ClassBuilderSection subject={subject} onSubjectChange={setSubject} />
      <ClassPerksSection />
      <EnrollmentStepsSection />
    </main>
  );
}

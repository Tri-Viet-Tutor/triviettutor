import { useEffect, useState } from "react";
import { ClickSpark, ReadingProgress, ScrollToTop } from "@/components/motion";
import { CatalogHero } from "@/features/catalog/components/CatalogHero";
import { ClassBuilderSection } from "@/features/catalog/components/ClassBuilderSection";
import { EnrollmentStepsSection } from "@/features/catalog/components/EnrollmentStepsSection";
import { ClassPerksSection } from "@/features/catalog/components/ClassPerksSection";
import { COURSES } from "@/features/catalog/data/courses";
import { prefersReducedMotion } from "@/utils/motion";

/**
 * Trang "Khối lớp / Môn học".
 * Nội dung dựng từ đúng các thuộc tính backend dùng để mô tả một khóa và một lớp
 * (xem features/catalog/data/classOptions.ts và phần "Danh mục" trong types/api.ts).
 */
export function SubjectsPage() {
  // Môn đang chọn dùng chung cho bong bóng ở phần mở đầu và phiếu chọn lớp
  const [subject, setSubject] = useState(COURSES[0].subject);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  /** Bấm bong bóng môn ở phần mở đầu: chọn môn rồi cuộn xuống phiếu */
  function pickSubjectFromHero(nextSubject: string) {
    setSubject(nextSubject);
    document
      .getElementById("class-builder")
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
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

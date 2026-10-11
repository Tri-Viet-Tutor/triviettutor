import { useEffect } from "react";
import { ClickSpark, ReadingProgress, ScrollToTop } from "@/components/motion";
import { BookingFormSection } from "@/features/home/components/BookingFormSection";
import { ClassPracticesSection } from "@/features/home/components/ClassPracticesSection";
import { CourseRoadmapSection } from "@/features/home/components/CourseRoadmapSection";
import { HeroSection } from "@/features/home/components/HeroSection";
import { StudyMomentsSection } from "@/features/home/components/StudyMomentsSection";
import { TutorShowcaseSection } from "@/features/home/components/TutorShowcaseSection";

/**
 * Trang chủ — ghép các phần trong features/home theo thứ tự hiển thị.
 * Nội dung chữ và dữ liệu nằm ở features/home/data, giao diện từng phần ở features/home/components.
 */
export function HomePage() {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <main className="w-full flex-1 overflow-x-clip bg-[#F5F1E9] text-brand-ink">
      <ReadingProgress />
      <ClickSpark />
      <ScrollToTop />

      <HeroSection />
      <CourseRoadmapSection />
      <TutorShowcaseSection />
      <ClassPracticesSection />
      <StudyMomentsSection />
      <BookingFormSection />
    </main>
  );
}

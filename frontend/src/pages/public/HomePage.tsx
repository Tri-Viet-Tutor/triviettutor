import { useEffect } from "react";
import { ClickSpark, ReadingProgress, ScrollToTop } from "@/components/motion";
import { BookingFormSection } from "@/components/home/BookingFormSection";
import { ClassPracticesSection } from "@/components/home/ClassPracticesSection";
import { CourseRoadmapSection } from "@/components/home/CourseRoadmapSection";
import { HeroSection } from "@/components/home/HeroSection";
import { StudyMomentsSection } from "@/components/home/StudyMomentsSection";
import { TutorShowcaseSection } from "@/components/home/TutorShowcaseSection";

// Trang chủ — ghép các phần trong components/home theo thứ tự hiển thị.
// Nội dung chữ và dữ liệu nằm ở constants/home.ts, giao diện từng phần ở components/home.
export function HomePage() {
  // Mở trang thì về đầu trang
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

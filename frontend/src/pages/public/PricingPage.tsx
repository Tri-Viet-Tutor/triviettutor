import { useEffect } from "react";
import { ClickSpark, ReadingProgress, ScrollToTop } from "@/components/motion";
import { ConsultCtaSection } from "@/components/ui/ConsultCtaSection";
import { EnrollmentScheduleSection } from "@/features/pricing/components/EnrollmentScheduleSection";
import { FeeTableSection } from "@/features/pricing/components/FeeTableSection";
import { LearningModesSection } from "@/features/pricing/components/LearningModesSection";
import { PricingHero } from "@/features/pricing/components/PricingHero";
import { prefersReducedMotion } from "@/utils/motion";

function scrollToFeeTable() {
  document
    .getElementById("fee-table")
    ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

/**
 * Trang "Bảng học phí": học phí của từng khóa, ảnh hai hình thức học và lịch mở đăng ký.
 * Học phí từng khóa lấy từ dữ liệu khóa học — xem features/pricing/data/pricing.ts.
 */
export function PricingPage() {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <main className="w-full flex-1 overflow-x-clip bg-[#F5F1E9] text-brand-ink">
      <ReadingProgress />
      <ClickSpark />
      <ScrollToTop />
      <PricingHero onViewFees={scrollToFeeTable} />
      <FeeTableSection />
      <LearningModesSection />
      <EnrollmentScheduleSection />
      <ConsultCtaSection
        title="Chưa biết chọn"
        highlight="khóa nào?"
        description="Để lại thông tin, trung tâm tư vấn khóa học và các lớp đang mở."
      />
    </main>
  );
}

import { useEffect } from "react";
import { ClickSpark, ReadingProgress, ScrollToTop } from "@/components/motion";
import { ConsultCtaSection } from "@/components/ui/ConsultCtaSection";
import { EnrollmentScheduleSection } from "@/components/pricing/EnrollmentScheduleSection";
import { CourseShopSection } from "@/components/pricing/CourseShopSection";
import { LearningModesSection } from "@/components/pricing/LearningModesSection";
import { PricingHero } from "@/components/pricing/PricingHero";
import { scrollToId } from "@/utils/motion";

/** Cuộn xuống danh sách khóa học */
function scrollToCourseShop() {
  scrollToId("course-shop");
}

/**
 * Trang "Mua khóa học" (trước đây là "Bảng học phí"): tìm và lọc khóa học, thêm vào giỏ hoặc mua ngay,
 * rồi sang trang thanh toán;
 * bên dưới là ảnh hai hình thức học và lịch mở đăng ký.
 * Học phí từng khóa lấy từ dữ liệu khóa học — xem constants/pricing.ts.
 */
export function PricingPage() {
  // Mở trang thì về đầu trang
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <main className={`w-full flex-1 overflow-x-clip bg-[#F5F1E9] text-brand-ink`}>
      <ReadingProgress />
      <ClickSpark />
      <ScrollToTop />
      <PricingHero onViewFees={scrollToCourseShop} />
      <CourseShopSection />
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

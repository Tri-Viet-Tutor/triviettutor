import { useEffect } from "react";
import { ClickSpark, ReadingProgress, ScrollToTop } from "@/components/motion";
import { ConsultCtaSection } from "@/components/ui/ConsultCtaSection";
import { EnrollmentScheduleSection } from "@/features/pricing/components/EnrollmentScheduleSection";
import { CourseShopSection } from "@/features/pricing/components/CourseShopSection";
import { LearningModesSection } from "@/features/pricing/components/LearningModesSection";
import { PricingHero } from "@/features/pricing/components/PricingHero";
import { cartCourses } from "@/features/checkout/data/checkout";
import { useCartStore } from "@/stores/cartStore";
import { prefersReducedMotion } from "@/utils/motion";

function scrollToCourseShop() {
  document
    .getElementById("course-shop")
    ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

/**
 * Trang "Mua khóa học" (trước đây là "Bảng học phí"): tìm và lọc khóa học, thêm vào giỏ hoặc mua ngay,
 * rồi sang trang thanh toán;
 * bên dưới là ảnh hai hình thức học và lịch mở đăng ký.
 * Học phí từng khóa lấy từ dữ liệu khóa học — xem features/pricing/data/pricing.ts.
 */
export function PricingPage() {
  const hasCart = useCartStore((state) => cartCourses(state.subjects).length > 0);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <main className={`w-full flex-1 overflow-x-clip bg-[#F5F1E9] text-brand-ink ${hasCart ? "pb-[72px]" : ""}`}>
      <ReadingProgress />
      <ClickSpark />
      {/* Giỏ có khóa thì có thanh giỏ hàng ở đáy màn hình — nhích nút về đầu trang lên trên thanh đó */}
      <ScrollToTop raised={hasCart} />
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

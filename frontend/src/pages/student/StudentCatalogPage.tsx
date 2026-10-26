import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { CourseShopSection } from "@/components/pricing/CourseShopSection";

/**
 * Trang "Mua khóa học" trong khu học viên: các lớp admin đang mở đăng ký, bộ lọc và nút đăng ký;
 * học viên ở lại trong tài khoản và thanh toán tại /student/checkout.
 */
export function StudentCatalogPage() {
  return (
    <div>
      <PortalPageHeader
        icon="storefront"
        title="Khóa học đang mở"
        description="Chọn lớp, lịch học phù hợp rồi thanh toán qua VNPay hoặc ví để giữ chỗ."
      />
      <CourseShopSection variant="student" />
    </div>
  );
}

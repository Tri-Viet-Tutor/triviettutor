import { CourseShopSection } from "@/features/pricing/components/CourseShopSection";
import { cartCourses } from "@/features/checkout/data/checkout";
import { PortalPageHeader } from "@/features/portal/components/PortalPageHeader";
import { useCartStore } from "@/stores/cartStore";

/**
 * Trang "Mua khóa học" trong khu học viên: cùng danh sách khóa, bộ lọc và giỏ hàng với trang công khai,
 * nhưng học viên ở lại trong tài khoản và thanh toán ngay tại /student/checkout.
 */
export function StudentCoursesPage() {
  const hasCart = useCartStore((state) => cartCourses(state.subjects).length > 0);

  return (
    // Giỏ có khóa thì có thanh giỏ hàng ở đáy màn hình — chừa chỗ để không che khóa cuối
    <div className={hasCart ? "pb-[72px]" : ""}>
      <PortalPageHeader title="Mua khóa học" />
      <CourseShopSection variant="student" />
    </div>
  );
}

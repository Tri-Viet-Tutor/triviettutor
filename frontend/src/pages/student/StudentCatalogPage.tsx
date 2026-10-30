import { Link } from "react-router-dom";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { useCart } from "@/hooks/useCart";
import { CourseShopSection } from "@/components/pricing/CourseShopSection";

/**
 * Trang "Mua khóa học" trong khu học viên: thẻ các khóa admin đang bán, mỗi khóa mở ra các lớp đang mở đăng ký, bộ lọc và nút đăng ký;
 * học viên ở lại trong tài khoản và thanh toán tại /student/checkout.
 */
export function StudentCatalogPage() {
  const cartCount = useCart().data?.items.length ?? 0;
  return (
    <div>
      <PortalPageHeader
        icon="storefront"
        title="Khóa học đang mở"
        description="Chọn lớp, lịch học phù hợp rồi thanh toán qua VNPay hoặc ví để giữ chỗ."
        action={
          <Link to={ROUTES.studentCart} className={PORTAL_BTN_SECONDARY}>
            <Icon name="shopping_cart" className="text-[19px]" />
            Giỏ hàng
            {cartCount > 0 && (
              <span className="min-w-[22px] rounded-full bg-brand-navy px-1.5 text-center text-[12px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        }
      />
      <CourseShopSection variant="student" />
    </div>
  );
}

import { ROUTES } from "@/constants/routes";
import { CheckoutFlow } from "@/features/checkout/components/CheckoutFlow";

/** Trang thanh toán trong khu học viên: cùng luồng với trang công khai nhưng không có bước tạo tài khoản. */
export function StudentCheckoutPage() {
  return <CheckoutFlow shopTo={ROUTES.studentCourses} stickyTopClassName="lg:top-24" />;
}

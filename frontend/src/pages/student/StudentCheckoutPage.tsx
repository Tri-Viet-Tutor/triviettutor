import { ROUTES } from "@/constants/routes";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";

// Trang thanh toán trong khu học viên: cùng luồng với trang công khai nhưng không có bước tạo tài khoản.
export function StudentCheckoutPage() {
  return <CheckoutFlow shopTo={ROUTES.studentCatalog} stickyTopClassName="lg:top-24" />;
}

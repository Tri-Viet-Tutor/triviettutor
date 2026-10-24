import { Navigate, useLocation } from "react-router-dom";
import { CONTAINER } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { useAuthStore } from "@/stores/authStore";

/**
 * Trang thanh toán công khai (/thanh-toan) — dành cho khách chưa đăng nhập.
 * Học viên đã đăng nhập được chuyển sang trang thanh toán trong khu học viên, giữ nguyên tham số trên
 * đường dẫn (VNPay trả kết quả về địa chỉ này).
 */
export function CheckoutPage() {
  const role = useAuthStore((state) => state.user?.role);
  const { search } = useLocation();

  if (role === "ROLE_STUDENT") {
    return <Navigate to={`${ROUTES.studentCheckout}${search}`} replace />;
  }

  return (
    <main className="min-h-[72vh] w-full flex-1 bg-[#F3F6FC] text-brand-ink">
      <div className={`${CONTAINER} py-10 lg:py-14`}>
        <CheckoutFlow />
      </div>
    </main>
  );
}

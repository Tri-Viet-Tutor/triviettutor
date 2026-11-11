import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";

// Các trang thuộc luồng mua: chọn khóa, thanh toán và các bước tài khoản đi kèm (đăng nhập, nhập mã OTP…)
const PURCHASE_FLOW_PATHS: string[] = [
  ROUTES.pricing,
  ROUTES.pricingLegacy,
  ROUTES.checkout,
  ROUTES.login,
  ROUTES.register,
  ROUTES.verifyEmail,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
];

// Khách chưa đăng nhập chỉ giữ giỏ khóa học trong lúc đang mua.
// Rời luồng mua sang trang khác (trang chủ, tìm gia sư, liên hệ…) là giỏ được xóa;
// học viên đã đăng nhập thì giỏ vẫn giữ. Không hiển thị gì, chỉ theo dõi đường dẫn.
export function GuestCartScope() {
  const { pathname } = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) return;
    // Bỏ dấu "/" ở cuối để so khớp đường dẫn
    const path = pathname.replace(/\/+$/, "") || ROUTES.home;
    if (PURCHASE_FLOW_PATHS.includes(path) || path.startsWith(ROUTES.pricing + "/")) return;
    const cart = useCartStore.getState();
    if (cart.subjects.length > 0) cart.clear();
  }, [pathname, isAuthenticated]);

  return null;
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addCartItem, getCart, removeCartItem } from "@/services/cartService";
import { useAuthStore } from "@/stores/authStore";

/** Khóa cache giỏ hàng theo tài khoản (đổi tài khoản không lẫn giỏ) */
export const cartKey = (userId: number | undefined) => ["me", userId, "cart"] as const;

/** Giỏ hàng của học viên đang đăng nhập; tài khoản khác hoặc khách thì không gọi API */
export function useCart() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: cartKey(user?.id),
    queryFn: getCart,
    enabled: user?.role === "ROLE_STUDENT",
  });
}

/** Thêm / xóa môn trong giỏ; cập nhật cache bằng giỏ máy chủ trả về */
export function useCartMutations() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const store = (cart: Awaited<ReturnType<typeof getCart>>) => queryClient.setQueryData(cartKey(userId), cart);
  return {
    add: useMutation({ mutationFn: addCartItem, onSuccess: store }),
    remove: useMutation({ mutationFn: removeCartItem, onSuccess: store }),
  };
}

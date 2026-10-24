import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthState } from "@/interfaces/auth";
import { queryClient } from "@/services/queryClient";

/**
 * Trạng thái đăng nhập toàn cục (Zustand).
 *
 * Dùng middleware `persist` lưu vào localStorage để tải lại trang vẫn còn đăng nhập.
 * Khi lên production nên cân nhắc chuyển token sang cookie httpOnly.
 * Mỗi lần đổi người dùng đều xóa cache của TanStack Query để không lộ dữ liệu người trước.
 *
 * Chỉ lấy đúng phần cần dùng:
 *   const user = useAuthStore(s => s.user);
 *   const isAuthenticated = useAuthStore(s => s.isAuthenticated);
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        queryClient.clear();
        set({ token, user, isAuthenticated: Boolean(token && user) });
      },

      logout: () => {
        queryClient.clear();
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: "viettritutor-auth", // khóa lưu trong localStorage
      // Dữ liệu lưu bị thiếu token hoặc user thì coi như đã đăng xuất
      onRehydrateStorage: () => (state) => {
        if (state && (!state.token || !state.user)) state.logout();
      },
      // Chỉ lưu dữ liệu, không lưu các hàm
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

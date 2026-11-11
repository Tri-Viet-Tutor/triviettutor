import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartState } from "@/interfaces/pricing";

const CART_STORAGE_KEY = "viettritutor-cart";

// Bản cũ lưu giỏ trong localStorage — xóa đi để không còn giỏ "ma" sót lại
try {
  window.localStorage.removeItem(CART_STORAGE_KEY);
} catch {
  // Trình duyệt chặn storage (chế độ riêng tư...) thì bỏ qua
}

// Giỏ khóa học của trang "Mua khóa học" (Zustand).
// Lưu trong sessionStorage: tải lại trang vẫn còn, đóng thẻ trình duyệt là hết.
// Khách chưa đăng nhập rời luồng mua thì giỏ bị xóa (xem GuestCartScope).
// Chỉ giữ mã môn — tên và học phí luôn đọc lại từ dữ liệu khóa học, không lưu giá cũ.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      subjects: [],
      add: (subject) => set((state) => (state.subjects.includes(subject) ? state : { subjects: [...state.subjects, subject] })),
      toggle: (subject) =>
        set((state) => ({
          subjects: state.subjects.includes(subject) ? state.subjects.filter((item) => item !== subject) : [...state.subjects, subject],
        })),
      remove: (subject) => set((state) => ({ subjects: state.subjects.filter((item) => item !== subject) })),
      clear: () => set({ subjects: [] }),
    }),
    { name: CART_STORAGE_KEY, storage: createJSONStorage(() => window.sessionStorage) },
  ),
);

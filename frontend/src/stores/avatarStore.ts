import { create } from "zustand";

// Phiên bản ảnh đại diện để phá cache trình duyệt: đổi / xóa ảnh xong thì tăng số,
// mọi <UserAvatar> tải lại ảnh mới (đường dẫn kèm ?v=).
export const useAvatarVersion = create<{ version: number; bump: () => void }>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));

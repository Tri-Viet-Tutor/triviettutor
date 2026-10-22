import { PREVIEW_ACCOUNTS } from "@/preview/previewData";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/interfaces/api";

/** "Mã đăng nhập" giả của chế độ xem thử — chỉ để các trang coi như đã đăng nhập */
export const PREVIEW_TOKEN = "preview";

/** Vào một khu (quản trị, gia sư, học viên) bằng tài khoản mẫu của vai trò đó */
export function enterPreviewArea(role: Role) {
  useAuthStore.getState().setAuth(PREVIEW_TOKEN, PREVIEW_ACCOUNTS[role]);
}

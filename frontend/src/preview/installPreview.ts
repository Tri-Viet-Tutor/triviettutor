import axios, { AxiosError, type AxiosAdapter, type AxiosResponse } from "axios";
import { ROUTES } from "@/constants/routes";
import { api } from "@/lib/api";
import { enterPreviewArea, PREVIEW_TOKEN } from "@/preview/previewAuth";
import { createPreviewState } from "@/preview/previewData";
import { handlePreviewRequest } from "@/preview/previewRoutes";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/types/api";

/** Độ trễ giả của mỗi lời gọi, để vẫn thấy trạng thái đang tải */
const LATENCY_MS = 150;

/** Hai khu chưa có tài khoản thật để đăng nhập (học viên thì tự đăng ký được nên không cần xem thử) */
const AREA_ROLES: [prefix: string, role: Exclude<Role, "ROLE_STUDENT">][] = [
  [ROUTES.admin, "ROLE_ADMIN"],
  [ROUTES.tutor, "ROLE_TUTOR"],
];

/**
 * Chế độ xem thử — chỉ có khi chạy `npm run dev` (gọi một lần trước khi vẽ ứng dụng, xem main.tsx):
 *  - chưa đăng nhập mà mở /admin hoặc /tutor thì vào thẳng bằng tài khoản mẫu của khu đó,
 *    để xem và chỉnh giao diện khi chưa có tài khoản thật;
 *  - khi đang dùng tài khoản mẫu, các API của hai khu này được trả lời bằng dữ liệu mẫu ngay trong trình duyệt;
 *    đổi khu bằng cách mở đường dẫn của khu kia; đăng xuất hoặc mở trang khác (đăng nhập, khu học viên…) là thoát;
 *  - đăng nhập bằng tài khoản thật thì mọi thứ chạy với backend như thường.
 * Không sửa lib/api.ts, authStore hay các route chặn quyền: chỉ gắn thêm một adapter cho axios lúc chạy.
 * Bản build thật không chứa phần này; đặt VITE_PREVIEW=false để tắt cả khi chạy dev.
 */
export function installPreview() {
  const state = createPreviewState();
  const realAdapter = axios.getAdapter(api.defaults.adapter);

  const previewAdapter: AxiosAdapter = async (config) => {
    const { token, user } = useAuthStore.getState();
    const reply =
      token === PREVIEW_TOKEN && user
        ? handlePreviewRequest(state, {
            method: (config.method ?? "get").toUpperCase(),
            path: config.url ?? "",
            params: (config.params ?? {}) as Record<string, unknown>,
            body: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
            user: { ...user, role: user.role as Role },
          })
        : null;
    if (!reply) return realAdapter(config);

    await new Promise((resolve) => window.setTimeout(resolve, LATENCY_MS));
    const response: AxiosResponse = { data: reply.body, status: reply.status, statusText: "", headers: {}, config, request: null };
    if (reply.status >= 400) throw new AxiosError(reply.body.message, AxiosError.ERR_BAD_REQUEST, config, null, response);
    return response;
  };
  api.defaults.adapter = previewAdapter;

  // Không đè lên phiên đăng nhập thật: chỉ vào bằng tài khoản mẫu khi chưa đăng nhập hoặc đang xem thử khu kia.
  // Mở trang ngoài hai khu này (trang đăng nhập, khu học viên…) thì bỏ tài khoản mẫu để mọi thứ chạy như thật.
  const { token, user, logout } = useAuthStore.getState();
  const area = AREA_ROLES.find(([prefix]) => window.location.pathname.startsWith(prefix));
  if (!area) {
    if (token === PREVIEW_TOKEN) logout();
  } else if ((!token || token === PREVIEW_TOKEN) && user?.role !== area[1]) {
    enterPreviewArea(area[1]);
  }
}

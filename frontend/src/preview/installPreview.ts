import axios, { type AxiosAdapter, AxiosError, type AxiosResponse } from "axios";
import { ROUTES } from "@/constants/routes";
import { api } from "@/services/api";
import { enterPreviewArea, PREVIEW_TOKEN } from "@/preview/previewAuth";
import { createPreviewState } from "@/preview/previewData";
import { handlePreviewRequest } from "@/preview/previewRoutes";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/interfaces/api";

/** Độ trễ giả của mỗi lời gọi, để vẫn thấy trạng thái đang tải */
const LATENCY_MS = 150;

/** Các khu xem thử được bằng tài khoản mẫu khi chạy `npm run dev` (chưa đăng nhập thật) */
const AREA_ROLES: [prefix: string, role: Role][] = [
  [ROUTES.admin, "ROLE_ADMIN"],
  [ROUTES.tutor, "ROLE_TUTOR"],
  [ROUTES.student, "ROLE_STUDENT"],
];

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

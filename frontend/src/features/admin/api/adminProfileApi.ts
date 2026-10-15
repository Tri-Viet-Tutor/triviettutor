import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, MeResponse, PageResponse } from "@/types/api";

/** Tham số của GET /admin/profiles (page từ 0, size 1 – 100) */
export interface AdminProfilesQuery {
  role: "ROLE_TUTOR" | "ROLE_STUDENT";
  /** Tìm theo email hoặc họ tên, không phân biệt hoa thường */
  search?: string;
  page?: number;
  size?: number;
}

/** GET /admin/profiles — hồ sơ đầy đủ của gia sư (lương, thù lao, giới thiệu) hoặc học viên (điện thoại, địa chỉ) */
export async function fetchAdminProfiles(query: AdminProfilesQuery): Promise<PageResponse<MeResponse>> {
  const { data } = await api.get<ApiResponse<PageResponse<MeResponse>>>("/admin/profiles", { params: query });
  return data.data as PageResponse<MeResponse>;
}

/* Khóa nằm dưới "admin" để useRefreshAdmin làm mới luôn sau khi sửa hồ sơ gia sư */
export function useAdminProfiles(query: AdminProfilesQuery) {
  return useQuery({
    queryKey: ["admin", "profiles", query] as const,
    queryFn: () => fetchAdminProfiles(query),
    placeholderData: (previous) => previous,
  });
}

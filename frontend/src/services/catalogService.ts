import type { ApiResponse, CatalogClassResponse, CatalogClassesQuery, PageResponse } from "@/interfaces/api";
import { api, unwrap } from "@/services/api";

/** GET /catalog/classes — danh sách lớp đang mở đăng ký */
export async function fetchCatalogClasses(query: CatalogClassesQuery = {}): Promise<PageResponse<CatalogClassResponse>> {
  return unwrap(await api.get<ApiResponse<PageResponse<CatalogClassResponse>>>("/catalog/classes", { params: query }));
}

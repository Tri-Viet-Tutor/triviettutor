import { api, unwrap } from "@/services/apiClient";
import type { ApiResponse } from "@/interfaces/dto";
import type { UploadedFile } from "@/interfaces/dto";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar";

// POST /files — tải một tệp lên (tối đa 10 MB)
export async function uploadAttachment(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);
  return unwrap(await api.post<ApiResponse<UploadedFile>>("/files", form, { headers: { "Content-Type": "multipart/form-data" } }));
}

// Tên hiển thị của một resourceUrl: tệp đã tải lên thì lấy ?name=, link ngoài thì lấy tên miền
export function attachmentName(url: string): string {
  if (url.startsWith("/api/v1/files/")) {
    const name = new URL(url, window.location.origin).searchParams.get("name");
    return name || "Tệp đính kèm";
  }
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Tệp tải lên hệ thống hay link ngoài
export const isUploadedFile = (url: string) => url.startsWith("/api/v1/files/");

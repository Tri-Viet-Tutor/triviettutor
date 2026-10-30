import { api } from "@/services/api";

/** Đường dẫn ảnh đại diện của một người dùng (GET /users/{id}/avatar, công khai) */
export function avatarUrl(userId: number, version = 0): string {
  return `/api/v1/users/${userId}/avatar${version ? `?v=${version}` : ""}`;
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** POST /me/avatar — tải ảnh của chính mình (PNG / JPEG, tối đa 2 MB) */
export async function uploadMyAvatar(file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  await api.post("/me/avatar", form, { headers: { "Content-Type": "multipart/form-data" } });
}

/** DELETE /me/avatar */
export async function deleteMyAvatar(): Promise<void> {
  await api.delete("/me/avatar");
}

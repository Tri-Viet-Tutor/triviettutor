/**
 * Đưa chữ về dạng dễ so khớp khi tìm kiếm: chữ thường, bỏ dấu tiếng Việt, gộp khoảng trắng.
 * Ví dụ "Thầy Hồ Đức Thuận" → "thay ho duc thuan".
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chuẩn hóa chuỗi để tìm kiếm không phân biệt dấu / hoa thường:
 * bỏ dấu tiếng Việt, đ → d, chữ thường, gộp khoảng trắng. Ví dụ: "  Đặng  Văn " → "dang van".
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

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

/** Số điểm hợp lệ theo backend (@Digits integer = 8, fraction = 2): số không âm, tối đa 8 chữ số phần nguyên và 2 chữ số thập phân. */
export function isValidScore(value: string): boolean {
  return /^\d{1,8}([.,]\d{1,2})?$/.test(value.trim());
}

/** Đổi chuỗi điểm ("8,5" hoặc "8.5") thành số. */
export function parseScore(value: string): number {
  return Number(value.trim().replace(",", "."));
}

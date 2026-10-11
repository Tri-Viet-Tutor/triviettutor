/** Định dạng số tiền theo kiểu Việt Nam: 5200000 → "5.200.000 VNĐ" (khoảng trắng không ngắt dòng). */
export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}\u00A0VNĐ`;
}

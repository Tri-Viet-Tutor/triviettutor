/** Định dạng số tiền theo kiểu Việt Nam: 5200000 → "5.200.000đ". */
export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

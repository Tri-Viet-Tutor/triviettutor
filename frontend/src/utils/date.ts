const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Đổi chuỗi "YYYY-MM-DD" thành ngày theo giờ máy người xem (0 giờ sáng). */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Hôm nay, bỏ phần giờ phút. */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Số ngày từ `from` tới `to` (âm nếu `to` ở trước). */
export function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Ngày/tháng kiểu Việt Nam: 01/10. */
export function formatDayMonth(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

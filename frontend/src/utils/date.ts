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

const pad = (value: number) => String(value).padStart(2, "0");

/** Ngày/tháng/năm kiểu Việt Nam: 01/10/2026. */
export function formatDate(date: Date): string {
  return `${formatDayMonth(date)}/${date.getFullYear()}`;
}

/** Giờ:phút của một thời điểm: 18:05. */
export function formatClockTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Đổi ngày thành chuỗi "YYYY-MM-DD" (theo giờ máy người xem). */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const WEEKDAY_NAMES = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Tên thứ: "Thứ Sáu" (hoặc "T6" khi `short`). */
export function weekdayName(date: Date, short = false): string {
  return (short ? WEEKDAY_SHORT : WEEKDAY_NAMES)[date.getDay()];
}

/** Thứ Hai của tuần chứa `date` (tuần bắt đầu từ thứ Hai). */
export function startOfWeek(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7));
}

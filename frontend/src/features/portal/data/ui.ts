/* Kiểu dáng và kiểu dữ liệu dùng chung của ba khu sau đăng nhập (học viên, gia sư, quản trị). */

export interface PortalNavItem {
  to: string;
  label: string;
  /** Tên biểu tượng Material Symbols */
  icon: string;
  /** Tên ngắn cho thanh dưới ở điện thoại (không có thì dùng `label`) */
  shortLabel?: string;
  /** Chỉ sáng khi đường dẫn khớp hoàn toàn (dùng cho trang gốc của khu) */
  end?: boolean;
  /** Không hiện ở thanh dưới của điện thoại (thanh đó chỉ vừa 5 mục) */
  desktopOnly?: boolean;
}

/** Thẻ nội dung */
export const PORTAL_CARD = "rounded-2xl border border-slate-200 bg-white";

/** Màu nền của khu sau đăng nhập (các lỗ khuyết trên vé khóa học tô cùng màu này) */
export const PORTAL_SURFACE = "bg-[#F6F8FD]";

/** Nút chính và nút phụ cỡ vừa */
export const PORTAL_BTN_PRIMARY =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-brand-navy px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-navyDeep disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";
export const PORTAL_BTN_SECONDARY =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 text-[14px] font-semibold text-brand-navy transition-colors hover:border-brand-navy disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";
export const PORTAL_TEXT_LINK =
  "rounded font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Ô nhập cỡ vừa (cao bằng nút) cho bộ lọc và các form nhỏ trong khu sau đăng nhập */
export const PORTAL_INPUT =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[14.5px] text-brand-ink outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy disabled:bg-slate-100 disabled:text-brand-muted";

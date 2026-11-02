/* Các chuỗi lớp Tailwind dùng chung giữa các trang công khai. */

/** Khung nội dung căn giữa, rộng tối đa 7xl, có lề hai bên */
export const CONTAINER = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

/** Viền nổi bật khi di chuyển bằng bàn phím (Tab) */
export const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Liên kết dạng chữ màu xanh, gạch chân khi rê chuột */
export const TEXT_LINK = `inline-flex items-center gap-1 text-[15px] font-semibold text-brand-navy transition-colors hover:text-brand-orangeHover [&>.material-symbols-outlined]:transition-transform hover:[&>.material-symbols-outlined]:translate-x-0.5 ${FOCUS_RING}`;

/** Ô nhập kiểu điền phiếu giấy: chỉ có một nét gạch chân */
export const FIELD =
  "w-full h-10 rounded-none border-0 border-b-2 border-brand-navy/25 bg-transparent px-0 text-[15px] text-brand-ink placeholder:text-slate-400 outline-none transition-colors focus:border-brand-navy";
/** Nhãn phía trên ô nhập kiểu phiếu giấy */
export const FIELD_LABEL = "block text-[13px] font-semibold text-brand-muted";

/** Miếng băng dính giấy màu cam dán ảnh */
export const TAPE =
  "absolute h-6 bg-[repeating-linear-gradient(90deg,rgba(245,160,15,0.85)_0,rgba(245,160,15,0.85)_6px,rgba(245,160,15,0.65)_6px,rgba(245,160,15,0.65)_12px)]";

/** Nút chính (nền xanh) */
export const CHECKOUT_BTN_PRIMARY =
  "flex h-11 shrink-0 items-center justify-center rounded-md bg-brand-navy px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-navyDeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:cursor-not-allowed disabled:opacity-50";

/** Nút phụ (viền xám) */
export const CHECKOUT_BTN_SECONDARY =
  "flex h-11 shrink-0 items-center justify-center rounded-md border border-slate-300 px-5 text-[15px] font-semibold text-brand-navy transition-colors hover:border-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:opacity-50";

/** Thẻ nội dung */
export const PORTAL_CARD =
  "rounded-2xl border border-brand-sandLine bg-white shadow-[0_1px_0_rgba(20,33,61,0.03),0_14px_34px_-22px_rgba(11,58,140,0.28)]";

/** Màu nền của khu sau đăng nhập (các lỗ khuyết trên vé khóa học tô cùng màu này) */
export const PORTAL_SURFACE = "bg-brand-sand";

/** Nút chính cỡ vừa */
export const PORTAL_BTN_PRIMARY =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-navy px-4 text-[14px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(11,58,140,0.7)] transition-[background-color,transform] hover:bg-brand-navyDeep active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Nút phụ cỡ vừa (viền xám) */
export const PORTAL_BTN_SECONDARY =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-brand-sandLine bg-white px-4 text-[14px] font-semibold text-brand-navy transition-colors hover:border-brand-navy/50 hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Nút nhấn mạnh màu cam thương hiệu (việc chính của trang: tạo mới, chốt…) */
export const PORTAL_BTN_ACCENT =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-orange px-4 text-[14px] font-bold text-brand-navyDeep shadow-[0_6px_16px_-8px_rgba(222,139,0,0.9)] transition-[background-color,transform] hover:bg-brand-orangeHover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Nút nhỏ dạng chữ có nền khi rê chuột (thao tác phụ trong từng dòng) */
export const PORTAL_BTN_GHOST =
  "inline-flex h-9 items-center justify-center gap-1 rounded-lg px-3 text-[13.5px] font-semibold text-brand-navy transition-colors hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Nhãn nhỏ phía trên ô nhập trong khu sau đăng nhập */
export const PORTAL_LABEL = "mb-1.5 block text-[13px] font-semibold text-brand-muted";

/** Liên kết "xem thêm" kèm mũi tên: không gạch chân, rê chuột thì đổi màu và mũi tên nhích sang phải */
export const PORTAL_MORE_LINK =
  "group/more inline-flex items-center gap-0.5 rounded font-semibold text-brand-navy transition-colors hover:text-brand-orangeHover [&>.material-symbols-outlined]:transition-transform hover:[&>.material-symbols-outlined]:translate-x-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Liên kết / nút dạng chữ */
export const PORTAL_TEXT_LINK =
  "rounded font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Ô nhập cỡ vừa (cao bằng nút) cho bộ lọc và các form nhỏ trong khu sau đăng nhập */
export const PORTAL_INPUT =
  "h-10 w-full rounded-xl border border-brand-sandLine bg-white px-3 text-[14.5px] text-brand-ink outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy disabled:bg-slate-100 disabled:text-brand-muted";

/** Lớp Tailwind của ô nhập trong form xác thực (cũng dùng lại ở các khu sau đăng nhập) */
export const AUTH_INPUT =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 text-[15px] text-brand-ink outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500 disabled:bg-slate-100 disabled:text-brand-muted autofill:shadow-[inset_0_0_0_1000px_#fff]";

/** Lớp Tailwind của nhãn ô nhập */
export const AUTH_LABEL = "block text-[13.5px] font-medium text-brand-ink";

/** Lớp Tailwind của dòng báo lỗi dưới ô nhập */
export const AUTH_ERROR = "mt-1.5 text-[13px] font-medium text-red-700";

/** Lớp Tailwind của liên kết chữ trong form (đăng nhập, đổi email, gửi lại mã…) */
export const AUTH_TEXT_LINK =
  "font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Nút chính trong bảng (xuất ra để trang truyền `emptyAction` cùng kiểu) */
export const TODAY_PANEL_CTA = `inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#1F63D8] px-4 text-[14px] font-bold text-white transition-colors hover:bg-brand-navy ${FOCUS_RING}`;

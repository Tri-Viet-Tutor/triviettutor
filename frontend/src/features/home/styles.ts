/* Các chuỗi lớp Tailwind dùng chung giữa những phần của trang chủ. */

export const CONTAINER = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

export const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

export const TEXT_LINK = `inline-flex items-center gap-1 text-[15px] font-semibold text-brand-navy underline-offset-4 hover:underline ${FOCUS_RING}`;

/* Ô nhập kiểu điền phiếu giấy: chỉ có một nét gạch chân */
export const FIELD =
  "w-full h-10 rounded-none border-0 border-b-2 border-brand-navy/25 bg-transparent px-0 text-[15px] text-brand-ink placeholder:text-slate-400 outline-none transition-colors focus:border-brand-navy";
export const FIELD_LABEL = "block text-[13px] font-semibold text-brand-muted";

/** Miếng băng dính giấy màu cam dán ảnh */
export const TAPE =
  "absolute h-6 bg-[repeating-linear-gradient(90deg,rgba(245,160,15,0.85)_0,rgba(245,160,15,0.85)_6px,rgba(245,160,15,0.65)_6px,rgba(245,160,15,0.65)_12px)]";

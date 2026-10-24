import type { ReactNode } from "react";

/* Kiểu dữ liệu dùng chung cho các component giao diện. */

/** Tông màu của nhãn trạng thái */
export type Tone = "navy" | "green" | "amber" | "red" | "slate";

/** Một mục trên thanh điều hướng của khu */
export interface PortalNavItem {
  /** Đường dẫn trang */
  to: string;
  /** Tên mục */
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

/** Một câu hỏi thường gặp kèm câu trả lời */
export interface Faq {
  question: string;
  answer: string;
}

/** Vị trí và nhịp của một ngôi sao trang trí */
export interface SparkleSpot {
  /** Toạ độ góc trên trái, tính theo % khung chứa */
  left: number;
  top: number;
  /** Bề rộng (px) */
  size: number;
  /** Lệch pha nhấp nháy (giây) */
  delay: number;
}

/** Một dòng "nhãn — con số" */
export interface SummaryRow {
  /** Tên biểu tượng Material Symbols và lớp màu của nó */
  icon: string;
  iconClassName: string;
  label: string;
  value: string;
  /** Lớp màu của con số */
  valueClassName: string;
}

// ── Nét vẽ trang trí (components/contact, components/pricing) ──
/** Một nét vẽ trang trí */
export interface Doodle {
  id: string;
  /** Vị trí góc trên trái, tính theo % của khung chứa nét vẽ */
  left: number;
  top: number;
  /** Góc nghiêng (độ) */
  tilt: number;
  /** Lệch pha trôi lên xuống (giây) */
  delay: number;
  /** Bề rộng (px) */
  width: number;
  /** SVG của nét vẽ */
  content: ReactNode;
}

// ── components/ui ──
/** Props của ConsultCtaSection */
export interface ConsultCtaSectionProps {
  /** Phần đầu câu hỏi, ví dụ "Chưa biết chọn" */
  title: string;
  /** Phần cuối câu hỏi, được gạch chân vẽ tay, ví dụ "gia sư nào?" */
  highlight: string;
  /** Đoạn mô tả ngắn dưới câu hỏi */
  description: string;
}

/** Props của ErrorScreen */
export interface ErrorScreenProps {
  /** Mã lỗi hiển thị to ở giữa, ví dụ "404" */
  code: string;
  /** Câu giải thích ngắn */
  message: string;
}

/** Props của FaqSection */
export interface FaqSectionProps {
  /** Tiêu đề phần (cột trái) */
  title: string;
  /** Mô tả ngắn dưới tiêu đề */
  description?: string;
  /** Danh sách câu hỏi; câu đầu tiên mở sẵn */
  faqs: Faq[];
}

/** Một ảnh trong khung trình chiếu */
export interface SlideshowSlide {
  src: string;
  alt: string;
}

/** Props của FramedSlideshow */
export interface FramedSlideshowProps {
  /** Danh sách ảnh trình chiếu */
  slides: SlideshowSlide[];
  /** Thời gian hiển thị mỗi ảnh (mili giây) */
  intervalMs?: number;
  /** Nội dung nổi đặt chồng lên khung, ví dụ một nhãn ở góc */
  children?: ReactNode;
}

/** Props của Icon */
export interface IconProps {
  /** Tên biểu tượng Material Symbols, ví dụ "arrow_forward" */
  name: string;
  className?: string;
}

/** Props của QrCode */
export interface QrCodeProps {
  /** Nội dung mã hoá trong mã QR */
  value: string;
  /** Mô tả mã cho trình đọc màn hình */
  label: string;
  className?: string;
}

/** Props của SectionHeading */
export interface SectionHeadingProps {
  title: string;
  /** Mô tả ngắn dưới tiêu đề */
  description?: string;
  /** Liên kết "xem thêm" ở bên phải */
  action?: { label: string; to: string };
  /** Hình minh hoạ nhỏ đặt trước tiêu đề */
  icon?: ReactNode;
}

// ── constants/labels.ts ──
/** Cách hiển thị một trạng thái: chữ, màu, biểu tượng */
export interface StatusStyle {
  label: string;
  tone: Tone;
  /** Tên biểu tượng Material Symbols */
  icon: string;
}

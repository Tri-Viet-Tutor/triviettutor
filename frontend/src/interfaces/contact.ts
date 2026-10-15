import type { GradeLevel } from "@/interfaces/api";

// ── components/contact ──
/** Giá trị form trong ConsultLetterForm — kiểm tra bằng `letterSchema` */
export interface ConsultLetterFormValues {
  fullName: string;
  phone: string;
  email: string;
  /** Chỉ lớp 10 – 12 (THPT) */
  gradeLevel: GradeLevel;
  subject: string;
  deliveryMode: string;
  note: string;
}

// ── constants/contact.ts ──
/** Một cách liên hệ (email, điện thoại, địa chỉ) */
export interface ContactChannel {
  /** Tên biểu tượng Material Symbols */
  icon: string;
  /** Tên cách liên hệ */
  label: string;
  /** Mỗi phần tử một dòng; có `href` thì bấm được (gửi thư, gọi điện) */
  lines: { text: string; href?: string }[];
}

// ── utils/contact.ts ──
/** Nội dung một thư đăng ký tư vấn, các nhãn đã đổi sang chữ hiển thị */
export interface ConsultLetter {
  fullName: string;
  phone: string;
  email: string;
  grade: string;
  subject: string;
  deliveryMode: string;
  note: string;
}

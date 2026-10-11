import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_PHONES, telHref } from "@/constants/contact";

/** Hai dòng tiêu đề ở đầu trang */
export const CONTACT_TITLE_LINES = ["Liên Hệ", "Trí Việt Tutor"];

export interface ContactChannel {
  /** Tên biểu tượng Material Symbols */
  icon: string;
  label: string;
  /** Mỗi phần tử một dòng; có `href` thì bấm được (gửi thư, gọi điện) */
  lines: { text: string; href?: string }[];
}

/** Các cách liên hệ trung tâm, lấy từ constants/contact.ts */
export const CONTACT_CHANNELS: ContactChannel[] = [
  { icon: "mail", label: "Email", lines: [{ text: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` }] },
  { icon: "call", label: "Điện thoại", lines: CONTACT_PHONES.map((phone) => ({ text: phone, href: telHref(phone) })) },
  { icon: "location_on", label: "Địa chỉ", lines: [{ text: CONTACT_ADDRESS }] },
];

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

/**
 * Tạo đường dẫn mailto gửi tới email của trung tâm với nội dung điền sẵn.
 * Backend chưa có API nhận yêu cầu tư vấn nên thư được gửi bằng ứng dụng thư của chính người dùng.
 */
export function buildConsultMailto(letter: ConsultLetter): string {
  const subject = `Đăng ký tư vấn – ${letter.subject} ${letter.grade}`;
  const body = [
    `Họ tên: ${letter.fullName}`,
    `Số điện thoại: ${letter.phone}`,
    letter.email && `Email: ${letter.email}`,
    `Khối lớp: ${letter.grade}`,
    `Môn học: ${letter.subject}`,
    `Hình thức học: ${letter.deliveryMode}`,
    letter.note && `Ghi chú: ${letter.note}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

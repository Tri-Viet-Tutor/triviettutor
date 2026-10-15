import { CONTACT_EMAIL } from "@/constants/contact";
import type { ConsultLetter } from "@/interfaces/contact";

/* Hàm hỗ trợ trang "Liên hệ". */

export function buildConsultMailto(letter: ConsultLetter): string {
  const subject = `Đăng ký tư vấn – ${letter.subject} ${letter.grade}`;
  // Mỗi thông tin một dòng; email và ghi chú để trống thì bỏ
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

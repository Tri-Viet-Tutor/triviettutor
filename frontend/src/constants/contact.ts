import type { ContactChannel } from "@/interfaces/contact";

// Thông tin liên hệ của trung tâm — một nơi duy nhất cho chân trang và trang "Liên hệ".

// Email liên hệ chính thức của trung tâm
export const CONTACT_EMAIL = "triviettutor.app@gmail.com";

// Số điện thoại. LƯU Ý: đang là số mẫu, thay bằng số thật của trung tâm.
export const CONTACT_PHONES = ["(028) 3888 9999", "0988 123 456"];

// Địa chỉ. LƯU Ý: đang là địa chỉ mẫu, thay bằng địa chỉ thật của trung tâm.
export const CONTACT_ADDRESS = "Tòa nhà Saigon Tower, 29 Lê Duẩn, Bến Nghé, Quận 1, TP. Hồ Chí Minh";

// Đổi số hiển thị thành dạng bấm gọi được: "(028) 3888 9999" → "tel:02838889999"
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

// Hai dòng tiêu đề ở đầu trang
export const CONTACT_TITLE_LINES = ["Liên Hệ", "Trí Việt Tutor"];

// Các cách liên hệ trung tâm, lấy từ constants/contact.ts
export const CONTACT_CHANNELS: ContactChannel[] = [
  { icon: "mail", label: "Email", lines: [{ text: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` }] },
  { icon: "call", label: "Điện thoại", lines: CONTACT_PHONES.map((phone) => ({ text: phone, href: telHref(phone) })) },
  { icon: "location_on", label: "Địa chỉ", lines: [{ text: CONTACT_ADDRESS }] },
];

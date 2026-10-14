import { ASSETS } from "@/constants/assets";

export interface Tutor {
  name: string;
  /** Môn phụ trách, ví dụ "Gia sư Toán THPT" */
  role: string;
  image: string;
  alt: string;
}

/* Gia sư đứng lớp các khóa học — hiển thị ở tấm quảng cáo "Đội ngũ gia sư". */
export const TUTORS: Tutor[] = [
  {
    name: "Thầy Hồ Đức Thuận",
    role: "Gia sư Toán THPT",
    image: ASSETS.public.tutors.hoDucThuan,
    alt: "Thầy Hồ Đức Thuận – Toán THPT",
  },
  {
    name: "Thầy Nguyễn Công Chính",
    role: "Gia sư Toán THPT",
    image: ASSETS.public.tutors.nguyenCongChinh,
    alt: "Thầy Nguyễn Công Chính – Toán THPT",
  },
  {
    name: "Cô Trang Anh",
    role: "Gia sư Tiếng Anh THPT",
    image: ASSETS.public.tutors.trangAnh,
    alt: "Cô Trang Anh – Tiếng Anh",
  },
  {
    name: "Thầy Lương Tạ Kinh Luân",
    role: "Gia sư Ngữ Văn THPT",
    image: ASSETS.public.tutors.luongTaKinhLuan,
    alt: "Thầy Lương Tạ Kinh Luân – Ngữ Văn",
  },
  {
    name: "Thầy Nguyễn Công Khanh",
    role: "Gia sư Hóa học THPT",
    image: ASSETS.public.tutors.nguyenCongKhanh,
    alt: "Thầy Nguyễn Công Khanh – Hóa học",
  },
  {
    name: "Cô Lê Thị Hiền",
    role: "Gia sư Tin học THPT",
    image: ASSETS.public.tutors.leThiHien,
    alt: "Cô Lê Thị Hiền – Tin học",
  },
];

/** Ba ý chính trên tấm quảng cáo */
export const TUTOR_PROMO_POINTS = [
  "Gia sư được phỏng vấn và thử giảng",
  "Mỗi khóa một môn, lộ trình học theo tuần",
  "Học theo lớp tại trung tâm hoặc trực tuyến",
];

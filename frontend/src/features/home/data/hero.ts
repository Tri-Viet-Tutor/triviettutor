import { ASSETS } from "@/constants/assets";

export interface HeroSlide {
  src: string;
  alt: string;
}

/** Hai dòng của tiêu đề chính (mỗi dòng được tô đầy dần khi tải trang) */
export const HERO_TITLE_LINES = ["Gia Sư Cấp 3", "Tại TP. Hồ Chí Minh"];

/** Ba ảnh tự chuyển trong khung ảnh mở đầu */
export const HERO_SLIDES: HeroSlide[] = [
  { src: ASSETS.public.classrooms.classroom1, alt: "Thầy giáo hướng dẫn nhóm học sinh ngồi quây quần trong lớp" },
  { src: ASSETS.public.classrooms.classroom2, alt: "Thầy giáo giảng bài bên bảng cho một lớp học nhỏ" },
  { src: ASSETS.public.classrooms.classroom3, alt: "Nhóm học sinh THPT cùng làm bài trong phòng học" },
];

/** Thời gian hiển thị mỗi ảnh (mili giây) */
export const HERO_SLIDE_MS = 5000;

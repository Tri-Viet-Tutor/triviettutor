import { ASSETS } from "@/constants/assets";

/** Ảnh giữa của phần mở đầu: nhóm học sinh THPT đang học — đại diện cho "khối lớp" */
export const CATALOG_HERO_PHOTO = {
  src: ASSETS.public.students.highSchool,
  alt: "Bốn học sinh THPT mặc đồng phục ngồi học cùng nhau bên bàn, có máy tính và sách vở",
};

/** Hai dòng của tiêu đề (mỗi dòng được tô đầy dần khi tải trang) */
export const CATALOG_TITLE_LINES = ["Khối Lớp", "& Môn Học"];

/**
 * Góc đặt các bong bóng môn học quanh ảnh giữa (độ, 0° là bên phải, chiều kim đồng hồ).
 * Chừa phần đáy cho nhãn khối lớp. Số góc phải đủ cho số khóa trong COURSES.
 */
export const SUBJECT_ORBIT_ANGLES = [-90, -25, 30, 150, -155];

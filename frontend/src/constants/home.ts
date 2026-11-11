import { ASSETS } from "@/constants/assets";
import type { Tutor } from "@/interfaces/tutor";
import type { ClassPractice, HeroSlide } from "@/interfaces/home";

// Nội dung tĩnh của trang chủ.

// Hai dòng của tiêu đề chính (mỗi dòng được tô đầy dần khi tải trang)
export const HERO_TITLE_LINES = ["Gia Sư Cấp 3", "Tại TP. Hồ Chí Minh"];

// Ba ảnh tự chuyển trong khung ảnh mở đầu
export const HERO_SLIDES: HeroSlide[] = [
  { src: ASSETS.public.classrooms.classroom1, alt: "Thầy giáo hướng dẫn nhóm học sinh ngồi quây quần trong lớp" },
  { src: ASSETS.public.classrooms.classroom2, alt: "Thầy giáo giảng bài bên bảng cho một lớp học nhỏ" },
  { src: ASSETS.public.classrooms.classroom3, alt: "Nhóm học sinh THPT cùng làm bài trong phòng học" },
];

// Thời gian hiển thị mỗi ảnh (mili giây)
export const HERO_SLIDE_MS = 5000;

// Bốn ý ở phần "Cách Trí Việt tổ chức lớp học" (bảng phấn).
export const CLASS_PRACTICES: ClassPractice[] = [
  {
    icon: "how_to_reg",
    title: "Gia Sư Qua Tuyển Chọn",
    description: "Phỏng vấn và thử giảng trước khi nhận lớp.",
  },
  {
    icon: "groups_3",
    title: "Lớp Tối Đa 8 Học Sinh",
    description: "Mỗi lớp một môn, giáo viên theo sát từng bạn.",
  },
  {
    icon: "event_note",
    title: "Lộ Trình Từng Môn",
    description: "Học theo tuần, bám sát chương trình và cấu trúc đề thi.",
  },
  {
    icon: "query_stats",
    title: "Báo Cáo Sau Mỗi Buổi",
    description: "Bài giảng, điểm kiểm tra và thái độ học gửi phụ huynh qua Zalo.",
  },
];

// Gia sư đứng lớp các khóa học — hiển thị ở tấm quảng cáo "Đội ngũ gia sư".
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

// Ba ý chính trên tấm quảng cáo
export const TUTOR_PROMO_POINTS = [
  "Gia sư được phỏng vấn và thử giảng",
  "Mỗi khóa một môn, lộ trình học theo tuần",
  "Học theo lớp tại trung tâm hoặc trực tuyến",
];

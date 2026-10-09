import { ASSETS } from "@/constants/assets";

export interface CourseTutor {
  name: string;
  image: string;
}

export interface Course {
  /** Mã khóa, dùng làm id của nhãn mục lục */
  id: string;
  /** Tên ngắn trên nhãn mục lục */
  tab: string;
  name: string;
  summary: string;
  tutors: CourseTutor[];
  /** Các chặng của lộ trình, theo thứ tự học */
  steps: string[];
}

/* Khóa học theo từng môn — hiển thị ở "Nhật ký lộ trình".
 * Mỗi khóa: tên trên nhãn mục lục (tab), giáo viên, các chặng của lộ trình (steps, theo thứ tự).
 * Mọi khóa đều có lớp tại trung tâm và lớp trực tuyến. Muốn thêm/sửa khóa học thì sửa mảng này. */
export const COURSES: Course[] = [
  {
    id: "toan",
    tab: "Toán",
    name: "Toán THPT",
    summary: "Toán lớp 10 – 12, ôn thi Tốt nghiệp THPT và ĐGNL.",
    tutors: [
      { name: "Thầy Hồ Đức Thuận", image: ASSETS.public.tutors.hoDucThuan },
      { name: "Thầy Nguyễn Công Chính", image: ASSETS.public.tutors.nguyenCongChinh },
    ],
    steps: [
      "Toán 10 – 12 theo chương trình",
      "Hàm số, cực trị & bài toán thực tế",
      "Chiến thuật làm đề trắc nghiệm Toán",
      "Luyện đề Tốt nghiệp THPT & ĐGNL phần Toán",
    ],
  },
  {
    id: "anh",
    tab: "Anh",
    name: "Tiếng Anh THPT",
    summary: "Ngữ pháp và luyện đề Tiếng Anh Tốt nghiệp THPT.",
    tutors: [{ name: "Cô Trang Anh", image: ASSETS.public.tutors.trangAnh }],
    steps: ["Tổng ôn ngữ pháp Tiếng Anh THPT", "Luyện đề Tiếng Anh Tốt nghiệp THPT"],
  },
  {
    id: "van",
    tab: "Văn",
    name: "Ngữ Văn THPT",
    summary: "Nghị luận và ôn thi Ngữ Văn Tốt nghiệp THPT.",
    tutors: [{ name: "Thầy Lương Tạ Kinh Luân", image: ASSETS.public.tutors.luongTaKinhLuan }],
    steps: ["Nghị luận văn học", "Nghị luận xã hội", "Ôn thi Ngữ Văn Tốt nghiệp THPT"],
  },
  {
    id: "hoa",
    tab: "Hóa",
    name: "Hóa học THPT",
    summary: "Hóa lớp 10 – 12 và ôn thi Tốt nghiệp THPT.",
    tutors: [{ name: "Thầy Nguyễn Công Khanh", image: ASSETS.public.tutors.nguyenCongKhanh }],
    steps: ["Hóa vô cơ lớp 10 – 12", "Hóa hữu cơ lớp 10 – 12", "Ôn thi Hóa học Tốt nghiệp THPT"],
  },
  {
    id: "tin",
    tab: "Tin",
    name: "Tin học THPT",
    summary: "Tin học lớp 10 – 12, lập trình Python.",
    tutors: [{ name: "Cô Lê Thị Hiền", image: ASSETS.public.tutors.leThiHien }],
    steps: ["Tin học 10 – 12 theo chương trình", "Lập trình Python", "Ôn thi Tin học Tốt nghiệp THPT"],
  },
];

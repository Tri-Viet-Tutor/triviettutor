import { ASSETS } from "@/constants/assets";

export interface CourseTutor {
  name: string;
  image: string;
}

export interface Course {
  /** Mã khóa, dùng làm id của nhãn mục lục */
  id: string;
  /**
   * Mã môn gửi cho backend (thuộc tính `subject` của Course / tham số lọc của GET /catalog/classes).
   * Đặc tả backend mới nêu ví dụ "MATH"; các mã còn lại đặt theo cùng kiểu, cần đối chiếu khi backend làm xong danh mục.
   */
  subject: string;
  /** Tên biểu tượng Material Symbols */
  icon: string;
  /** Tên môn đầy đủ */
  subjectLabel: string;
  /** Tên ngắn trên nhãn mục lục */
  tab: string;
  name: string;
  summary: string;
  tutors: CourseTutor[];
  /** Các chặng của lộ trình, theo thứ tự học */
  steps: string[];
}

/* Khóa học theo từng môn — hiển thị ở "Nhật ký lộ trình" (trang chủ) và trang "Khối lớp / Môn học".
 * Mỗi khóa: tên trên nhãn mục lục (tab), giáo viên, các chặng của lộ trình (steps, theo thứ tự).
 * Mọi khóa đều có lớp tại trung tâm và lớp trực tuyến. Muốn thêm/sửa khóa học thì sửa mảng này. */
export const COURSES: Course[] = [
  {
    id: "toan",
    subject: "MATH",
    icon: "calculate",
    subjectLabel: "Toán",
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
    subject: "ENGLISH",
    icon: "translate",
    subjectLabel: "Tiếng Anh",
    tab: "Anh",
    name: "Tiếng Anh THPT",
    summary: "Ngữ pháp và luyện đề Tiếng Anh Tốt nghiệp THPT.",
    tutors: [{ name: "Cô Trang Anh", image: ASSETS.public.tutors.trangAnh }],
    steps: ["Tổng ôn ngữ pháp Tiếng Anh THPT", "Luyện đề Tiếng Anh Tốt nghiệp THPT"],
  },
  {
    id: "van",
    subject: "LITERATURE",
    icon: "history_edu",
    subjectLabel: "Ngữ Văn",
    tab: "Văn",
    name: "Ngữ Văn THPT",
    summary: "Nghị luận và ôn thi Ngữ Văn Tốt nghiệp THPT.",
    tutors: [{ name: "Thầy Lương Tạ Kinh Luân", image: ASSETS.public.tutors.luongTaKinhLuan }],
    steps: ["Nghị luận văn học", "Nghị luận xã hội", "Ôn thi Ngữ Văn Tốt nghiệp THPT"],
  },
  {
    id: "hoa",
    subject: "CHEMISTRY",
    icon: "science",
    subjectLabel: "Hóa học",
    tab: "Hóa",
    name: "Hóa học THPT",
    summary: "Hóa lớp 10 – 12 và ôn thi Tốt nghiệp THPT.",
    tutors: [{ name: "Thầy Nguyễn Công Khanh", image: ASSETS.public.tutors.nguyenCongKhanh }],
    steps: ["Hóa vô cơ lớp 10 – 12", "Hóa hữu cơ lớp 10 – 12", "Ôn thi Hóa học Tốt nghiệp THPT"],
  },
  {
    id: "tin",
    subject: "INFORMATICS",
    icon: "terminal",
    subjectLabel: "Tin học",
    tab: "Tin",
    name: "Tin học THPT",
    summary: "Tin học lớp 10 – 12, lập trình Python.",
    tutors: [{ name: "Cô Lê Thị Hiền", image: ASSETS.public.tutors.leThiHien }],
    steps: ["Tin học 10 – 12 theo chương trình", "Lập trình Python", "Ôn thi Tin học Tốt nghiệp THPT"],
  },
];

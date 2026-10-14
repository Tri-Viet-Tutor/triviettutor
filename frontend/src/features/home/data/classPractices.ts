export interface ClassPractice {
  /** Tên biểu tượng Material Symbols */
  icon: string;
  title: string;
  description: string;
}

/* Bốn ý ở phần "Cách Trí Việt tổ chức lớp học" (bảng phấn). */
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

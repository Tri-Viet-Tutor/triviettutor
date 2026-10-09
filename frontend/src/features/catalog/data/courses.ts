import { ASSETS } from "@/constants/assets";
import type { SchedulePattern, TimeSlot } from "@/types/api";

export interface CourseTutor {
  name: string;
  image: string;
  /** Giới thiệu ngắn — ứng với cột `bio` của bảng tutor_profiles ở backend */
  bio: string;
  /** Mảng chuyên môn hiện thành nhãn trên hồ sơ */
  specialties: string[];
  /**
   * Bằng cấp, số năm đứng lớp, thành tích… — mỗi ý một dòng, hiện ở mục "Hồ sơ" của gia sư.
   * Chỉ ghi thông tin có thật do chính gia sư cung cấp; để trống thì mục này không hiện.
   */
  credentials?: string[];
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
  /**
   * Học phí của khóa (VND). Mức tạm do nhóm đặt trong khi backend chưa có thuộc tính học phí —
   * khi backend trả học phí thì lấy từ API. Để trống thì trang "Mua khóa học" ghi "Báo khi tư vấn" và khóa đó chưa mua được.
   */
  tuitionFee?: number;
  /**
   * Đợt mở đăng ký sắp tới, ngày viết dạng YYYY-MM-DD: `opensOn` là ngày mở đăng ký, `startsOn` là ngày khai giảng.
   * Hạn chốt đăng ký tự tính = khai giảng trừ ENROLLMENT_DEADLINE_DAYS ngày.
   * Ngày tạm do nhóm đặt — backend đã lưu hạn chốt (class_groups.enrollment_deadline) và ngày bắt đầu học
   * (learning_schedules.start_date) nhưng chưa có API công khai; khi có thì lấy từ API.
   */
  enrollment?: { opensOn: string; startsOn: string };
  /**
   * Lịch học của lớp sắp mở: các thứ trong tuần và ca học — đúng hai enum SchedulePattern, TimeSlot của backend.
   * Lịch tạm do nhóm đặt; khi backend trả danh sách lớp thì lấy từ API.
   */
  schedule?: { pattern: SchedulePattern; timeSlot: TimeSlot };
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
      {
        name: "Thầy Hồ Đức Thuận",
        image: ASSETS.public.tutors.hoDucThuan,
        bio: "Dạy Toán 10 – 12, ôn thi Tốt nghiệp THPT và luyện đề ĐGNL phần Toán.",
        specialties: ["Toán 10 – 12", "Ôn thi Tốt nghiệp THPT", "Luyện đề ĐGNL"],
      },
      {
        name: "Thầy Nguyễn Công Chính",
        image: ASSETS.public.tutors.nguyenCongChinh,
        bio: "Chuyên hàm số, cực trị, bài toán thực tế và chiến thuật làm đề trắc nghiệm Toán.",
        specialties: ["Hàm số, cực trị", "Bài toán thực tế", "Trắc nghiệm Toán"],
      },
    ],
    steps: [
      "Toán 10 – 12 theo chương trình",
      "Hàm số, cực trị & bài toán thực tế",
      "Chiến thuật làm đề trắc nghiệm Toán",
      "Luyện đề Tốt nghiệp THPT & ĐGNL phần Toán",
    ],
    tuitionFee: 2_000_000,
    enrollment: { opensOn: "2026-10-01", startsOn: "2026-11-02" },
    schedule: { pattern: "MON_WED_FRI", timeSlot: "SLOT_EVENING" },
  },
  {
    id: "anh",
    subject: "ENGLISH",
    icon: "translate",
    subjectLabel: "Tiếng Anh",
    tab: "Anh",
    name: "Tiếng Anh THPT",
    summary: "Ngữ pháp và luyện đề Tiếng Anh Tốt nghiệp THPT.",
    tutors: [
      {
        name: "Cô Trang Anh",
        image: ASSETS.public.tutors.trangAnh,
        bio: "Tổng ôn ngữ pháp và luyện đề Tiếng Anh Tốt nghiệp THPT.",
        specialties: ["Ngữ pháp", "Luyện đề Tốt nghiệp THPT"],
      },
    ],
    steps: ["Tổng ôn ngữ pháp Tiếng Anh THPT", "Luyện đề Tiếng Anh Tốt nghiệp THPT"],
    tuitionFee: 1_900_000,
    enrollment: { opensOn: "2026-10-05", startsOn: "2026-11-09" },
    schedule: { pattern: "TUE_THU_SAT", timeSlot: "SLOT_EVENING" },
  },
  {
    id: "van",
    subject: "LITERATURE",
    icon: "history_edu",
    subjectLabel: "Ngữ Văn",
    tab: "Văn",
    name: "Ngữ Văn THPT",
    summary: "Nghị luận và ôn thi Ngữ Văn Tốt nghiệp THPT.",
    tutors: [
      {
        name: "Thầy Lương Tạ Kinh Luân",
        image: ASSETS.public.tutors.luongTaKinhLuan,
        bio: "Nghị luận văn học, nghị luận xã hội và ôn thi Ngữ Văn Tốt nghiệp THPT.",
        specialties: ["Nghị luận văn học", "Nghị luận xã hội", "Ôn thi Tốt nghiệp THPT"],
      },
    ],
    steps: ["Nghị luận văn học", "Nghị luận xã hội", "Ôn thi Ngữ Văn Tốt nghiệp THPT"],
    tuitionFee: 1_500_000,
    enrollment: { opensOn: "2026-10-15", startsOn: "2026-11-16" },
    schedule: { pattern: "SAT_SUN", timeSlot: "SLOT_MORNING" },
  },
  {
    id: "hoa",
    subject: "CHEMISTRY",
    icon: "science",
    subjectLabel: "Hóa học",
    tab: "Hóa",
    name: "Hóa học THPT",
    summary: "Hóa lớp 10 – 12 và ôn thi Tốt nghiệp THPT.",
    tutors: [
      {
        name: "Thầy Nguyễn Công Khanh",
        image: ASSETS.public.tutors.nguyenCongKhanh,
        bio: "Hóa vô cơ, hữu cơ lớp 10 – 12 và ôn thi Hóa học Tốt nghiệp THPT.",
        specialties: ["Hóa vô cơ", "Hóa hữu cơ", "Ôn thi Tốt nghiệp THPT"],
      },
    ],
    steps: ["Hóa vô cơ lớp 10 – 12", "Hóa hữu cơ lớp 10 – 12", "Ôn thi Hóa học Tốt nghiệp THPT"],
    tuitionFee: 1_800_000,
    enrollment: { opensOn: "2026-10-01", startsOn: "2026-10-26" },
    schedule: { pattern: "TUE_THU_SAT", timeSlot: "SLOT_LATE_EVENING" },
  },
  {
    id: "tin",
    subject: "INFORMATICS",
    icon: "terminal",
    subjectLabel: "Tin học",
    tab: "Tin",
    name: "Tin học THPT",
    summary: "Tin học lớp 10 – 12, lập trình Python.",
    tutors: [
      {
        name: "Cô Lê Thị Hiền",
        image: ASSETS.public.tutors.leThiHien,
        bio: "Tin học 10 – 12, lập trình Python và ôn thi Tin học Tốt nghiệp THPT.",
        specialties: ["Tin học 10 – 12", "Lập trình Python", "Ôn thi Tốt nghiệp THPT"],
      },
    ],
    steps: ["Tin học 10 – 12 theo chương trình", "Lập trình Python", "Ôn thi Tin học Tốt nghiệp THPT"],
    tuitionFee: 2_000_000,
    enrollment: { opensOn: "2026-10-20", startsOn: "2026-11-23" },
    schedule: { pattern: "SAT_SUN", timeSlot: "SLOT_AFTERNOON" },
  },
];

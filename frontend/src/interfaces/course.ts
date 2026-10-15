import type { SchedulePattern, TimeSlot } from "@/interfaces/api";

/* Kiểu dữ liệu khóa học và các lựa chọn khi xếp lớp. */

/** Một lựa chọn trên phiếu chọn lớp */
export interface ClassOption<T extends string> {
  /** Giá trị enum gửi cho backend */
  value: T;
  /** Chữ hiển thị */
  label: string;
  /** Dòng gợi ý nhỏ bên dưới */
  hint: string;
  /** Tên biểu tượng Material Symbols (tuỳ chọn) */
  icon?: string;
}

/** Gia sư đứng lớp một khóa */
export interface CourseTutor {
  /** Họ tên kèm danh xưng (Thầy / Cô) */
  name: string;
  /** Đường dẫn ảnh chân dung */
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

/** Một khóa học theo môn */
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
  /** Tên khóa */
  name: string;
  /** Mô tả một câu */
  summary: string;
  /** Gia sư đứng lớp (người đầu tiên là ảnh đại diện của môn) */
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

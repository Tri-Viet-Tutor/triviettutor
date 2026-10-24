import type { ReactNode } from "react";
import type { DeliveryMode, GradeLevel, SchedulePattern, TimeSlot } from "@/interfaces/api";
import type { ClassOption, Course } from "@/interfaces/course";

// ── components/catalog ──
/** Props của CatalogHero */
export interface CatalogHeroProps {
  /** Mã môn đang chọn ở phiếu chọn lớp */
  activeSubject: string;
  /** Bấm một bong bóng môn học */
  onPickSubject: (subject: string) => void;
}

/** Props của ClassBuilderSection */
export interface ClassBuilderSectionProps {
  /** Mã môn đang chọn — do trang giữ để phần mở đầu cũng chọn được */
  subject: string;
  /** Đổi môn */
  onSubjectChange: (subject: string) => void;
}

/** Các lựa chọn hiện tại trên phiếu */
export interface ClassSlipProps {
  course: Course;
  grade: ClassOption<GradeLevel>;
  deliveryMode: ClassOption<DeliveryMode>;
  schedulePattern: ClassOption<SchedulePattern>;
  timeSlot: ClassOption<TimeSlot>;
}

/** Props của CourseOutline */
export interface CourseOutlineProps {
  /** Khóa đang chọn */
  course: Course;
}

/** Một nét vẽ trang trí */
export interface CatalogDoodle {
  id: string;
  /** Vị trí góc trên trái, tính theo % của nửa trái phần mở đầu */
  left: number;
  top: number;
  /** Góc nghiêng (độ) */
  tilt: number;
  /** Lệch pha trôi lên xuống (giây) */
  delay: number;
  /** Lớp Tailwind: cỡ chữ / chiều rộng, màu */
  className: string;
  /** Chữ hoặc SVG của nét vẽ */
  content: ReactNode;
}

/** Props của OptionGroup */
export interface OptionGroupProps<T extends string> {
  /** Số thứ tự của mục trên phiếu */
  step: number;
  /** Tiêu đề mục */
  legend: string;
  /** Tên nhóm radio — mỗi nhóm trên trang phải khác nhau */
  name: string;
  options: ClassOption<T>[];
  /** Giá trị đang chọn */
  value: T;
  onChange: (value: T) => void;
  /** Lớp Tailwind chia cột cho các ô lựa chọn */
  columns?: string;
}

/** Props của OptionSelect */
export interface OptionSelectProps<T extends string> {
  /** Số thứ tự của mục trên phiếu */
  step: number;
  /** Tiêu đề mục */
  legend: string;
  /** Dùng làm id và name của ô chọn — mỗi ô trên trang phải khác nhau */
  name: string;
  options: ClassOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Props của SubjectOrbit */
export interface SubjectOrbitProps {
  /** Mã môn đang chọn ở phiếu chọn lớp */
  activeSubject: string;
  /** Bấm một bong bóng môn học */
  onPickSubject: (subject: string) => void;
}

// ── constants/classOptions.ts ──
/** Một tiện ích của lớp học */
export interface ClassPerk {
  /** Tên biểu tượng Material Symbols */
  icon: string;
  title: string;
  description: string;
}

/** Một bước trong quy trình đăng ký */
export interface EnrollmentStep {
  /** Tên biểu tượng Material Symbols */
  icon: string;
  title: string;
  description: string;
}

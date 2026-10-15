import type { Course } from "@/interfaces/course";

/* Kiểu dữ liệu gia sư hiển thị ở các trang công khai. */

/** Một gia sư trên tấm quảng cáo */
export interface Tutor {
  name: string;
  /** Môn phụ trách, ví dụ "Gia sư Toán THPT" */
  role: string;
  /** Đường dẫn ảnh */
  image: string;
  /** Mô tả ảnh */
  alt: string;
}

/** Hồ sơ một gia sư trên trang "Tìm gia sư" */
export interface TutorProfile {
  /** Mã không dấu lấy từ tên, dùng làm key và id phần tử */
  id: string;
  name: string;
  /** Đường dẫn ảnh chân dung */
  image: string;
  /** Giới thiệu ngắn */
  bio: string;
  /** Mảng chuyên môn */
  specialties: string[];
  /** Bằng cấp, kinh nghiệm, thành tích có thật (có thể chưa có) */
  credentials: string[];
  /** Khóa học gia sư đang đứng lớp */
  course: Course;
}

// ── components/tutors ──
/** Props của TutorFinderSection */
export interface TutorFinderSectionProps {
  /** Gia sư khớp với ô tìm và môn đang lọc */
  tutors: TutorProfile[];
  /** Gia sư đang xem hồ sơ */
  selectedId: string;
  onSelect: (tutorId: string) => void;
  /** Tên môn đang lọc để ghi vào dòng kết quả, rỗng = mọi môn */
  subjectLabel: string;
  /** Xóa ô tìm và bộ lọc môn */
  onReset: () => void;
}

/** Props của TutorPhotoFan */
export interface TutorPhotoFanProps {
  /** Ba gia sư đưa lên ảnh, mỗi người một môn */
  tutors: TutorProfile[];
  /** Bấm một ảnh */
  onPickTutor: (tutorId: string) => void;
}

/** Props của TutorProfilePanel */
export interface TutorProfilePanelProps {
  /** Gia sư đang xem */
  tutor: TutorProfile;
  /** Chuyển sang hồ sơ gia sư khác (người cùng dạy khóa) */
  onSelect: (tutorId: string) => void;
}

/** Props của TutorResultList */
export interface TutorResultListProps {
  tutors: TutorProfile[];
  /** Gia sư đang chọn */
  selectedId: string;
  onSelect: (tutorId: string) => void;
}

/** Props của TutorSearchHero */
export interface TutorSearchHeroProps {
  /** Chữ trong ô tìm tên gia sư */
  query: string;
  /** Mã môn đang lọc, rỗng = mọi môn */
  subject: string;
  onQueryChange: (query: string) => void;
  onSubjectChange: (subject: string) => void;
  /** Bấm nút "Tìm" hoặc nhấn Enter */
  onSubmit: () => void;
  /** Ba gia sư trên xấp ảnh */
  featuredTutors: TutorProfile[];
  /** Bấm một ảnh gia sư */
  onPickTutor: (tutorId: string) => void;
}

// ── constants/tutors.ts ──
/** Một điều trung tâm bảo đảm */
export interface TutorAssurance {
  /** Tên biểu tượng Material Symbols */
  icon: string;
  title: string;
  description: string;
}

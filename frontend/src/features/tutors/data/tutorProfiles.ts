import { COURSES, type Course } from "@/features/catalog/data/courses";
import { normalizeText } from "@/utils/text";

export interface TutorProfile {
  /** Mã không dấu lấy từ tên, dùng làm key và id phần tử */
  id: string;
  name: string;
  image: string;
  bio: string;
  specialties: string[];
  /** Bằng cấp, kinh nghiệm, thành tích có thật (có thể chưa có) */
  credentials: string[];
  /** Khóa học gia sư đang đứng lớp */
  course: Course;
}

/*
 * Danh sách gia sư của trang "Tìm gia sư", gom từ gia sư của từng khóa học.
 * Backend hiện lưu gia sư bằng users.full_name và tutor_profiles.bio; gia sư gắn với lớp qua tutor_assignments.
 * Chưa có API công khai trả danh sách gia sư nên tạm lấy từ dữ liệu khóa học — thêm gia sư vào
 * features/catalog/data/courses.ts là trang này tự có.
 */
export const TUTOR_PROFILES: TutorProfile[] = COURSES.flatMap((course) =>
  course.tutors.map((tutor) => ({
    id: normalizeText(tutor.name).replace(/ /g, "-"),
    name: tutor.name,
    image: tutor.image,
    bio: tutor.bio,
    specialties: tutor.specialties,
    credentials: tutor.credentials ?? [],
    course,
  })),
);

export interface TutorAssurance {
  /** Tên biểu tượng Material Symbols */
  icon: string;
  title: string;
  description: string;
}

/*
 * Ba điều trung tâm bảo đảm cho mọi gia sư — hiện trên từng hồ sơ.
 * Hai ý sau ứng với chức năng backend đã có (điểm danh từng buổi; xếp dạy thay / học bù khi gia sư nghỉ).
 */
export const TUTOR_ASSURANCES: TutorAssurance[] = [
  { icon: "how_to_reg", title: "Được tuyển chọn", description: "Phỏng vấn và dạy thử trước khi đứng lớp." },
  { icon: "fact_check", title: "Dạy có ghi nhận", description: "Mỗi buổi đều điểm danh trên hệ thống." },
  { icon: "co_present", title: "Không để trống lớp", description: "Có gia sư dạy thay hoặc học bù khi vắng." },
];

/** Hai dòng tiêu đề ở phần mở đầu */
export const TUTOR_SEARCH_TITLE_LINES = ["Tìm Gia Sư", "Theo Môn Học"];

/** Lọc gia sư theo mã môn (rỗng = mọi môn) và theo chữ gõ vào ô tìm (so không dấu, theo tên gia sư hoặc tên môn). */
export function filterTutors(subject: string, query: string): TutorProfile[] {
  const keyword = normalizeText(query);
  return TUTOR_PROFILES.filter((tutor) => {
    if (subject && tutor.course.subject !== subject) return false;
    if (!keyword) return true;
    return normalizeText(`${tutor.name} ${tutor.course.subjectLabel} ${tutor.course.name}`).includes(keyword);
  });
}

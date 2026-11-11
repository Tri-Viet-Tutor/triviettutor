import { TUTOR_PROFILES } from "@/constants/tutors";
import type { TutorProfile } from "@/interfaces/tutor";
import { normalizeText } from "@/utils/text";

// Hàm lọc gia sư theo môn và ô tìm.

// Lọc gia sư theo mã môn (rỗng = mọi môn) và theo chữ gõ vào ô tìm (so không dấu, theo tên gia sư hoặc tên môn).
export function filterTutors(subject: string, query: string): TutorProfile[] {
  const keyword = normalizeText(query);
  return TUTOR_PROFILES.filter((tutor) => {
    if (subject && tutor.course.subject !== subject) return false;
    if (!keyword) return true;
    return normalizeText(`${tutor.name} ${tutor.course.subjectLabel} ${tutor.course.name}`).includes(keyword);
  });
}

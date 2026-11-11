import { CLASS_SIZE } from "@/constants/classOptions";
import { COURSES } from "@/constants/courses";
import type { TutorProfile, TutorAssurance } from "@/interfaces/tutor";
import type { Faq } from "@/interfaces/ui";
import { normalizeText } from "@/utils/text";

// Danh sách gia sư của trang "Tìm gia sư", gom từ gia sư của từng khóa học.
// Backend hiện lưu gia sư bằng users.full_name và tutor_profiles.bio; gia sư gắn với lớp qua tutor_assignments.
// Chưa có API công khai trả danh sách gia sư nên tạm lấy từ dữ liệu khóa học — thêm gia sư vào
// constants/courses.ts là trang này tự có.
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

// Ba điều trung tâm bảo đảm cho mọi gia sư — hiện trên từng hồ sơ.
// Hai ý sau ứng với chức năng backend đã có (điểm danh từng buổi; xếp dạy thay / học bù khi gia sư nghỉ).
export const TUTOR_ASSURANCES: TutorAssurance[] = [
  { icon: "how_to_reg", title: "Được tuyển chọn", description: "Phỏng vấn và dạy thử trước khi đứng lớp." },
  { icon: "fact_check", title: "Dạy có ghi nhận", description: "Mỗi buổi đều điểm danh trên hệ thống." },
  { icon: "co_present", title: "Không để trống lớp", description: "Có gia sư dạy thay hoặc học bù khi vắng." },
];

// Hai dòng tiêu đề ở phần mở đầu
export const TUTOR_SEARCH_TITLE_LINES = ["Tìm Gia Sư", "Theo Môn Học"];

// Câu hỏi thường gặp ở trang "Tìm gia sư". Mỗi câu trả lời dựa trên một chức năng backend đã có:
// phân công gia sư cho lớp (tutor_assignments), dạy thay / học bù (session_changes),
// đường dẫn phòng học từng buổi (sessions.meeting_url), điểm danh (attendance_records), xin nghỉ (leave_requests).
export const TUTOR_FAQS: Faq[] = [
  {
    question: "Tôi có được chọn gia sư không?",
    answer: "Bạn chọn khóa học và lớp. Sau khi lớp chốt đăng ký, trung tâm phân công gia sư của khóa đó đứng lớp.",
  },
  {
    question: "Gia sư bận thì lớp có nghỉ không?",
    answer: "Trung tâm xếp gia sư khác dạy thay hoặc xếp buổi học bù. Thay đổi hiện ngay trên lịch học của bạn.",
  },
  {
    question: "Một lớp có bao nhiêu học viên?",
    answer: `Mỗi lớp từ ${CLASS_SIZE.min} đến ${CLASS_SIZE.max} học viên, học tại trung tâm hoặc trực tuyến.`,
  },
  {
    question: "Học trực tuyến thì vào lớp bằng cách nào?",
    answer: "Mỗi buổi học trực tuyến có một đường dẫn phòng học riêng do trung tâm gắn vào buổi đó.",
  },
  {
    question: "Làm sao biết học viên đi học đầy đủ?",
    answer: "Gia sư điểm danh sau mỗi buổi: có mặt, đi trễ hoặc vắng. Học viên xem lại được trên tài khoản.",
  },
  {
    question: "Muốn nghỉ một buổi thì làm thế nào?",
    answer: "Gửi đơn xin nghỉ cho buổi đó trên hệ thống, nên báo trước giờ học 24 giờ.",
  },
];

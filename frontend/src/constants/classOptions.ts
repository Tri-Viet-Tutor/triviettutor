import type { DeliveryMode, GradeLevel, SchedulePattern, TimeSlot } from "@/interfaces/api";
import type { ClassOption } from "@/interfaces/course";
import type { ClassPerk, EnrollmentStep } from "@/interfaces/catalog";

/** Mỗi ca trong enum TimeSlot đều dài 2 giờ */
export const SESSION_MINUTES = 120;

/** Trung tâm chỉ phục vụ THPT; frontend và backend cùng nhận lớp 10, 11, 12. */
export const GRADE_OPTIONS: ClassOption<GradeLevel>[] = [
  { value: "GRADE_10", label: "Lớp 10", hint: "Xây nền tảng THPT" },
  { value: "GRADE_11", label: "Lớp 11", hint: "Bứt phá điểm số" },
  { value: "GRADE_12", label: "Lớp 12", hint: "Tổng ôn, luyện thi" },
];

/** Số của các khối đang dạy: ["10", "11", "12"] */
const GRADE_NUMBERS = GRADE_OPTIONS.map((grade) => grade.label.replace("Lớp ", ""));

/** "Lớp 10 - 11 - 12" — liệt kê các khối đang dạy */
export const GRADE_LIST_LABEL = `Lớp ${GRADE_NUMBERS.join(" - ")}`;

/** "Lớp 10 – 12" — khoảng khối đang dạy */
export const GRADE_RANGE_LABEL = `Lớp ${GRADE_NUMBERS[0]} – ${GRADE_NUMBERS[GRADE_NUMBERS.length - 1]}`;

/*
 * Trung tâm bán khóa học theo lớp nhóm (enums.ClassType = GROUP), không mở lớp 1 kèm 1.
 * Backend vẫn có giá trị ONE_ON_ONE nhưng các trang công khai không dùng tới.
 */

/** Sĩ số nhỏ nhất – lớn nhất của một lớp (BR-02.10) */
export const CLASS_SIZE = { min: 2, max: 8 };

/** Hình thức học — OFFLINE là học tại trung tâm, không dạy tại nhà (BR-04.21) */
export const DELIVERY_MODE_OPTIONS: ClassOption<DeliveryMode>[] = [
  { value: "OFFLINE", label: "Tại trung tâm", hint: "Học trực tiếp" },
  { value: "ONLINE", label: "Trực tuyến", hint: "Phòng học qua mạng" },
];

/** enums.SchedulePattern — ba mẫu lịch cố định trong tuần (BR-03.01) */
export const SCHEDULE_PATTERN_OPTIONS: ClassOption<SchedulePattern>[] = [
  { value: "MON_WED_FRI", label: "Thứ 2 – 4 – 6", hint: "3 buổi mỗi tuần" },
  { value: "TUE_THU_SAT", label: "Thứ 3 – 5 – 7", hint: "3 buổi mỗi tuần" },
  { value: "SAT_SUN", label: "Thứ 7 – Chủ nhật", hint: "2 buổi mỗi tuần" },
];

/** enums.TimeSlot — bốn ca học cố định, giờ lấy đúng theo enum của backend */
export const TIME_SLOT_OPTIONS: ClassOption<TimeSlot>[] = [
  { value: "SLOT_MORNING", label: "Sáng", hint: "08:00 – 10:00" },
  { value: "SLOT_AFTERNOON", label: "Chiều", hint: "14:00 – 16:00" },
  { value: "SLOT_EVENING", label: "Tối", hint: "18:00 – 20:00" },
  { value: "SLOT_LATE_EVENING", label: "Tối muộn", hint: "19:30 – 21:30" },
];

/**
 * Những việc học viên làm được trên hệ thống — mỗi mục ứng với một chức năng backend đã có:
 * GET /me/sessions (lịch học), GET /sessions/{id}/attendance (điểm danh: PRESENT, LATE, ABSENT, EXCUSED),
 * POST /sessions/{id}/leave (xin nghỉ; dưới 24 giờ bị tính là báo trễ),
 * và admin xếp MAKEUP / SUBSTITUTE khi gia sư nghỉ.
 * Chưa có mục học phí vì backend chưa có thuộc tính học phí.
 */
export const CLASS_PERKS: ClassPerk[] = [
  { icon: "calendar_month", title: "Lịch học trên tài khoản", description: "Đăng nhập là thấy ngày, giờ và trạng thái từng buổi." },
  { icon: "fact_check", title: "Điểm danh từng buổi", description: "Gia sư ghi có mặt, đi trễ hay vắng sau mỗi buổi." },
  { icon: "event_busy", title: "Xin nghỉ có phép", description: "Gửi đơn trên hệ thống, nên báo trước buổi học 24 giờ." },
  { icon: "co_present", title: "Gia sư bận vẫn có lớp", description: "Trung tâm xếp gia sư dạy thay hoặc buổi học bù." },
];

/** Hạn chốt đăng ký: trước ngày khai giảng bấy nhiêu ngày (BR-02.20) */
export const ENROLLMENT_DEADLINE_DAYS = 3;

/** Các bước từ lúc chọn lớp tới ngày khai giảng (vòng đời lớp: ENROLLING → ASSIGNED → IN_PROGRESS) */
export const ENROLLMENT_STEPS: EnrollmentStep[] = [
  { icon: "fact_check", title: "Chọn lớp", description: "Chọn môn, khối lớp, lịch và ca học đang mở đăng ký." },
  { icon: "payments", title: "Đăng ký", description: "Đóng học phí trọn khóa để giữ chỗ trong lớp." },
  {
    icon: "event_busy",
    title: "Chốt đăng ký",
    description: `Trước khai giảng ${ENROLLMENT_DEADLINE_DAYS} ngày. Lớp nhóm cần từ 2 học viên.`,
  },
  { icon: "how_to_reg", title: "Phân công gia sư", description: "Trung tâm xếp gia sư không trùng lịch dạy lớp khác." },
  { icon: "school", title: "Khai giảng", description: "Lịch từng buổi hiện trong tài khoản học viên." },
];

import { ASSETS } from "@/constants/assets";
import type { Course } from "@/interfaces/course";
import { addDays, startOfToday, startOfWeek, toIsoDate } from "@/utils/date";

// Danh sách khóa học (dữ liệu tạm chờ khi backend có API danh mục).

// Mở đăng ký trước ngày khai giảng bấy nhiêu ngày
const ENROLLMENT_LEAD_DAYS = 30;

// Mốc tuyển sinh dự kiến của một môn, tính từ hôm nay thay vì ghi cứng ngày.
// Khai giảng rơi vào thứ Hai, sớm nhất là sau hai tuần nữa, mỗi môn lệch nhau `weekOffset` tuần
// để các môn không cùng khai giảng một ngày. Nhờ vậy trang công khai không bao giờ
// quảng cáo một ngày khai giảng đã trôi qua.
function upcomingEnrollment(weekOffset: number): { opensOn: string; startsOn: string } {
  const starts = startOfWeek(addDays(startOfToday(), 14 + weekOffset * 7 + 6));
  return { opensOn: toIsoDate(addDays(starts, -ENROLLMENT_LEAD_DAYS)), startsOn: toIsoDate(starts) };
}

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
    enrollment: upcomingEnrollment(0),
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
    enrollment: upcomingEnrollment(1),
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
    enrollment: upcomingEnrollment(2),
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
    enrollment: upcomingEnrollment(3),
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
    enrollment: upcomingEnrollment(4),
    schedule: { pattern: "SAT_SUN", timeSlot: "SLOT_AFTERNOON" },
  },
];

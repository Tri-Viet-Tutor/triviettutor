const ROOT = "/assets";

const COMMON = `${ROOT}/common`;
const PUBLIC = `${ROOT}/public`;

// Bảng đường dẫn ảnh — luôn lấy ảnh qua đây thay vì viết tay chuỗi đường dẫn.
export const ASSETS = {
  common: {
    logo: `${COMMON}/brand/logo-sba.png`,
    mascots: {
      default: `${COMMON}/mascots/mascot-default.png`,
      gamified: `${COMMON}/mascots/mascot-gamified.png`,
      pencil: `${COMMON}/mascots/mascot-pencil.png`,
    },
  },

  public: {
    // Ảnh lớp học — tự chuyển ở phần mở đầu trang chủ
    classrooms: {
      classroom1: `${PUBLIC}/classrooms/classroom-1.png`,
      classroom2: `${PUBLIC}/classrooms/classroom-2.jpg`,
      classroom3: `${PUBLIC}/classrooms/classroom-3.png`,
      // Hai banner về giảng viên (chưa trang nào dùng)
      classroom4: `${PUBLIC}/classrooms/classroom-4.png`,
      classroom5: `${PUBLIC}/classrooms/classroom-5.png`,
    },
    // Ảnh giảng viên (tên file: ten-thay-co-mon.png)
    tutors: {
      hoDucThuan: `${PUBLIC}/tutors/ho-duc-thuan-toan.png`,
      nguyenCongChinh: `${PUBLIC}/tutors/nguyen-cong-chinh-toan.png`,
      trangAnh: `${PUBLIC}/tutors/trang-anh-tieng-anh.png`,
      luongTaKinhLuan: `${PUBLIC}/tutors/luong-ta-kinh-luan-ngu-van.png`,
      nguyenCongKhanh: `${PUBLIC}/tutors/nguyen-cong-khanh-hoa.png`,
      leThiHien: `${PUBLIC}/tutors/le-thi-hien-tin-hoc.png`,
    },
    // Ảnh thành tích học viên
    achievements: {
      achievement1: `${PUBLIC}/achievements/achievement-1.png`,
    },
    students: {
      primary: `${PUBLIC}/students/primary-students.png`,
      highSchool: `${PUBLIC}/students/high-school-students.png`,
      highSchoolStudying: `${PUBLIC}/students/high-school-studying.png`,
      smiling: `${PUBLIC}/students/student-smiling.png`,
    },
    tutoring: {
      oneOnOne: `${PUBLIC}/tutoring/tutoring-one-on-one.png`,
      online: `${PUBLIC}/tutoring/tutoring-online.png`,
      inspiring: `${PUBLIC}/tutoring/tutoring-inspiring.png`,
    },
    contact: {
      mapMockup: `${PUBLIC}/contact/map-mockup.png`,
    },
  },

  // Chưa có ảnh riêng — thêm vào khi làm giao diện từng khu vực
  auth: {},
  admin: {},
  tutor: {},
  student: {},
} as const;

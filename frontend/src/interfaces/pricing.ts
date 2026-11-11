import type { CourseResponse, DeliveryMode, GradeLevel, SchedulePattern, TuitionClass } from "@/interfaces/dto";
import type { PurchasableCourse } from "@/interfaces/checkout";
import type { Course } from "@/interfaces/course";

// Kiểu dữ liệu của trang "Mua khóa học": đợt đăng ký, bộ lọc, sắp xếp.

// Trạng thái đợt đăng ký: sắp mở, đang mở, đã chốt, đã khai giảng
export type EnrollmentStatus = "UPCOMING" | "OPEN" | "CLOSED" | "STARTED";

// Một đợt mở đăng ký của khóa học
export interface EnrollmentWindow {
  course: Course;
  // Ngày mở đăng ký
  opens: Date;
  // Hạn chốt đăng ký = khai giảng trừ ENROLLMENT_DEADLINE_DAYS ngày
  deadline: Date;
  // Ngày khai giảng
  starts: Date;
}

// Lọc theo đợt đăng ký
export type EnrollmentFilter = "ALL" | "OPEN" | "UPCOMING";

// Cách sắp xếp danh sách khóa
export type ShopSort = "DEFAULT" | "FEE_ASC" | "FEE_DESC" | "START_ASC";

// Toàn bộ trạng thái ô tìm + bộ lọc
export interface ShopFilters {
  // Chữ gõ ở ô tìm: so không dấu với tên khóa, tên môn, tên gia sư và lộ trình
  query: string;
  // Mã môn, rỗng = mọi môn
  subject: string;
  // Đợt đăng ký
  enrollment: EnrollmentFilter;
  // Các thứ học trong tuần, rỗng = ngày nào cũng được
  schedule: SchedulePattern | "";
  // Học phí tối đa (VND)
  maxFee: number;
}

// Bộ lọc danh sách lớp đang mở (CourseShopSection)
export interface ClassShopFilters {
  query: string;
  subject: string;
  grade: GradeLevel | "";
  mode: DeliveryMode | "";
  schedule: SchedulePattern | "";
  // Id gia sư phụ trách (dạng chuỗi của ô chọn); rỗng = mọi gia sư
  tutor: string;
}

// Cách sắp xếp danh sách lớp đang mở
export type ClassShopSort = "DEFAULT" | "START_ASC" | "FEE_ASC" | "FEE_DESC";

// Props của ClassTicket
export interface ClassTicketProps {
  item: TuitionClass;
  // Vị trí trong danh sách, để chọn màu cuống vé
  index: number;
  // Tài khoản hiện tại được đăng ký lớp không (chỉ học viên)
  canBuy: boolean;
  onBuy: () => void;
  // Thêm môn của lớp vào giỏ hàng (chọn lớp cụ thể lúc thanh toán giỏ)
  onAddToCart?: () => void;
  // Môn của lớp đã có trong giỏ
  inCart?: boolean;
  adding?: boolean;
  surfaceClassName?: string;
}

// ── components/pricing ──
// Props của CourseOfferList
export interface CourseOfferListProps {
  // Lớp đang mở sau khi áp bộ lọc và sắp xếp của CourseShopSection
  classes: TuitionClass[];
  // Danh sách lớp còn đang tải (chưa biết khóa nào đang tuyển sinh)
  classesLoading?: boolean;
  filters: ClassShopFilters;
  // Tài khoản hiện tại được đăng ký lớp không (chỉ học viên)
  canBuy: boolean;
  onBuy: (item: TuitionClass) => void;
  // Thêm môn vào giỏ hàng (giỏ giữ theo môn, chọn lớp lúc thanh toán giỏ)
  onAddToCart?: (subjectId: number, item?: TuitionClass, course?: CourseResponse) => void;
  // Mã môn (subject code) đã có trong giỏ
  cartSubjects?: Set<string>;
  // Khóa (cartCourseKey) đúng là khóa học viên đã thêm vào giỏ — giỏ giữ theo môn nên các khóa cùng môn không tính
  isCourseInCart?: (courseKey: string) => boolean;
  // Lớp đúng là lớp học viên đã thêm vào giỏ
  isClassInCart?: (item: TuitionClass) => boolean;
  // Id môn đang được thêm vào giỏ
  addingSubjectId?: number;
  surfaceClassName?: string;
  // Bấm "Xóa bộ lọc" khi không có khóa phù hợp
  onResetFilters: () => void;
}

// Props của CartBar
export interface CartBarProps {
  // Các khóa trong giỏ
  courses: PurchasableCourse[];
  // Bấm "Bỏ hết"
  onClear: () => void;
  // Trang thanh toán sẽ mở. Mặc định là trang thanh toán công khai
  checkoutTo?: string;
  // Đang nằm trong khu học viên: né thanh điều hướng bên trái (máy tính) và thanh dưới đáy (điện thoại)
  inStudentArea?: boolean;
}

// Props của CourseShopSection
export interface CourseShopSectionProps {
  // "public": trang công khai - "student": nhúng trong khu học viên
  variant?: "public" | "student";
}

// Props của CourseTicket
export interface CourseTicketProps {
  detailTo: string;
  course: Course;
  // Khóa đã nằm trong giỏ
  inCart: boolean;
  // Hôm nay (bỏ giờ phút), để tính trạng thái đợt đăng ký
  today: Date;
  // Thêm vào / bỏ khỏi giỏ
  onToggleCart: () => void;
  // Bấm "Mua ngay": thêm vào giỏ rồi sang trang thanh toán
  onBuyNow: () => void;
  // Lớp màu nền của trang chứa vé, để lỗ khuyết trông như bị bấm thủng. Mặc định là nền giấy của trang công khai
  surfaceClassName?: string;
}

// Props của PricingHero
export interface PricingHeroProps {
  // Bấm "Chọn khóa học": cuộn xuống danh sách khóa
  onViewFees: () => void;
}

// Props của ShopFilterPanel
export interface ShopFilterPanelProps {
  // Mã môn, rỗng = mọi môn
  subject: string;
  // Đợt đăng ký
  enrollment: EnrollmentFilter;
  // Các thứ học trong tuần; rỗng = thứ nào cũng được
  schedule: SchedulePattern | "";
  // Học phí tối đa (VND)
  maxFee: number;
  onSubjectChange: (value: string) => void;
  onEnrollmentChange: (value: EnrollmentFilter) => void;
  onScheduleChange: (value: SchedulePattern | "") => void;
  onMaxFeeChange: (value: number) => void;
  // Có bộ lọc nào đang bật không
  canReset: boolean;
  // Xóa hết bộ lọc
  onReset: () => void;
}

// ── constants/pricing.ts ──
// Một ảnh khung vòm ở phần "Học tại trung tâm hoặc trực tuyến"
export interface LearningPhoto {
  src: string;
  alt: string;
  // Tên biểu tượng Material Symbols trên nhãn
  icon: string;
  // Chữ trên nhãn
  label: string;
  // Lớp Tailwind chọn phần ảnh giữ lại khi cắt theo khung vòm
  focus: string;
}

// ── stores/cartStore.ts ──
export interface CartState {
  // Mã môn (Course.subject) của các khóa đang nằm trong giỏ
  subjects: string[];
  // Thêm khóa vào giỏ (đã có thì giữ nguyên)
  add: (subject: string) => void;
  // Thêm khóa vào giỏ, hoặc bỏ ra nếu đã có
  toggle: (subject: string) => void;
  // Bỏ một khóa khỏi giỏ
  remove: (subject: string) => void;
  // Làm trống giỏ
  clear: () => void;
}

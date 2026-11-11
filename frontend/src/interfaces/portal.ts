import type { ReactNode } from "react";
import type {
  AttendanceRecordResponse,
  SessionResponse,
  AttendanceStatus,
  LeaveRequestResponse,
  MeResponse,
  AvailabilityResponse,
} from "@/interfaces/api";
import type { PortalNavItem, SummaryRow, Tone } from "@/interfaces/ui";

/* Kiểu dữ liệu dùng chung của ba khu sau đăng nhập. */

/** Một buổi đã học kèm bản ghi điểm danh của tôi */
export interface RecentAttendanceItem {
  session: SessionResponse;
  /** Bản ghi điểm danh của tôi; undefined khi chưa điểm danh hoặc chưa tải xong */
  record?: AttendanceRecordResponse;
  /** Đang tải điểm danh của buổi này */
  isPending: boolean;
}

// ── components/dashboard ──
/** Ba dáng của chú kiến */
export type AntVariant = "leaf" | "pen" | "book";

/** Props của AntMascot */
export interface AntMascotProps {
  /**
   * Ba dáng của chú kiến, mỗi dáng một nét mặt:
   * "leaf" cười tươi, che chiếc lá làm ô và vẫy tay - "pen" nháy mắt, ôm cây bút chì to -
   * "book" cười tít mắt, hai tay nâng quyển sách mở.
   */
  variant?: AntVariant;
  className?: string;
}

/** Lựa chọn đang nhập của một học viên; status rỗng là chưa chọn */
export interface AttendanceDraft {
  status: AttendanceStatus | "";
  note: string;
}

/** Props của AttendanceEditor */
export interface AttendanceEditorProps {
  sessionId: number;
  /** Buổi còn ghi được (đã bắt đầu, chưa hoàn tất, chưa quá hạn của người đang ghi) */
  editable: boolean;
  /** Câu giải thích vì sao không ghi được, hiện khi `editable` là false */
  readOnlyNote?: string;
  /** Quản trị ghi điểm danh: có thêm ô lý do và ô xác nhận buổi đã được dạy */
  asAdmin?: boolean;
  /** Tra họ tên học viên theo mã (khu quản trị có); không có thì chỉ hiện mã */
  nameOf?: (studentId: number) => string | undefined;
}

/** Một thẻ lọc */
export interface FilterTab<T extends string> {
  value: T;
  label: string;
  /** Con số hiện cạnh nhãn (tuỳ chọn) */
  count?: number;
}

/** Props của FilterTabs */
export interface FilterTabsProps<T extends string> {
  /** Tên nhóm thẻ, đọc cho trình đọc màn hình */
  label: string;
  tabs: FilterTab<T>[];
  /** Thẻ đang chọn */
  value: T;
  onChange: (value: T) => void;
}

/** Props của LeaveCenter */
export interface LeaveCenterProps {
  /** Học viên xin nghỉ học, gia sư xin nghỉ dạy */
  role: "student" | "tutor";
  /** Trang lịch của khu, để dẫn tới buổi thay thế */
  scheduleTo: string;
  /** Lọc thêm các buổi được phép xin nghỉ (gia sư: chỉ buổi mình dạy) */
  isEligible?: (session: SessionResponse) => boolean;
}

/** Props của LeavePreview */
export interface LeavePreviewProps {
  /** Các đơn mới nhất; undefined khi chưa tải xong */
  requests: LeaveRequestResponse[] | undefined;
  /** Tải đơn bị lỗi */
  isError: boolean;
  /** Các buổi của tôi, để ghi ngày giờ cho từng đơn */
  sessions: SessionResponse[];
  /** Trang xin nghỉ và trang lịch của khu */
  leaveTo: string;
  scheduleTo: string;
}

/** Props của LeaveRequestCard */
export interface LeaveRequestCardProps {
  /** Đơn xin nghỉ */
  request: LeaveRequestResponse;
  /** Buổi học của đơn, nếu còn trong lịch của tôi */
  session?: SessionResponse;
  /** Bản gọn cho trang Tổng quan: bỏ lý do và các dòng phụ */
  compact?: boolean;
  /** Trang lịch của khu, để dẫn tới buổi thay thế */
  scheduleTo: string;
}

/** Props của LeaveRequestForm */
export interface LeaveRequestFormProps {
  /** Các buổi còn xin nghỉ được (chưa bắt đầu, chưa hủy, chưa có đơn đang chờ), gần nhất trước */
  sessions: SessionResponse[];
  /** Buổi chọn sẵn (mở từ nút "Xin nghỉ buổi này") */
  initialSessionId?: number;
  /** Thời điểm hiện tại — để cảnh báo báo trễ */
  now: Date;
  /** Gia sư xin nghỉ dạy thì chữ trên form khác đôi chút */
  role?: "student" | "tutor";
}

/** Props của Pager */
export interface PagerProps {
  /** Trang hiện tại, tính từ 0 */
  page: number;
  /** Tổng số trang */
  totalPages: number;
  /** Chuyển sang trang khác */
  onChange: (page: number) => void;
  /** Tên vùng phân trang, đọc cho trình đọc màn hình */
  label: string;
}

/** Props của PortalGreeting */
export interface PortalGreetingProps {
  /** Họ tên đầy đủ (để lấy chữ cái đại diện) và tên gọi thân mật */
  fullName: string;
  /** Tên gọi trong lời chào */
  name: string;
  /** Dòng phụ dưới lời chào, ví dụ ngày hôm nay */
  description: string;
  /** Vài con số nổi bật đặt bên phải lời chào */
  stats?: { label: string; value: string; icon: string }[];
}

/** Props của PortalNav */
export interface PortalNavProps {
  /** Các trang của khu; thanh dưới ở điện thoại chỉ vừa 5 mục, mục thừa đánh dấu `desktopOnly` */
  items: PortalNavItem[];
  /** Tên khu, đọc cho trình đọc màn hình và hiện trên thanh bên */
  label: string;
  /** Trang tổng quan của khu (bấm logo) */
  homeTo: string;
}

/** Props của AccountMenu */
export interface AccountMenuProps {
  /** Id người dùng để hiện ảnh đại diện */
  userId?: number;
  fullName: string;
  /** Tên vai trò, ví dụ "Quản trị viên" */
  roleName: string;
  email?: string;
  /** Trang hồ sơ của khu */
  profileTo: string;
  onLogout: () => void;
}

/** Props của PortalPageHeader */
export interface PortalPageHeaderProps {
  /** Tiêu đề trang */
  title: string;
  /** Dòng phụ dưới tiêu đề */
  description?: string;
  /** Phần nằm bên phải tiêu đề (bộ lọc, nút…) */
  action?: ReactNode;
  /** Biểu tượng Material Symbols đặt trước tiêu đề */
  icon?: string;
}

/** Props của PortalLoading */
export interface PortalLoadingProps {
  /** Câu đọc cho trình đọc màn hình */
  label: string;
  /** Số dòng giữ chỗ */
  rows?: number;
}

/** Props của PortalError */
export interface PortalErrorProps {
  /** Câu báo lỗi */
  message: string;
  /** Tải lại */
  onRetry: () => void;
}

/** Props của PortalEmpty */
export interface PortalEmptyProps {
  /** Tên biểu tượng Material Symbols */
  icon: string;
  /** Câu chính */
  title: string;
  /** Câu giải thích thêm */
  description?: string;
  /** Nút hoặc liên kết gợi ý việc làm tiếp */
  action?: ReactNode;
}

/** Giá trị form trong ProfileForm — kiểm tra bằng `profileSchema` */
export interface ProfileFormValues {
  fullName: string;
  phone: string;
  address: string;
  bio: string;
}

/** Props của ProfileForm */
export interface ProfileFormProps {
  /** Hồ sơ hiện tại */
  me: MeResponse;
}

/** Props của SessionRow */
export interface SessionRowProps {
  session: SessionResponse;
  /** Đang mở phần chi tiết */
  open: boolean;
  /** Bấm vào dòng để mở / đóng */
  onToggle: () => void;
  /** Buổi đã có đơn xin nghỉ chờ duyệt */
  hasPendingLeave: boolean;
  /** Nhãn phụ bên phải, ví dụ "Cần điểm danh" (tuỳ chọn) */
  badge?: ReactNode;
  /** Phần chi tiết hiện khi mở dòng — mỗi khu có phần chi tiết riêng */
  children: ReactNode;
}

/** Hai thẻ: sắp tới / đã qua */
export type ScheduleTab = "upcoming" | "past";

/** Props của SessionSchedule */
export interface SessionScheduleProps {
  /** Tiêu đề trang: "Lịch học" hoặc "Lịch dạy" */
  title: string;
  /** Thời điểm hiện tại */
  now: Date;
  /** Câu báo khi chưa có buổi nào, và nút gợi ý kèm theo */
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
  /** Phần chi tiết của một buổi (mỗi khu một kiểu) */
  renderDetail: (session: SessionResponse, hasPendingLeave: boolean) => ReactNode;
  /** Nhãn phụ trên dòng của một buổi (tuỳ chọn) */
  renderBadge?: (session: SessionResponse) => ReactNode;
  /** Chỉ hiện buổi của lớp này (dùng cho tầng "Danh sách buổi học" của một lớp cụ thể) */
  classGroupId?: number;
  /** Nội dung phụ cạnh tiêu đề, ví dụ nút "Lớp học" để quay lại danh sách lớp */
  headerExtra?: ReactNode;
}

/** Props của StatusChip */
export interface StatusChipProps {
  /** Tông màu */
  tone: Tone;
  /** Tên biểu tượng Material Symbols (tuỳ chọn) */
  icon?: string;
  children: ReactNode;
}

/** Props của SummaryCard */
export interface SummaryCardProps {
  /** id của tiêu đề (gắn aria-labelledby) */
  id: string;
  title: string;
  /** Liên kết nhỏ bên phải tiêu đề */
  linkLabel?: string;
  linkTo?: string;
  /** Phần nằm trên các dòng tổng kết (tuỳ chọn) */
  children?: ReactNode;
  /** Tiêu đề nhỏ phía trên các dòng */
  rowsTitle?: string;
  rows: SummaryRow[];
}

/** Props của TodayPanel */
export interface TodayPanelProps {
  /** Học viên xem buổi học, gia sư xem buổi dạy — chữ trên bảng đổi theo */
  role: "student" | "tutor";
  /** Buổi kế tiếp; không có thì bảng báo chưa có lịch */
  session?: SessionResponse;
  /** Thời điểm hiện tại */
  now: Date;
  /** Tên gọi thân mật của người xem, để chú kiến gọi */
  name: string;
  /** Trang lịch và trang xin nghỉ của khu */
  scheduleTo: string;
  leaveTo: string;
  /** Nút gợi ý khi không có buổi nào (ví dụ "Mua khóa học" của học viên) */
  emptyAction?: ReactNode;
  /** Buổi này đã có đơn xin nghỉ đang chờ duyệt */
  hasPendingLeave: boolean;
  /** Đã từng có buổi nào chưa (để chọn câu khi không có buổi kế tiếp) */
  hasAnySession: boolean;
}

/** Props của UpcomingList */
export interface UpcomingListProps {
  /** Tiêu đề khung */
  title: string;
  /** Các buổi sẽ hiện, đã xếp gần nhất trước */
  sessions: SessionResponse[];
  /** Hôm nay (0 giờ) — để ghi "Hôm nay", "Ngày mai" */
  today: Date;
  /** Trang lịch của khu */
  scheduleTo: string;
  /** Câu báo khi danh sách trống */
  emptyText: string;
}

/** Props của WeekStrip */
export interface WeekStripProps {
  /** Các buổi của tôi */
  sessions: SessionResponse[];
  /** Hôm nay (0 giờ) */
  today: Date;
  /** Trang lịch của khu (học viên: Lịch học, gia sư: Lịch dạy) */
  scheduleTo: string;
}

// ── components/student ──
/** Props của ClassProgressList */
export interface ClassProgressListProps {
  /** Mọi buổi học của tôi */
  sessions: SessionResponse[];
}

/** Props của LearningSummary */
export interface LearningSummaryProps {
  /** Mọi buổi học của tôi */
  sessions: SessionResponse[];
  /** Số buổi chưa học (không tính buổi đã hủy) */
  upcomingCount: number;
  /** Điểm danh các buổi gần nhất (useRecentAttendance) */
  attendance: RecentAttendanceItem[];
  /** Tổng số đơn xin nghỉ đã gửi; undefined khi chưa tải xong */
  leaveTotal?: number;
}

/** Props của RecentAttendance */
export interface RecentAttendanceProps {
  /** Điểm danh các buổi đã học gần nhất (useRecentAttendance), mới nhất trước */
  items: RecentAttendanceItem[];
}

/** Props của SessionDetail */
export interface SessionDetailProps {
  session: SessionResponse;
  /** Thời điểm hiện tại */
  now: Date;
  /** Buổi này đã có đơn xin nghỉ đang chờ duyệt */
  hasPendingLeave: boolean;
}

// ── components/tutor ──
/** Props của AvailabilityEditor */
export interface AvailabilityEditorProps {
  /** Lịch rảnh đang lưu trên máy chủ */
  saved: AvailabilityResponse[];
  /** Khóa cache của lịch rảnh, để cập nhật sau khi lưu */
  queryKey: readonly unknown[];
}

/** Props của TutorSessionDetail */
export interface TutorSessionDetailProps {
  session: SessionResponse;
  /** Thời điểm hiện tại */
  now: Date;
  /** Mã của gia sư đang xem */
  tutorId: number | undefined;
  /** Buổi này đã có đơn xin nghỉ đang chờ duyệt của tôi */
  hasPendingLeave: boolean;
}

// ── layouts/PortalLayout.tsx ──
/** Props của PortalLayout */
export interface PortalLayoutProps {
  /** Tên khu: "Khu học viên", "Khu gia sư", "Khu quản trị" */
  areaLabel: string;
  /** Trang gốc của khu (bấm logo thì về đây) */
  homeTo: string;
  /** Trang hồ sơ của khu (bấm tên tài khoản thì tới đây) */
  profileTo: string;
  /** Các mục trên thanh điều hướng của khu */
  navItems: PortalNavItem[];
}

// ── utils/sessions.ts ──
/** Tiến độ một lớp */
export interface ClassProgress {
  classGroupId: number;
  /** Số buổi đã học xong */
  completed: number;
  /** Tổng số buổi của lớp, không tính buổi đã hủy */
  total: number;
}

/** Props của StatTile — ô số liệu nhỏ ở đầu các trang quản lý */
export interface StatTileProps {
  label: string;
  value: string;
  /** Biểu tượng Material Symbols */
  icon: string;
  /** Màu điểm nhấn của ô */
  tone?: "navy" | "orange" | "green" | "red";
  /** Dòng phụ nhỏ dưới con số */
  hint?: string;
}

/** Props của PortalDialog */
export interface PortalDialogProps {
  open: boolean;
  title: string;
  /** Dòng mô tả dưới tiêu đề */
  description?: string;
  /** Đóng hộp thoại (bấm nút đóng, phím Esc hoặc nền mờ) */
  onClose: () => void;
  children: ReactNode;
  /** Bề rộng tối đa, mặc định 560px */
  widthClassName?: string;
}

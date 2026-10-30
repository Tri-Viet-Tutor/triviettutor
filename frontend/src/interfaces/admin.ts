import type { ReactNode } from "react";
import type { UseFormRegister } from "react-hook-form";
import type {
  AdminClassResponse,
  AdminUserResponse,
  CourseResponse,
  LeaveRequestResponse,
  SessionResponse,
  SessionStatus,
  TuitionPayment,
} from "@/interfaces/api";

export interface ClassSummary {
  classId: number;
  tutorId: number | null;
  //Buổi kế tiếp và số buổi sắp tới của lớp
  nextSession: SessionResponse;
  upcomingCount: number;
  /** Thông tin lớp (GET /admin/classes): tên khóa, lịch, sĩ số… */
  info?: AdminClassResponse;
}

/** Một ô trong bảng "Việc cần xử lý" */
export interface TodoTile {
  /** Trang xử lý khi bấm vào ô */
  to: string;
  /** Tên biểu tượng Material Symbols */
  icon: string;
  label: string;
  /** Số việc; undefined khi chưa tải xong */
  count: number | undefined;
  /** Việc cần xử lý (tô cam khi còn việc) hay chỉ là số liệu để xem */
  actionable: boolean;
}

/** Giá trị bộ lọc buổi học (giữ dạng chuỗi để gắn thẳng vào ô nhập) */
export interface SessionFilterValues {
  /** Ngày dạng yyyy-MM-dd; chuỗi rỗng là không giới hạn */
  from: string;
  to: string;
  /** Trạng thái buổi; chuỗi rỗng là tất cả */
  status: SessionStatus | "";
  /** Mã lớp và mã gia sư ở dạng chữ; chuỗi rỗng là không lọc */
  classId: string;
  tutorId: string;
}

// ── components/admin ──
/** Props của AdminAttendancePanel */
export interface AdminAttendancePanelProps {
  session: SessionResponse;
  now: Date;
  /** Tra họ tên học viên theo mã */
  nameOf: (studentId: number) => string | undefined;
}

//Cách xử lý đang mở form: học bù, dạy thay, hủy buổi, từ chối
export type LeaveCardAction = "makeup" | "substitute" | "cancel" | "reject" | "excuse";

/** Props của AdminLeaveCard */
export interface AdminLeaveCardProps {
  request: LeaveRequestResponse;
}

/** Props của AdminSessionDetail */
export interface AdminSessionDetailProps {
  session: SessionResponse;
  /** Thời điểm hiện tại */
  now: Date;
}

/** Props của AdminTodoPanel */
export interface AdminTodoPanelProps {
  /** Tên gọi của quản trị viên, dùng trong câu nói của chú kiến */
  name: string;
  /** Các ô việc */
  tiles: TodoTile[];
}

/** Props của AssignmentPanel */
export interface AssignmentPanelProps {
  /** Mã lớp đang phân công */
  classId: number;
  /** Gia sư chính hiện tại của lớp (lấy từ các buổi sắp tới); null nếu lớp chưa có gia sư */
  currentTutorId: number | null;
  /** Thông tin lớp để hiện phần đầu (tên khóa, lịch, sĩ số) */
  info?: AdminClassResponse;
}

/** Props của ClassPicker */
export interface ClassPickerProps {
  classes: ClassSummary[];
  /** Lớp đang chọn */
  selectedId: number | null;
  /** Tên gia sư theo mã (không biết tên thì trả undefined) */
  nameOf: (userId: number) => string | undefined;
  onSelect: (classId: number) => void;
}

/** Props của PendingLeaveList */
export interface PendingLeaveListProps {
  /** Các đơn đang chờ, mới nhất trước; undefined khi chưa tải xong */
  requests: LeaveRequestResponse[] | undefined;
  /** Tải danh sách bị lỗi */
  isError: boolean;
}

/** Props của ReasonForm */
export interface ReasonFormProps {
  /** Mã riêng để gắn nhãn với ô nhập */
  id: string;
  /** Nhãn của ô lý do */
  label: string;
  /** Chữ trên nút gửi */
  submitLabel: string;
  /** Đang gửi — khóa các nút */
  isPending: boolean;
  /** Lỗi của lần gửi gần nhất (nếu có) */
  error: unknown;
  /** Câu báo khi backend không trả mã lỗi quen thuộc */
  errorFallback: string;
  /** Gửi lý do (đã bỏ khoảng trắng hai đầu) */
  onSubmit: (reason: string) => void;
  /** Bấm "Thôi" */
  onCancel: () => void;
  /** Các ô nhập khác đặt trước ô lý do; `canSubmit` cho biết các ô đó đã hợp lệ chưa */
  children?: ReactNode;
  canSubmit?: boolean;
  /** Nút gửi màu đỏ cho thao tác khó hoàn lại (hủy buổi, từ chối) */
  danger?: boolean;
}

/** Props của SessionFilters */
export interface SessionFiltersProps {
  values: SessionFilterValues;
  /** Danh sách gia sư cho ô chọn */
  tutors: AdminUserResponse[];
  /** Đổi một phần bộ lọc */
  onChange: (patch: Partial<SessionFilterValues>) => void;
  /** Xóa hết bộ lọc */
  onReset: () => void;
}

/** Giá trị form tạo gia sư trong TutorForms (gồm các ô hồ sơ) — kiểm tra bằng `createSchema` */
export interface CreateTutorFormValues extends TutorProfileFormValues {
  fullName: string;
  email: string;
  password: string;
}

/** Giá trị form sửa hồ sơ gia sư trong TutorForms — kiểm tra bằng `profileSchema` */
export interface TutorProfileFormValues {
  baseSalary: string;
  sessionRate: string;
  bio: string;
}

/** Props của CompensationFields */
export interface CompensationFieldsProps {
  /** Tiền tố id để không trùng khi có nhiều form trên trang */
  idPrefix: string;
  register: UseFormRegister<TutorProfileFormValues>;
  errors: Partial<Record<keyof TutorProfileFormValues, { message?: string }>>;
}

/** Props của CreateTutorForm */
export interface CreateTutorFormProps {
  /** Đóng form */
  onClose: () => void;
}

/** Props của TutorProfileForm */
export interface TutorProfileFormProps {
  /** Gia sư đang sửa */
  tutor: AdminUserResponse;
  /** Đóng form */
  onClose: () => void;
}

/** Props của UserList */
export interface UserListProps {
  users: AdminUserResponse[];
}

// ── pages/admin/AdminPaymentsPage.tsx ──
/** Props của PaymentCard (một giao dịch trong trang Thanh toán) */
export interface PaymentCardProps {
  payment: TuitionPayment;
  /** Gọi lại sau khi hoàn tiền / đối soát để tải lại danh sách */
  onUpdated: () => void;
}

// ── Khóa học, lớp học, bảng lương (pages/admin/AdminCoursesPage, AdminClassesPage, AdminPayrollPage) ──

/** Props của CourseFormDialog */
export interface CourseFormDialogProps {
  open: boolean;
  /** Khóa đang sửa; null là tạo mới */
  course: CourseResponse | null;
  onClose: () => void;
  /** Lưu xong; `createClass` = người dùng muốn tạo lớp đầu tiên ngay (chỉ khi tạo khóa mới) */
  onSaved: (course: CourseResponse, options: { createClass: boolean }) => void;
}

/** Props của ClassFormDialog */
export interface ClassFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (classItem: AdminClassResponse) => void;
  /** Khóa chọn sẵn khi mở hộp thoại (tạo lớp từ trang Khóa học) */
  initialCourseId?: number;
}

/** Props của CourseClassesPanel */
export interface CourseClassesPanelProps {
  course: CourseResponse;
  /** Bấm "Tạo lớp" cho khóa này */
  onCreate: () => void;
  /** Bấm đổi trạng thái / mở lại một lớp */
  onChangeStatus: (item: AdminClassResponse, mode: "status" | "reopen") => void;
}

/** Props của CourseDetailSheet (ngăn chi tiết khóa trượt từ bên phải) */
export interface CourseDetailSheetProps {
  /** Khóa đang xem; null là đóng ngăn */
  course: CourseResponse | null;
  onClose: () => void;
  /** Đang gửi yêu cầu bật / tắt bán khóa này */
  toggling: boolean;
  onEdit: (course: CourseResponse) => void;
  onToggle: (course: CourseResponse) => void;
  /** Bấm "Tạo lớp" cho khóa này */
  onCreateClass: (course: CourseResponse) => void;
  /** Bấm đổi trạng thái / mở lại một lớp */
  onChangeStatus: (item: AdminClassResponse, mode: "status" | "reopen") => void;
}

/** Props của ClassStatusDialog */
export interface ClassStatusDialogProps {
  /** Lớp đang thao tác; null là đóng hộp thoại */
  classItem: AdminClassResponse | null;
  /** "status": đổi trạng thái - "reopen": mở lại lớp không đủ sĩ số */
  mode: "status" | "reopen";
  onClose: () => void;
  onSaved: (classItem: AdminClassResponse) => void;
}

/** Props của ClassEnrollmentsPanel */
export interface ClassEnrollmentsPanelProps {
  classId: number;
  /** Tra họ tên học viên theo mã */
  nameOf: (userId: number) => string | undefined;
}

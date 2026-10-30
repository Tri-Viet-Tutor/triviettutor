import type { DeliveryMode, GradeLevel } from "@/interfaces/api";
import type { Course } from "@/interfaces/course";

/* Kiểu dữ liệu của luồng mua khóa học và thanh toán VNPay. */

/** Dữ liệu để tạo đơn */
export interface CheckoutRequest {
  /** Các khóa trong giỏ */
  courses: PurchasableCourse[];
  /** Thông tin học viên điền ở bước 1 */
  customer: CustomerInfo;
}

/** Thanh toán đang chờ, kèm mã đơn phía máy chủ (không có ở chế độ demo) */
export interface PendingPayment extends VnpayPayment {
  /** Mã đơn trên máy chủ */
  orderId?: number;
}

/** (Đề xuất) Kết quả của GET /payments/vnpay/return */
export interface VnpayResult {
  orderCode: string;
  /** Số tiền của đơn (VND) */
  amount: number;
  /** PAID: đã thanh toán - PENDING_PAYMENT: VNPay chưa xác nhận xong - FAILED: không thành công hoặc bị hủy */
  status: "PAID" | "PENDING_PAYMENT" | "FAILED";
  /** Họ tên và email đã điền lúc đặt mua */
  fullName: string;
  email: string;
  /** Email này đã có tài khoản kích hoạt hay chưa */
  accountExists: boolean;
}

/** Khóa mua được: khóa đã có học phí */
export interface PurchasableCourse extends Course {
  tuitionFee: number;
}

/**
 * Thông tin học viên điền ở bước 1 của thanh toán.
 * Chỉ nằm trong bộ nhớ của trang thanh toán — không lưu lại, rời trang là phải điền lại.
 * Khách chưa có tài khoản dùng họ tên và email này để tạo tài khoản sau khi thanh toán xong.
 */
export interface CustomerInfo {
  fullName: string;
  email: string;
  /** Khối lớp */
  gradeLevel: GradeLevel;
  /** Hình thức học: tại trung tâm / trực tuyến */
  deliveryMode: DeliveryMode;
}

/** Họ tên và email của người mua — đủ để tạo tài khoản sau khi thanh toán xong */
export type PaidCustomer = Pick<CustomerInfo, "fullName" | "email">;

/** Đơn đã thanh toán xong, để hiện ở màn hình kết quả */
export interface PaidOrder {
  orderCode: string;
  /** Số tiền (VND) */
  amount: number;
  /** true nếu là thanh toán demo, không có giao dịch thật */
  demo: boolean;
}

/** Một mã thanh toán VNPay đang chờ quét */
export interface VnpayPayment {
  /** Mã đơn hàng, cũng là nội dung thanh toán */
  orderCode: string;
  /** Số tiền (VND) */
  amount: number;
  /** Nội dung mã hoá trong mã QR của bản demo (chuỗi chữ, không thanh toán được) */
  qrContent: string;
  /** Đường dẫn sang trang thanh toán VNPay, do backend tạo và ký (không có ở bản demo) */
  paymentUrl?: string;
  /** Số giây mã còn hiệu lực kể từ lúc tạo */
  ttlSeconds: number;
  /** true nếu là mã demo, không có giao dịch thật */
  demo: boolean;
}

/** Thông tin thẻ người dùng nhập ở form demo */
export interface CardDetails {
  bank: string;
  /** Số thẻ (có thể kèm khoảng trắng) */
  number: string;
  /** Tên chủ thẻ */
  holder: string;
  /** Ngày phát hành MM/YY */
  issueDate: string;
}

// ── components/checkout ──
/** Giá trị form trong CheckoutCreateAccountForm — kiểm tra bằng `accountSchema` */
export interface CheckoutAccountFormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** Props của CheckoutCreateAccountForm */
export interface CheckoutCreateAccountFormProps {
  /** Họ tên và email đã điền ở bước thông tin học viên */
  fullName: string;
  email: string;
  /** Tài khoản vừa được tạo, backend đã gửi mã OTP tới email này */
  onRegistered: (email: string) => void;
}

/** Giá trị form trong CheckoutCustomerForm — kiểm tra bằng `customerSchema` */
export interface CheckoutCustomerFormValues {
  fullName: string;
  email: string;
}

/** Props của CheckoutCustomerForm */
export interface CheckoutCustomerFormProps {
  /** Học viên đang đăng nhập: họ tên và email lấy từ tài khoản, không phải điền */
  account?: { fullName: string; email: string };
  /** Thông tin đã điền (khi quay lại sửa) */
  initial?: CustomerInfo | null;
  /** Điền xong bước 1 */
  onSubmit: (customer: CustomerInfo) => void;
}

/** Props của CheckoutFlow */
export interface CheckoutFlowProps {
  /** Trang chọn khóa học để quay lại (trang công khai hoặc trang trong khu học viên) */
  shopTo?: string;
  /** Lớp `top-*` cho cột đơn hàng dính khi cuộn, tùy chiều cao thanh trên của khung trang */
  stickyTopClassName?: string;
}

/** Props của SeatHold (đồng hồ giữ chỗ trong CheckoutFlow) */
export interface SeatHoldProps {
  /** Thời điểm hết giữ chỗ (ISO 8601) */
  expiresAt: string;
}

/** Props của StudentPayment (phần thanh toán của học viên trong CheckoutFlow) */
export interface StudentPaymentProps {
  userId: number;
  /** Trang chọn khóa học để quay lại */
  shopTo: string;
}

/** Props của CheckoutPaymentForm */
export interface CheckoutPaymentFormProps {
  /** Các khóa trong giỏ */
  courses: PurchasableCourse[];
  /** Thông tin học viên đã điền ở bước 1 */
  customer: CustomerInfo;
  /** Quay lại bước 1 để sửa thông tin */
  onEditCustomer: () => void;
  /** Bản demo: người mua vừa thanh toán xong. Thanh toán thật quay về qua đường dẫn của VNPay nên không gọi hàm này */
  onPaid: (payment: PendingPayment) => void;
}

/** Props của CheckoutSteps */
export interface CheckoutStepsProps {
  /** Tên các bước */
  steps: string[];
  /** Vị trí bước đang làm (tính từ 0); bằng số bước nghĩa là đã xong hết */
  active: number;
}

/** Props của DemoCardForm */
export interface DemoCardFormProps {
  /** Đang ghi nhận thanh toán — khóa nút */
  isConfirming: boolean;
  /** Thẻ và mã OTP đều đúng */
  onPaid: () => void;
}

/** Props của OrderSummary */
export interface OrderSummaryProps {
  /** Các khóa trong đơn */
  courses: PurchasableCourse[];
  /** Bỏ một khóa khỏi giỏ; không truyền thì đơn chỉ để xem */
  onRemove?: (subject: string) => void;
}

/** Hai cách thanh toán của bản demo */
export type VnpayPayTab = "card" | "qr";

/** Props của VnpayCodePanel */
export interface VnpayCodePanelProps {
  /** Mã thanh toán đang hiện */
  payment: PendingPayment;
  /** Đang ghi nhận thanh toán */
  isConfirming: boolean;
  /** Người dùng thanh toán xong (thẻ + OTP hợp lệ, hoặc bấm "Tôi đã thanh toán" sau khi quét mã) */
  onConfirm: () => void;
  /** Bấm "Tạo mã mới" */
  onRenew: () => void;
}

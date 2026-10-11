import { COURSES, type Course } from "@/features/catalog/data/courses";
import type { DeliveryMode, GradeLevel } from "@/types/api";

/** Khóa mua được: khóa đã có học phí */
export interface PurchasableCourse extends Course {
  tuitionFee: number;
}

export function isPurchasable(course: Course): course is PurchasableCourse {
  return course.tuitionFee !== undefined;
}

/** Các khóa đang nằm trong giỏ, theo thứ tự của danh sách khóa học (bỏ mã lạ và khóa chưa có học phí) */
export function cartCourses(subjects: string[]): PurchasableCourse[] {
  return COURSES.filter(isPurchasable).filter((course) => subjects.includes(course.subject));
}

export function cartTotal(courses: PurchasableCourse[]): number {
  return courses.reduce((sum, course) => sum + course.tuitionFee, 0);
}

/**
 * Thông tin học viên điền ở bước 1 của thanh toán.
 * Chỉ nằm trong bộ nhớ của trang thanh toán — không lưu lại, rời trang là phải điền lại.
 * Khách chưa có tài khoản dùng họ tên và email này để tạo tài khoản sau khi thanh toán xong.
 */
export interface CustomerInfo {
  fullName: string;
  email: string;
  gradeLevel: GradeLevel;
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

/**
 * true: thanh toán chạy ở chế độ DEMO — mã VNPay được tạo ngay trên trình duyệt, không có giao dịch thật.
 * Mặc định là demo. Khi backend đã có API thanh toán VNPay (xem api/orderApi.ts), đặt
 * VITE_PAYMENT_DEMO=false trong .env.local để chuyển sang thanh toán thật.
 */
export const PAYMENT_DEMO = import.meta.env.VITE_PAYMENT_DEMO !== "false";

/** Mã thanh toán có hiệu lực 15 phút */
export const PAYMENT_CODE_TTL_SECONDS = 15 * 60;

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

/**
 * Tạo một mã thanh toán DEMO ngay trên trình duyệt.
 * Mã QR chỉ chứa mã đơn và số tiền dưới dạng chữ — quét bằng ứng dụng ngân hàng sẽ không thanh toán được.
 * Mã VNPay thật phải do backend tạo vì cần chữ ký bằng khóa bí mật của trung tâm.
 */
export function createDemoVnpayPayment(amount: number): VnpayPayment {
  const orderCode = `TVT${Date.now().toString(36).toUpperCase().slice(-7)}`;
  return {
    orderCode,
    amount,
    qrContent: `Tri Viet Tutor DEMO | Don ${orderCode} | ${amount} VND`,
    ttlSeconds: PAYMENT_CODE_TTL_SECONDS,
    demo: true,
  };
}

/**
 * Thẻ thử nghiệm của bản demo — bộ thông tin thẻ nội địa công khai mà môi trường thử nghiệm (sandbox)
 * của VNPay dùng, không phải thẻ thật. Form thẻ của bản demo CHỈ nhận đúng thẻ này.
 */
export const DEMO_TEST_CARD = {
  bank: "NCB",
  number: "9704198526191432198",
  holder: "NGUYEN VAN A",
  /** Ngày phát hành, dạng MM/YY */
  issueDate: "07/15",
  otp: "123456",
} as const;

export interface CardDetails {
  bank: string;
  number: string;
  holder: string;
  issueDate: string;
}

/** Chỉ giữ chữ số của số thẻ */
export function cardDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Thông tin vừa nhập có khớp thẻ thử nghiệm không (bỏ qua khoảng trắng và chữ hoa / thường) */
export function matchesDemoCard(card: CardDetails): boolean {
  return (
    card.bank === DEMO_TEST_CARD.bank &&
    cardDigits(card.number) === DEMO_TEST_CARD.number &&
    card.holder.trim().replace(/\s+/g, " ").toUpperCase() === DEMO_TEST_CARD.holder &&
    card.issueDate.trim() === DEMO_TEST_CARD.issueDate
  );
}

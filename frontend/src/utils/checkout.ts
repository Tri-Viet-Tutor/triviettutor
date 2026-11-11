import { DEMO_TEST_CARD, PAYMENT_CODE_TTL_SECONDS } from "@/constants/checkout";
import { COURSES } from "@/constants/courses";
import type { CardDetails, PurchasableCourse, VnpayPayment } from "@/interfaces/checkout";
import type { Course } from "@/interfaces/course";

// Hàm xử lý giỏ hàng và thanh toán demo.


// Khóa đã có học phí, mua được
function isPurchasable(course: Course): course is PurchasableCourse {
  return course.tuitionFee !== undefined;
}

// Các khóa đang nằm trong giỏ, theo thứ tự của danh sách khóa học (bỏ mã lạ và khóa chưa có học phí)
export function cartCourses(subjects: string[]): PurchasableCourse[] {
  return COURSES.filter(isPurchasable).filter((course) => subjects.includes(course.subject));
}

// Tổng học phí các khóa (VND)
export function cartTotal(courses: PurchasableCourse[]): number {
  return courses.reduce((sum, course) => sum + course.tuitionFee, 0);
}

// Tạo một mã thanh toán DEMO ngay trên trình duyệt.
// Mã QR chỉ chứa mã đơn và số tiền dưới dạng chữ — quét bằng ứng dụng ngân hàng sẽ không thanh toán được.
// Mã VNPay thật phải do backend tạo vì cần chữ ký bằng khóa bí mật của trung tâm.
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

// Chỉ giữ chữ số của số thẻ
export function cardDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// Thông tin vừa nhập có khớp thẻ thử nghiệm không (bỏ qua khoảng trắng và chữ hoa / thường)
export function matchesDemoCard(card: CardDetails): boolean {
  return (
    card.bank === DEMO_TEST_CARD.bank &&
    cardDigits(card.number) === DEMO_TEST_CARD.number &&
    card.holder.trim().replace(/\s+/g, " ").toUpperCase() === DEMO_TEST_CARD.holder &&
    card.issueDate.trim() === DEMO_TEST_CARD.issueDate
  );
}

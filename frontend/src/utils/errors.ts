import type { ErrorCode } from "@/interfaces/api";
import { apiErrorMessage, getApiError } from "@/services/api";

/* Đổi lỗi từ API thành câu báo tiếng Việt cho người dùng. */

/** Câu báo lỗi tiếng Việt cho các mã lỗi xác thực của backend */
const AUTH_ERROR_TEXT: Partial<Record<ErrorCode, string>> = {
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  ACCOUNT_NOT_VERIFIED: "Tài khoản chưa được kích hoạt. Hãy nhập mã xác thực đã gửi tới email của bạn.",
  ACCOUNT_ALREADY_VERIFIED: "Tài khoản này đã được kích hoạt. Bạn có thể đăng nhập.",
  EMAIL_ALREADY_EXISTS: "Email này đã có tài khoản.",
  INVALID_OTP: "Mã xác thực không đúng.",
  OTP_EXPIRED: "Mã xác thực đã hết hạn. Hãy bấm gửi lại mã.",
  INVALID_RESET_TOKEN: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã qua sử dụng. Vui lòng gửi lại yêu cầu.",
  RESET_TOKEN_EXPIRED: "Liên kết đặt lại mật khẩu đã hết hạn (sau 15 phút). Vui lòng gửi lại yêu cầu.",
  EMAIL_SEND_FAILED: "Chưa gửi được email. Vui lòng thử lại sau ít phút.",
  OTP_ATTEMPTS_EXCEEDED: "Bạn đã nhập sai mã quá 5 lần. Hãy bấm gửi lại mã để nhận mã mới.",
  OTP_RESEND_TOO_SOON: "Mã vừa được gửi. Vui lòng chờ khoảng 1 phút rồi gửi lại.",
  ACCOUNT_LOCKED: "Tài khoản đã bị khóa. Vui lòng liên hệ trung tâm để được hỗ trợ.",
  USER_NOT_FOUND: "Không tìm thấy tài khoản với email này.",
  VALIDATION_ERROR: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
  // (Đề xuất) backend chỉ cho tạo tài khoản khi email đã có đơn thanh toán xong
  PAYMENT_REQUIRED: "Email này chưa có đơn đã thanh toán. Hãy mua khóa học trước.",
};

/** Đổi lỗi của một lời gọi API thành câu báo cho người dùng; mất kết nối thì báo riêng. */
export function authErrorMessage(error: unknown, fallback = "Có lỗi xảy ra. Vui lòng thử lại."): string {
  return apiErrorMessage(error, AUTH_ERROR_TEXT, fallback);
}

/** Câu báo cho `?error=` mà backend gắn khi đăng nhập Google không thành công */
const GOOGLE_LOGIN_ERROR_TEXT: Record<string, string> = {
  GOOGLE_EMAIL_NOT_VERIFIED: "Email Google của bạn chưa được Google xác minh.",
  ACCOUNT_NOT_VERIFIED: "Email này đã đăng ký nhưng chưa kích hoạt. Hãy đăng nhập bằng mật khẩu và nhập mã xác thực trước.",
  ACCOUNT_LOCKED: "Tài khoản đã bị khóa. Vui lòng liên hệ trung tâm để được hỗ trợ.",
  GOOGLE_ACCOUNT_CONFLICT: "Tài khoản Google này không khớp với tài khoản đã liên kết trước đó.",
  GOOGLE_LOGIN_FAILED: "Đăng nhập bằng Google chưa thành công. Vui lòng thử lại.",
};

/** Đổi mã `?error=` của trang đăng nhập thành câu báo; mã lạ dùng câu chung */
export function googleLoginErrorMessage(code: string): string {
  return GOOGLE_LOGIN_ERROR_TEXT[code] ?? GOOGLE_LOGIN_ERROR_TEXT.GOOGLE_LOGIN_FAILED;
}

/** Mã lỗi của lời gọi API (nếu backend có trả về) */
export function authErrorCode(error: unknown): ErrorCode | undefined {
  return getApiError(error).errorCode;
}

/** Câu báo lỗi tiếng Việt cho các mã lỗi backend có thể trả về ở ba khu sau đăng nhập */
const PORTAL_ERROR_TEXT: Partial<Record<ErrorCode, string>> = {
  // Chung
  ACCESS_DENIED: "Bạn không có quyền với buổi học này.",
  VALIDATION_ERROR: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
  SESSION_NOT_FOUND: "Không tìm thấy buổi học này.",
  SESSION_STATE_CHANGED: "Buổi học vừa được người khác thay đổi. Hãy tải lại rồi thử lại.",
  INVALID_PROFILE_FIELD: "Có thông tin không được phép sửa.",
  // Xin nghỉ
  LEAVE_REQUEST_ALREADY_PENDING: "Bạn đã có đơn xin nghỉ đang chờ duyệt cho buổi này.",
  SESSION_NOT_EDITABLE: "Buổi học đã bắt đầu hoặc đã bị hủy nên không thay đổi được nữa.",
  LEAVE_REQUEST_NOT_FOUND: "Không tìm thấy đơn xin nghỉ này.",
  LEAVE_REQUEST_ALREADY_RESOLVED: "Đơn này đã được xử lý rồi.",
  LEAVE_REQUEST_SESSION_MISMATCH: "Đơn xin nghỉ không thuộc buổi học này.",
  LEAVE_RESOLUTION_NOT_ALLOWED: "Cách xử lý này không áp dụng được cho đơn này.",
  SESSION_ALREADY_CANCELLED: "Buổi học này đã bị hủy từ trước.",
  MAKEUP_ALREADY_EXISTS: "Buổi này đã có buổi học bù.",
  INVALID_MAKEUP_TIME: "Buổi học bù phải ở tương lai và giờ kết thúc sau giờ bắt đầu.",
  STUDENT_SCHEDULE_CONFLICT: "Giờ này trùng lịch học khác của học viên trong lớp.",
  // Điểm danh
  ATTENDANCE_LOCKED: "Điểm danh đã khóa nên không sửa được nữa.",
  SESSION_NOT_IN_PROGRESS: "Chỉ điểm danh được khi buổi học đã bắt đầu và chưa hoàn tất.",
  INVALID_ATTENDANCE: "Thông tin điểm danh chưa hợp lệ.",
  ATTENDANCE_STUDENT_NOT_ENROLLED: "Có học viên không thuộc danh sách của buổi này.",
  ATTENDANCE_EXCUSED_NOT_ALLOWED: 'Chỉ ghi "Nghỉ có phép" khi học viên đã xin nghỉ trước ít nhất 24 giờ và đơn được duyệt.',
  ATTENDANCE_REASON_REQUIRED: "Cần nhập lý do cho thao tác này.",
  ATTENDANCE_NOT_LOCKED: "Điểm danh chưa khóa: hãy sửa bằng form điểm danh.",
  ATTENDANCE_SESSION_NOT_ENDED: "Buổi học chưa kết thúc nên chưa chốt điểm danh được.",
  ATTENDANCE_NOT_FOUND: "Không tìm thấy bản ghi điểm danh.",
  PAYROLL_FINALIZED: "Buổi này đã nằm trong bảng lương đã chốt nên không sửa được.",
  // Lịch rảnh, phân công
  INVALID_AVAILABILITY: "Khung giờ rảnh chưa hợp lệ (giờ bắt đầu phải trước giờ kết thúc và các khung không chồng nhau).",
  SCHEDULE_CONFLICT: "Gia sư này bị trùng lịch dạy ở lớp khác.",
  INVALID_TUTOR: "Người được chọn không phải gia sư.",
  USER_NOT_TUTOR: "Người dùng này không phải gia sư.",
  USER_NOT_FOUND: "Không tìm thấy người dùng.",
  CLASS_NOT_FOUND: "Không tìm thấy lớp này.",
  CLASS_NOT_ASSIGNABLE: "Lớp này chưa sẵn sàng để phân công gia sư.",
  CLASS_ALREADY_ASSIGNED: "Lớp này đã có gia sư chính.",
  ASSIGNMENT_NOT_FOUND: "Lớp này chưa có gia sư nào được phân công.",
  TUTOR_ALREADY_ASSIGNED: "Gia sư này đang dạy lớp / buổi này rồi.",
  NO_ASSIGNABLE_SESSIONS: "Lớp không còn buổi nào ở tương lai để phân công.",
  // Quản trị
  EMAIL_ALREADY_EXISTS: "Email này đã có tài khoản.",
  INVALID_MEETING_URL: "Link lớp học phải là đường dẫn https hợp lệ.",
  INVALID_DATE_RANGE: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
  INVALID_PAGINATION: "Số trang không hợp lệ.",
  INVALID_ROLE_FILTER: "Vai trò lọc không hợp lệ.",
  CANNOT_LOCK_SELF: "Bạn không thể tự khóa tài khoản của mình.",
  // Khóa học, lớp, ghi danh, bảng lương
  COURSE_NOT_FOUND: "Không tìm thấy khóa học này.",
  INVALID_STATUS_TRANSITION: "Không chuyển được lớp sang trạng thái này từ trạng thái hiện tại.",
  SESSION_CONFIG_MISMATCH: "Thời lượng khóa học không khớp với ca học đã chọn.",
  CLASS_FULL: "Lớp đã đủ sĩ số.",
  CLASS_NOT_ENROLLING: "Lớp không còn mở đăng ký.",
  ENROLLMENT_NOT_FOUND: "Không tìm thấy ghi danh này.",
  REFUND_NOT_ALLOWED: "Ghi danh này không hủy / hoàn tiền được theo quy định.",
  REFUND_ALREADY_SETTLED: "Ghi danh này đã được xử lý hoàn tiền.",
  // Bài tập, bài nộp, chấm điểm
  HOMEWORK_NOT_FOUND: "Không tìm thấy bài tập này.",
  HOMEWORK_LOCKED: "Bài tập đã đóng nên không sửa hay mở lại được.",
  HOMEWORK_PUBLISHED_EDIT_RESTRICTED: "Bài đã công bố chỉ được lùi hạn nộp hoặc tăng điểm tối đa.",
  HOMEWORK_DEADLINE_PASSED: "Đã quá hạn nộp của bài tập này.",
  HOMEWORK_INVALID_DEADLINE: "Hạn nộp phải ở tương lai.",
  HOMEWORK_NOT_ACCEPTING: "Bài tập này hiện không nhận bài nộp.",
  HOMEWORK_SESSION_CANCELLED: "Buổi học đã bị hủy.",
  LEARNING_VERSION_CONFLICT: "Dữ liệu vừa được thay đổi ở nơi khác. Hãy tải lại rồi thử lại.",
  INVALID_RESOURCE_URL: "Đường dẫn tài liệu phải là link https hợp lệ.",
  SUBMISSION_NOT_FOUND: "Không tìm thấy bài nộp này.",
  SUBMISSION_NOT_STARTED: "Hãy bấm bắt đầu làm bài trước khi lưu hoặc nộp.",
  SUBMISSION_LOCKED: "Bài làm ở trạng thái hiện tại không thực hiện được thao tác này.",
  EMPTY_SUBMISSION: "Hãy nhập bài làm hoặc dán link bài làm trước khi nộp.",
  SUBMISSION_NOT_SUBMITTED: "Chỉ chấm được bài đã nộp.",
  INVALID_HOMEWORK_SCORE: "Điểm không được vượt quá điểm tối đa của bài.",
  GRADING_REASON_REQUIRED: "Cần nhập lý do khi sửa điểm đã chấm.",
};

/** Đổi lỗi của một lời gọi API thành câu báo cho người dùng; mất kết nối thì báo riêng. */
export function portalErrorMessage(error: unknown, fallback: string): string {
  return apiErrorMessage(error, PORTAL_ERROR_TEXT, fallback);
}

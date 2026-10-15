import type {
  AdminUserResponse,
  ApiResponse,
  AttendanceRecordResponse,
  AvailabilityResponse,
  LeaveRequestResponse,
  MeResponse,
  SessionResponse,
  UserInfo,
} from "@/interfaces/api";

// ── preview/previewData.ts ──
/** Người dùng mẫu: thông tin quản trị thấy + hồ sơ chi tiết */
export interface PreviewUser extends AdminUserResponse {
  profile: MeResponse["profile"];
}

/** Lớp mẫu và danh sách học viên của lớp */
export interface PreviewClass {
  classId: number;
  studentIds: number[];
}

/** Điểm danh của một buổi */
export interface PreviewAttendance {
  locked: boolean;
  teachingConfirmed: boolean;
  records: AttendanceRecordResponse[];
}

/** Toàn bộ "cơ sở dữ liệu" trong bộ nhớ của chế độ xem thử */
export interface PreviewState {
  users: PreviewUser[];
  classes: PreviewClass[];
  sessions: SessionResponse[];
  leaves: LeaveRequestResponse[];
  /** Điểm danh theo mã buổi học */
  attendance: Map<number, PreviewAttendance>;
  /** Lịch rảnh theo mã gia sư */
  availability: Map<number, AvailabilityResponse[]>;
  /** Mã kế tiếp cho bản ghi mới (buổi học, đơn, người dùng…) */
  nextId: number;
}

// ── preview/previewRoutes.ts ──
/** Lời gọi API đã được tách ra từ cấu hình axios */
export interface PreviewRequest {
  method: string;
  /** Đường dẫn sau /api/v1, ví dụ "/me/sessions" */
  path: string;
  /** Tham số query */
  params: Record<string, unknown>;
  /** Thân request (đã parse JSON) */
  body: unknown;
  /** Tài khoản mẫu đang đăng nhập */
  user: UserInfo;
}

/** Kết quả trả về: mã HTTP + khung ApiResponse giống backend thật */
export interface PreviewReply {
  status: number;
  body: ApiResponse<unknown>;
}

/** Dữ liệu mỗi handler nhận được */
export interface PreviewContext extends PreviewRequest {
  state: PreviewState;
  now: Date;
  /** Các nhóm bắt được trong đường dẫn, đã đổi sang số */
  ids: number[];
}

export type PreviewHandler = (context: PreviewContext) => unknown;

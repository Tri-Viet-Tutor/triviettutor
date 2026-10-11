import { api } from "@/lib/api";
import type {
  ApiResponse,
  AttendanceResponse,
  AttendanceSubmission,
  LeaveRequestInput,
  LeaveRequestResponse,
  MeResponse,
  MyLeaveRequestsQuery,
  MySessionsQuery,
  PageResponse,
  SessionResponse,
  UpdateMeRequest,
} from "@/types/api";

/*
 * Các API "của tôi" dùng chung cho các khu sau đăng nhập — đều là endpoint backend ĐÃ có
 * (MeController, SessionController, AttendanceController, LeaveRequestController).
 * /me dùng cho mọi vai trò; buổi học và đơn xin nghỉ dùng cho học viên và gia sư.
 */

/** GET /me — hồ sơ của tôi */
export async function fetchMe(): Promise<MeResponse> {
  const { data } = await api.get<ApiResponse<MeResponse>>("/me");
  return data.data as MeResponse;
}

/** PUT /me — sửa họ tên và các trường hồ sơ của vai trò mình (học viên: điện thoại, địa chỉ; gia sư: giới thiệu) */
export async function updateMe(request: UpdateMeRequest): Promise<MeResponse> {
  const { data } = await api.put<ApiResponse<MeResponse>>("/me", request);
  return data.data as MeResponse;
}

/** GET /me/sessions — mọi buổi của các lớp tôi đang học (học viên) hoặc đang dạy (gia sư) */
export async function fetchMySessions(query: MySessionsQuery = {}): Promise<SessionResponse[]> {
  const { data } = await api.get<ApiResponse<SessionResponse[]>>("/me/sessions", { params: query });
  return data.data ?? [];
}

/** GET /sessions/{sessionId}/attendance — học viên: bản ghi của mình; gia sư dạy buổi đó và quản trị: cả danh sách lớp */
export async function fetchSessionAttendance(sessionId: number): Promise<AttendanceResponse> {
  const { data } = await api.get<ApiResponse<AttendanceResponse>>(`/sessions/${sessionId}/attendance`);
  return data.data as AttendanceResponse;
}

/** GET /me/leave-requests — các đơn xin nghỉ của tôi (phân trang, page từ 0) */
export async function fetchMyLeaveRequests(query: MyLeaveRequestsQuery = {}): Promise<PageResponse<LeaveRequestResponse>> {
  const { data } = await api.get<ApiResponse<PageResponse<LeaveRequestResponse>>>("/me/leave-requests", { params: query });
  return data.data as PageResponse<LeaveRequestResponse>;
}

/** POST /sessions/{sessionId}/leave — gửi đơn xin nghỉ một buổi chưa bắt đầu */
export async function submitLeaveRequest(sessionId: number, input: LeaveRequestInput): Promise<LeaveRequestResponse> {
  const { data } = await api.post<ApiResponse<LeaveRequestResponse>>(`/sessions/${sessionId}/leave`, input);
  return data.data as LeaveRequestResponse;
}

/** PUT /sessions/{sessionId}/attendance — gia sư dạy buổi đó hoặc quản trị ghi điểm danh (gửi một phần cũng được) */
export async function submitAttendance(sessionId: number, input: AttendanceSubmission): Promise<AttendanceResponse> {
  const { data } = await api.put<ApiResponse<AttendanceResponse>>(`/sessions/${sessionId}/attendance`, input);
  return data.data as AttendanceResponse;
}

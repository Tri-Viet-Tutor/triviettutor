import { api, unwrap } from "./api";
import { ApiResponse, MeetingSessionLogsResponse, MeetingTokenResponse } from "../interfaces/api";

/** POST /api/v1/meetings/sessions/{sessionId}/token — lấy token truy cập phòng học trực tuyến LiveKit */
export async function getSessionMeetingToken(sessionId: number): Promise<MeetingTokenResponse> {
  return unwrap(await api.post<ApiResponse<MeetingTokenResponse>>(`/meetings/sessions/${sessionId}/token`));
}

/** POST /api/v1/meetings/classes/{classGroupId}/token — lấy token theo mã lớp */
export async function getClassMeetingToken(classGroupId: number): Promise<MeetingTokenResponse> {
  return unwrap(await api.post<ApiResponse<MeetingTokenResponse>>(`/meetings/classes/${classGroupId}/token`));
}

/** GET /api/v1/meetings/sessions/{sessionId}/logs — lấy nhật ký phòng học trực tuyến và danh sách điểm danh */
export async function getSessionMeetingLogs(sessionId: number): Promise<MeetingSessionLogsResponse> {
  return unwrap(await api.get<ApiResponse<MeetingSessionLogsResponse>>(`/meetings/sessions/${sessionId}/logs`));
}

import { api, unwrap } from "./api";
import { ApiResponse, MeetingTokenResponse } from "../interfaces/api";

/** POST /api/v1/meetings/sessions/{sessionId}/token — lấy token truy cập phòng học trực tuyến LiveKit */
export async function getSessionMeetingToken(sessionId: number): Promise<MeetingTokenResponse> {
  return unwrap(await api.post<ApiResponse<MeetingTokenResponse>>(`/meetings/sessions/${sessionId}/token`));
}

/** POST /api/v1/meetings/classes/{classGroupId}/token — lấy token theo mã lớp */
export async function getClassMeetingToken(classGroupId: number): Promise<MeetingTokenResponse> {
  return unwrap(await api.post<ApiResponse<MeetingTokenResponse>>(`/meetings/classes/${classGroupId}/token`));
}

import { api, unwrap } from "./api";
import { ApiResponse, MeetingRecordingInfoResponse, MeetingSessionLogsResponse, MeetingTokenResponse } from "../interfaces/api";

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

/** POST /api/v1/meetings/sessions/{sessionId}/recording — tải lên bản ghi âm (voice record) của buổi học */
export async function uploadMeetingRecording(sessionId: number, audioBlob: Blob): Promise<{ recordingUrl: string }> {
  const formData = new FormData();
  formData.append("file", audioBlob, `session_${sessionId}_audio.webm`);
  return unwrap(
    await api.post<ApiResponse<{ recordingUrl: string }>>(
      `/meetings/sessions/${sessionId}/recording`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    )
  );
}

/** GET /api/v1/meetings/sessions/{sessionId}/recording-info — lấy thông tin và trạng thái bản ghi âm buổi học */
export async function getMeetingRecordingInfo(sessionId: number): Promise<MeetingRecordingInfoResponse> {
  return unwrap(await api.get<ApiResponse<MeetingRecordingInfoResponse>>(`/meetings/sessions/${sessionId}/recording-info`));
}

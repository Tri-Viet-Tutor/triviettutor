package com.viettritutor.dto.meeting;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingRecordingInfoResponse {
    private Long sessionId;
    private boolean hasRecording;
    private String recordingUrl;
    private String fileName;
}

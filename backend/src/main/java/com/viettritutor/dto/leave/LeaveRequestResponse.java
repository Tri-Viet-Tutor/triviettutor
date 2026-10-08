package com.viettritutor.dto.leave;

import com.viettritutor.entity.LeaveRequest;
import com.viettritutor.enums.*;

import java.time.OffsetDateTime;

public record LeaveRequestResponse(Long leaveRequestId, Long sessionId, Long requesterId, String requesterRole,
                                   String reason, OffsetDateTime requestedAt, boolean isLateNotice,
                                   LeaveRequestStatus status, LeaveResolution resolution, Long resolvedBy,
                                   OffsetDateTime resolvedAt, String resolutionReason, Long replacementSessionId,
                                   SessionStatus sessionNewStatus) {
    public static LeaveRequestResponse from(LeaveRequest request, SessionStatus sessionStatus) {
        return new LeaveRequestResponse(request.getId(), request.getSessionId(), request.getRequesterId(),
                request.getRequesterRole(), request.getReason(), request.getRequestedAt(), request.isLateNotice(),
                request.getStatus(), request.getResolution(), request.getResolvedBy(), request.getResolvedAt(),
                request.getResolutionReason(), request.getReplacementSessionId(), sessionStatus);
    }
}

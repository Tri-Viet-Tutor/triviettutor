package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.dto.leave.LeaveRequestResponse;
import com.viettritutor.entity.User;
import com.viettritutor.enums.LeaveRequestStatus;

public interface LeaveRequestService {
    LeaveRequestResponse submit(Long sessionId, String reason, User requester);
    PageResponse<LeaveRequestResponse> mine(User user, LeaveRequestStatus status, int page, int size);
    PageResponse<LeaveRequestResponse> admin(User user, LeaveRequestStatus status, Long requesterId, Long sessionId, int page, int size);
    LeaveRequestResponse reject(Long requestId, String reason, User admin);
    LeaveRequestResponse excuse(Long requestId, String reason, User admin);
}

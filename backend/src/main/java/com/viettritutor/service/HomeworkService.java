package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.learning.*;
import com.viettritutor.entity.*;
import java.time.OffsetDateTime;
import com.viettritutor.enums.SubmissionStatus;

public interface HomeworkService {

    HomeworkResponse create(Long sessionId, HomeworkRequest input, User actor);
    HomeworkResponse update(Long id, HomeworkUpdateRequest input, User actor);
    HomeworkResponse changeStatus(Long id, HomeworkStatusRequest input, User actor);
/** Students see the questions only after starting, so the password actually guards them. */
    HomeworkResponse get(Long id, User actor);
    PageResponse<HomeworkResponse> list(Long sessionId, int page, int size, User actor);
    PageResponse<StudentHomeworkResponse> listForStudent(SubmissionStatus status, OffsetDateTime from, OffsetDateTime to, int page, int size, User actor);
    PageResponse<TutorHomeworkResponse> listForTutor(int page, int size, User actor);
}

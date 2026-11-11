package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.learning.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.SubmissionStatus;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

public interface SubmissionService {

    SubmissionResponse start(Long homeworkId, StartSubmissionRequest input, User actor);
    SubmissionResponse save(Long homeworkId, SubmissionRequest input, User actor, boolean submit);
    SubmissionResponse mine(Long homeworkId, User actor);
    PageResponse<SubmissionResponse> list(Long homeworkId, SubmissionStatus status, int page, int size, User actor);
    SubmissionResponse grade(Long submissionId, GradeSubmissionRequest input, User actor);
    AttachmentResponse attach(Long homeworkId, MultipartFile file, User actor);
    void detach(Long homeworkId, Long attachmentId, User actor);
/** The owning student or the session's tutor/admin may read a file. */
    LearningFile download(Long attachmentId, User actor);
}
